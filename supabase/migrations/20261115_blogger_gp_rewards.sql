-- ============================================================================
-- GROBAAX CAMPUS: AUTOMATIC BLOGGER GP REWARD SYSTEM
-- Non-destructive additive schema migration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ADD AUTHORITATIVE REWARD & ELIGIBLE VIEW COUNTS TO ARTICLES
ALTER TABLE public.school_blog_articles
  ADD COLUMN IF NOT EXISTS eligible_views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gp_earned INTEGER NOT NULL DEFAULT 0;

-- 2. ELIGIBLE UNIQUE ARTICLE VIEWS (CANONICAL: 1 USER + 1 ARTICLE = MAX 1 VIEW)
CREATE TABLE IF NOT EXISTS public.school_blog_eligible_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_eligible_article_view_user UNIQUE (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_eligible_article_views_article
  ON public.school_blog_eligible_article_views (article_id);

CREATE INDEX IF NOT EXISTS idx_eligible_article_views_user
  ON public.school_blog_eligible_article_views (user_id);

-- 3. SCHOOL BLOGGER REWARD MILESTONES (IDEMPOTENT PAYOUT LEDGER)
-- Every 250 eligible unique views = +1,000 GP (milestone_number = 1, 2, 3...)
CREATE TABLE IF NOT EXISTS public.school_blog_reward_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  blogger_user_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  milestone_number INTEGER NOT NULL CHECK (milestone_number >= 1),
  eligible_view_threshold INTEGER NOT NULL CHECK (eligible_view_threshold >= 250),
  gp_amount INTEGER NOT NULL DEFAULT 1000 CHECK (gp_amount > 0),
  transaction_reference TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_article_reward_milestone UNIQUE (article_id, milestone_number)
);

CREATE INDEX IF NOT EXISTS idx_blog_reward_milestones_blogger
  ON public.school_blog_reward_milestones (blogger_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_reward_milestones_article
  ON public.school_blog_reward_milestones (article_id);

-- 4. MIGRATE ANY EXISTING AUTHENTICATED NON-AUTHOR VIEWS & SYNC COUNTS
INSERT INTO public.school_blog_eligible_article_views (article_id, user_id, created_at)
SELECT DISTINCT ON (v.article_id, substring(v.viewer_key from 6))
  v.article_id,
  substring(v.viewer_key from 6) AS user_id,
  v.created_at
FROM public.school_blog_article_views v
JOIN public.school_blog_articles a ON a.id = v.article_id
WHERE v.viewer_key LIKE 'user:%'
  AND length(substring(v.viewer_key from 6)) > 0
  AND substring(v.viewer_key from 6) <> a.author_user_id
ON CONFLICT (article_id, user_id) DO NOTHING;

UPDATE public.school_blog_articles a
SET
  eligible_views_count = COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.school_blog_eligible_article_views e
    WHERE e.article_id = a.id
  ), 0),
  views_count = COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM public.school_blog_eligible_article_views e
    WHERE e.article_id = a.id
  ), 0),
  gp_earned = COALESCE((
    SELECT SUM(m.gp_amount)::INTEGER
    FROM public.school_blog_reward_milestones m
    WHERE m.article_id = a.id
  ), 0);

-- 5. STRICT ROW LEVEL SECURITY POLICIES
ALTER TABLE public.school_blog_eligible_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_reward_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'school_blog_reward_milestones'
      AND policyname = 'blog_reward_milestones_active_blogger_read'
  ) THEN
    CREATE POLICY blog_reward_milestones_active_blogger_read
      ON public.school_blog_reward_milestones
      FOR SELECT
      USING (
        auth.uid()::text = blogger_user_id
        AND EXISTS (
          SELECT 1
          FROM public.school_blogger_assignments a
          WHERE a.user_id = auth.uid()::text
            AND a.status = 'active'
        )
      );
  END IF;
END $$;

