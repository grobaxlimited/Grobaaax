-- ============================================================================
-- GROBAAX CAMPUS: FOLLOW SYSTEM, FREE BLOGGER APPLICATIONS, MANDATORY ADMIN
-- APPROVAL, 200-FOLLOWER ELIGIBILITY GATE & 8,000 GP (2,000 VIEW) PER-ARTICLE CAP
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. CAMPUS STUDENT FOLLOW SYSTEM (INDEPENDENT OF WHATSAPP CHAT REQUESTS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id TEXT NOT NULL,
  following_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_campus_follow_not_self CHECK (follower_user_id <> following_user_id),
  CONSTRAINT uq_campus_follow_pair UNIQUE (follower_user_id, following_user_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_follows_following
  ON public.campus_follows (following_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campus_follows_follower
  ON public.campus_follows (follower_user_id, created_at DESC);

ALTER TABLE public.campus_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_follows' AND policyname = 'campus_follows_public_read'
  ) THEN
    CREATE POLICY campus_follows_public_read
      ON public.campus_follows
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_follows' AND policyname = 'campus_follows_owner_insert'
  ) THEN
    CREATE POLICY campus_follows_owner_insert
      ON public.campus_follows
      FOR INSERT
      WITH CHECK (
        auth.uid()::text = follower_user_id
        AND follower_user_id <> following_user_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campus_follows' AND policyname = 'campus_follows_owner_delete'
  ) THEN
    CREATE POLICY campus_follows_owner_delete
      ON public.campus_follows
      FOR DELETE
      USING (auth.uid()::text = follower_user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. BLOGGER APPLICATION SCHEMA: ADD OPTIONAL ADDITIONAL INFO & OPTIONAL EXPERIENCE
-- ----------------------------------------------------------------------------
ALTER TABLE public.school_blogger_applications
  ADD COLUMN IF NOT EXISTS additional_info TEXT DEFAULT '';

DO $$
BEGIN
  ALTER TABLE public.school_blogger_applications
    ALTER COLUMN experience SET DEFAULT '';
  ALTER TABLE public.school_blogger_applications
    ALTER COLUMN experience DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. RESTORE MAX 1 ACTIVE PRIMARY BLOGGER PER INSTITUTION (ADMIN-APPROVED)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_active_school_blogger_per_user_institution;

-- Ensure at most one active assignment per institution before re-applying index
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY institution_id ORDER BY appointed_at DESC, created_at DESC) AS rn
  FROM public.school_blogger_assignments
  WHERE status = 'active'
)
UPDATE public.school_blogger_assignments a
SET
  status = 'replaced',
  ended_at = now(),
  end_reason = 'Realigned to single primary blogger per institution policy',
  updated_at = now()
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_school_blogger_per_institution
  ON public.school_blogger_assignments (institution_id)
  WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 4. REWARD QUALIFYING VIEWS TRACKING & 8,000 GP (8 MILESTONES) PER-ARTICLE CAP
-- ----------------------------------------------------------------------------
ALTER TABLE public.school_blog_eligible_article_views
  ADD COLUMN IF NOT EXISTS is_reward_qualifying BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.school_blog_articles
  ADD COLUMN IF NOT EXISTS qualifying_views_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_eligible_article_views_qualifying
  ON public.school_blog_eligible_article_views (article_id, is_reward_qualifying);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_milestone_max_8'
      AND conrelid = 'public.school_blog_reward_milestones'::regclass
  ) THEN
    ALTER TABLE public.school_blog_reward_milestones
      ADD CONSTRAINT chk_milestone_max_8 CHECK (milestone_number BETWEEN 1 AND 8);
  END IF;
END $$;

-- Preserve consistency for any pre-existing paid milestones
UPDATE public.school_blog_articles a
SET qualifying_views_count = GREATEST(
  a.qualifying_views_count,
  COALESCE((
    SELECT MAX(m.eligible_view_threshold)::INTEGER
    FROM public.school_blog_reward_milestones m
    WHERE m.article_id = a.id
  ), 0)
);

-- ----------------------------------------------------------------------------
-- 5. HELPER: LIVE VERIFIED FOLLOWER COUNT (EXCLUDES SELF, SUSPENDED & DELETED)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_genuine_campus_follower_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR BTRIM(p_user_id) = '' THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT f.follower_user_id)::INTEGER
  INTO v_count
  FROM public.campus_follows f
  JOIN public.users u ON u.id = f.follower_user_id
  WHERE f.following_user_id = p_user_id
    AND f.follower_user_id <> p_user_id
    AND COALESCE(NULLIF(LOWER(BTRIM(u.data->>'accountStatus')), ''), 'active')
        NOT IN ('suspended', 'deleted', 'banned', 'disabled')
    AND COALESCE((u.data->>'isDeleted')::boolean, false) = false;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_genuine_campus_follower_count(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_genuine_campus_follower_count(TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 6. UPDATED ATOMIC VIEW DEDUPLICATION + 200-FOLLOWER + 8,000 GP CAP REWARD ENGINE
--    * Unique views deduplicated once per authenticated user per article.
--    * Pre-200-follower views record is_reward_qualifying = false (NO retroactive GP).
--    * Drops below 200 followers pause future GP credits (existing GP preserved).
--    * Each article independently caps at 8 milestones = 2,000 qualifying views = 8,000 GP.
-- ----------------------------------------------------------------------------
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
  v_viewer_exists BOOLEAN := false;
  v_viewer_status TEXT := 'active';
  v_author_status TEXT := 'active';
  v_inserted_view_id UUID := NULL;
  v_counted BOOLEAN := false;
  v_reason TEXT := 'ignored';
  v_total_unique_views INTEGER := 0;
  v_qualifying_views INTEGER := 0;
  v_is_active_blogger BOOLEAN := false;
  v_follower_count INTEGER := 0;
  v_is_reward_eligible BOOLEAN := false;
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

  -- 2. Check blogger active assignment & author account health & live genuine followers (>= 200)
  SELECT EXISTS (
    SELECT 1
    FROM public.school_blogger_assignments a
    WHERE a.institution_id = v_article.blog_institution_id
      AND a.user_id = v_article.author_user_id
      AND a.status = 'active'
  )
  INTO v_is_active_blogger;

  SELECT COALESCE(NULLIF(LOWER(BTRIM(u.data->>'accountStatus')), ''), 'active')
  INTO v_author_status
  FROM public.users u
  WHERE u.id = v_article.author_user_id;

  IF COALESCE(v_author_status, 'active') IN ('suspended', 'deleted', 'banned', 'disabled') THEN
    v_is_active_blogger := false;
  END IF;

  v_follower_count := public.get_genuine_campus_follower_count(v_article.author_user_id);
  v_is_reward_eligible := (v_is_active_blogger AND v_follower_count >= 200);

  -- 3. Evaluate viewer eligibility (must be authenticated registered user, non-author, non-suspended)
  v_viewer := NULLIF(BTRIM(COALESCE(p_viewer_user_id, '')), '');

  IF v_viewer IS NULL THEN
    v_counted := false;
    v_reason := 'auth_required';
  ELSIF v_viewer = v_article.author_user_id THEN
    v_counted := false;
    v_reason := 'author_self_view';
  ELSE
    SELECT
      true,
      COALESCE(NULLIF(LOWER(BTRIM(u.data->>'accountStatus')), ''), 'active')
    INTO v_viewer_exists, v_viewer_status
    FROM public.users u
    WHERE u.id = v_viewer;

    IF NOT COALESCE(v_viewer_exists, false) THEN
      v_counted := false;
      v_reason := 'unverified_viewer';
    ELSIF COALESCE(v_viewer_status, 'active') IN ('suspended', 'deleted', 'banned', 'disabled') THEN
      v_counted := false;
      v_reason := 'suspended_viewer';
    ELSE
      INSERT INTO public.school_blog_eligible_article_views (
        article_id,
        user_id,
        is_reward_qualifying
      )
      VALUES (
        p_article_id,
        v_viewer,
        v_is_reward_eligible
      )
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

  -- 4. Authoritative counts for total unique views and reward-qualifying unique views
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE is_reward_qualifying = true)::INTEGER
  INTO v_total_unique_views, v_qualifying_views
  FROM public.school_blog_eligible_article_views
  WHERE article_id = p_article_id;

  UPDATE public.school_blog_articles
  SET
    eligible_views_count = v_total_unique_views,
    views_count = v_total_unique_views,
    qualifying_views_count = v_qualifying_views
  WHERE id = p_article_id;

  -- 5. Compute milestone target capped strictly at 8 milestones (2,000 qualifying views = 8,000 GP max/article)
  v_target_milestones := LEAST(8, v_qualifying_views / 250);

  IF v_is_reward_eligible AND v_target_milestones >= 1 THEN
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
          'transactionReference', v_tx_ref,
          'userId', v_article.author_user_id,
          'bloggerId', v_article.author_user_id,
          'userName', COALESCE(NULLIF(BTRIM(v_user_data->>'name'), ''), NULLIF(BTRIM(v_user_data->>'fullName'), ''), v_article.author_name),
          'userEmail', COALESCE(v_user_data->>'email', ''),
          'userAvatar', COALESCE(v_user_data->>'avatar', COALESCE(v_user_data->>'profileImage', '')),
          'institutionName', v_article.institution_name,
          'type', 'blogger_reward',
          'rewardType', 'School Blog Article Reward',
          'source', 'SCHOOL_BLOG_REWARD',
          'amount', 1000,
          'unit', 'GP',
          'currency', 'GP',
          'title', 'School Blog Article Reward',
          'description', format('+1,000 GP automatic reward for reaching %s qualifying unique views on "%s" (%s)', v_threshold, v_article.title, v_article.institution_name),
          'isCredit', true,
          'status', 'completed',
          'articleId', p_article_id::TEXT,
          'articleTitle', v_article.title,
          'milestoneNumber', v_m,
          'eligibleViewThreshold', v_threshold,
          'eligibleViewCount', v_qualifying_views,
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
    'viewsCount', v_total_unique_views,
    'eligibleViewsCount', v_total_unique_views,
    'qualifyingViewsCount', v_qualifying_views,
    'followerCount', v_follower_count,
    'isRewardEligible', v_is_reward_eligible,
    'maxCapReached', (v_qualifying_views >= 2000 OR v_article_gp_earned >= 8000),
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