-- 6. ATOMIC & IDEMPOTENT VIEW DEDUPLICATION + AUTOMATIC MILESTONE REWARD ENGINE
CREATE OR REPLACE FUNCTION public.record_eligible_article_view_and_reward(
  p_article_id UUID,
  p_viewer_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_article public.school_blog_articles%ROWTYPE;
  v_viewer TEXT;
  v_viewer_status TEXT := 'active';
  v_inserted_view_id UUID := NULL;
  v_counted BOOLEAN := false;
  v_reason TEXT := 'ignored';
  v_eligible_count INTEGER := 0;
  v_is_active_blogger BOOLEAN := false;
  v_target_milestones INTEGER := 0;
  v_m INTEGER;
  v_threshold INTEGER;
  v_tx_ref TEXT;
  v_milestone_id UUID;
  v_user_data JSONB;
  v_curr_gp NUMERIC := 0;
  v_curr_wallet NUMERIC := 0;
  v_curr_total NUMERIC := 0;
  v_new_gp NUMERIC := 0;
  v_new_wallet NUMERIC := 0;
  v_new_total NUMERIC := 0;
  v_now_iso TEXT;
  v_display_date TEXT;
  v_epoch_ms BIGINT;
  v_credited JSONB := '[]'::jsonb;
  v_total_credited_now INTEGER := 0;
  v_article_gp_earned INTEGER := 0;
  v_tx_data JSONB;
BEGIN
  -- 1. Lock article row cleanly to serialize concurrent milestone checks
  SELECT *
  INTO v_article
  FROM public.school_blog_articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'statusCode', 404,
      'error', 'Article not found.'
    );
  END IF;

  IF v_article.status <> 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'statusCode', 404,
      'error', 'Published article not found.'
    );
  END IF;

  -- 2. Evaluate viewer eligibility (must be authenticated, non-author, non-suspended)
  v_viewer := NULLIF(BTRIM(COALESCE(p_viewer_user_id, '')), '');

  IF v_viewer IS NULL THEN
    v_counted := false;
    v_reason := 'auth_required';
  ELSIF v_viewer = v_article.author_user_id THEN
    v_counted := false;
    v_reason := 'author_self_view';
  ELSE
    SELECT COALESCE(NULLIF(BTRIM(u.data->>'accountStatus'), ''), 'active')
    INTO v_viewer_status
    FROM public.users u
    WHERE u.id = v_viewer;

    IF v_viewer_status = 'suspended' THEN
      v_counted := false;
      v_reason := 'suspended_viewer';
    ELSE
      INSERT INTO public.school_blog_eligible_article_views (article_id, user_id)
      VALUES (p_article_id, v_viewer)
      ON CONFLICT (article_id, user_id) DO NOTHING
      RETURNING id INTO v_inserted_view_id;

      IF v_inserted_view_id IS NOT NULL THEN
        v_counted := true;
        v_reason := 'counted';
      ELSE
        v_counted := false;
        v_reason := 'duplicate_view';
      END IF;
    END IF;
  END IF;

  -- 3. Authoritative count of eligible unique views for this article
  SELECT COUNT(*)::INTEGER
  INTO v_eligible_count
  FROM public.school_blog_eligible_article_views
  WHERE article_id = p_article_id;

  -- Keep displayed views_count aligned strictly with eligible unique views
  UPDATE public.school_blog_articles
  SET
    eligible_views_count = v_eligible_count,
    views_count = v_eligible_count
  WHERE id = p_article_id;

  -- 4. Verify blogger still has active approved assignment for this institution
  SELECT EXISTS (
    SELECT 1
    FROM public.school_blogger_assignments a
    WHERE a.institution_id = v_article.blog_institution_id
      AND a.user_id = v_article.author_user_id
      AND a.status = 'active'
  )
  INTO v_is_active_blogger;

  v_target_milestones := v_eligible_count / 250;

  -- 5. Atomically award any uncredited 250-view milestones (1,000 GP each)
  IF v_is_active_blogger AND v_target_milestones >= 1 THEN
    SELECT data
    INTO v_user_data
    FROM public.users
    WHERE id = v_article.author_user_id
    FOR UPDATE;

    IF v_user_data IS NULL THEN
      v_user_data := jsonb_build_object(
        'id', v_article.author_user_id,
        'uid', v_article.author_user_id,
        'name', v_article.author_name,
        'gpBalance', 0,
        'walletBalance', 0,
        'totalGpEarned', 0
      );
    END IF;

    v_now_iso := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    v_display_date := to_char(now() AT TIME ZONE 'UTC', 'Mon DD, YYYY, HH12:MI AM');
    v_epoch_ms := (extract(epoch from now()) * 1000)::BIGINT;

    FOR v_m IN 1..v_target_milestones LOOP
      v_threshold := v_m * 250;
      v_tx_ref := 'blog_gp_' || replace(p_article_id::TEXT, '-', '') || '_m' || v_m::TEXT;
      v_milestone_id := NULL;

      INSERT INTO public.school_blog_reward_milestones (
        article_id,
        blogger_user_id,
        institution_id,
        milestone_number,
        eligible_view_threshold,
        gp_amount,
        transaction_reference
      ) VALUES (
        p_article_id,
        v_article.author_user_id,
        v_article.blog_institution_id,
        v_m,
        v_threshold,
        1000,
        v_tx_ref
      )
      ON CONFLICT (article_id, milestone_number) DO NOTHING
      RETURNING id INTO v_milestone_id;

      IF v_milestone_id IS NOT NULL THEN
        v_curr_gp := COALESCE(NULLIF(BTRIM(v_user_data->>'gpBalance'), '')::NUMERIC, 0);
        v_curr_wallet := COALESCE(NULLIF(BTRIM(v_user_data->>'walletBalance'), '')::NUMERIC, v_curr_gp);
        v_curr_total := COALESCE(NULLIF(BTRIM(v_user_data->>'totalGpEarned'), '')::NUMERIC, 0);

        v_new_gp := v_curr_gp + 1000;
        v_new_wallet := v_curr_wallet + 1000;
        v_new_total := v_curr_total + 1000;

        v_user_data := v_user_data || jsonb_build_object(
          'id', v_article.author_user_id,
          'gpBalance', v_new_gp,
          'walletBalance', v_new_wallet,
          'totalGpEarned', v_new_total,
          'gp', v_new_gp,
          'updatedAt', v_now_iso
        );

        INSERT INTO public.users (id, data, created_at, updated_at)
        VALUES (v_article.author_user_id, v_user_data, now(), now())
        ON CONFLICT (id) DO UPDATE
        SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at;

        v_tx_data := jsonb_build_object(
          'id', v_tx_ref,
          'transactionId', v_tx_ref,
          'userId', v_article.author_user_id,
          'userName', COALESCE(NULLIF(BTRIM(v_user_data->>'name'), ''), NULLIF(BTRIM(v_user_data->>'fullName'), ''), v_article.author_name),
          'userEmail', COALESCE(v_user_data->>'email', ''),
          'userAvatar', COALESCE(v_user_data->>'avatar', COALESCE(v_user_data->>'profileImage', '')),
          'institutionName', v_article.institution_name,
          'type', 'blogger_reward',
          'source', 'SCHOOL_BLOG_REWARD',
          'amount', 1000,
          'unit', 'GP',
          'currency', 'GP',
          'title', 'Campus Blogger View Reward',
          'description', format('+1,000 GP automatic reward for reaching %s eligible unique views on "%s" (%s)', v_threshold, v_article.title, v_article.institution_name),
          'isCredit', true,
          'status', 'completed',
          'articleId', p_article_id::TEXT,
          'articleTitle', v_article.title,
          'milestoneNumber', v_m,
          'eligibleViewThreshold', v_threshold,
          'date', v_display_date,
          'createdAt', v_now_iso,
          'updatedAt', v_now_iso,
          'timestamp', v_epoch_ms
        );

        INSERT INTO public."walletTransactions" (id, data, created_at, updated_at)
        VALUES (v_tx_ref, v_tx_data, now(), now())
        ON CONFLICT (id) DO NOTHING;

        v_total_credited_now := v_total_credited_now + 1000;
        v_credited := v_credited || jsonb_build_array(
          jsonb_build_object(
            'milestoneId', v_milestone_id,
            'milestoneNumber', v_m,
            'eligibleViewThreshold', v_threshold,
            'gpAmount', 1000,
            'transactionReference', v_tx_ref
          )
        );
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(SUM(gp_amount), 0)::INTEGER
  INTO v_article_gp_earned
  FROM public.school_blog_reward_milestones
  WHERE article_id = p_article_id;

  UPDATE public.school_blog_articles
  SET gp_earned = v_article_gp_earned
  WHERE id = p_article_id;

  RETURN jsonb_build_object(
    'success', true,
    'statusCode', 200,
    'counted', v_counted,
    'eligible', v_counted,
    'reason', v_reason,
    'viewsCount', v_eligible_count,
    'eligibleViewsCount', v_eligible_count,
    'articleGpEarned', v_article_gp_earned,
    'authorUserId', v_article.author_user_id,
    'authorName', v_article.author_name,
    'institutionId', v_article.blog_institution_id,
    'institutionName', v_article.institution_name,
    'articleTitle', v_article.title,
    'totalCreditedNow', v_total_credited_now,
    'creditedMilestones', v_credited
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_eligible_article_view_and_reward(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_eligible_article_view_and_reward(UUID, TEXT) TO service_role;

