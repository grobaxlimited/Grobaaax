-- ============================================================================
-- GROBAAX CAMPUS ENHANCEMENT: SKILLS DIRECTORY & INDEPENDENT SCHOOL BLOGS
-- Non-destructive additive schema migration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. EXTENSIBLE CAMPUS SKILL CATEGORIES
CREATE TABLE IF NOT EXISTS public.campus_skill_categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'General Skills',
  icon TEXT DEFAULT '✨',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campus_skill_categories_active
  ON public.campus_skill_categories (is_active, sort_order);

-- Seed core student skills (extensible via DB without app rebuilds)
INSERT INTO public.campus_skill_categories (id, slug, name, group_name, icon, is_active, sort_order)
VALUES
  ('skill_graphic_design', 'graphic-design', 'Graphic Design', 'Creative & Design', '🎨', true, 10),
  ('skill_ui_ux_design', 'ui-ux-design', 'UI/UX Design', 'Creative & Design', '📐', true, 20),
  ('skill_video_editing', 'video-editing', 'Video Editing', 'Creative & Design', '🎬', true, 30),
  ('skill_photography', 'photography', 'Photography', 'Creative & Design', '📷', true, 40),
  ('skill_web_development', 'web-development', 'Web Development', 'Tech & Digital', '💻', true, 50),
  ('skill_mobile_app_development', 'mobile-app-development', 'Mobile App Development', 'Tech & Digital', '📱', true, 60),
  ('skill_data_analysis', 'data-analysis', 'Data Analysis', 'Tech & Digital', '📊', true, 70),
  ('skill_digital_marketing', 'digital-marketing', 'Digital Marketing', 'Media & Writing', '📣', true, 80),
  ('skill_content_creation', 'content-creation', 'Content Creation', 'Media & Writing', '🎙️', true, 90),
  ('skill_copywriting', 'copywriting', 'Copywriting', 'Media & Writing', '✍️', true, 100),
  ('skill_fashion_design', 'fashion-design', 'Fashion Design', 'Fashion & Beauty', '👗', true, 110),
  ('skill_tailoring', 'tailoring', 'Tailoring', 'Fashion & Beauty', '🧵', true, 120),
  ('skill_hairdressing', 'hairdressing', 'Hairdressing', 'Fashion & Beauty', '💇‍♀️', true, 130),
  ('skill_barbing', 'barbing', 'Barbing', 'Fashion & Beauty', '💈', true, 140),
  ('skill_makeup_artistry', 'makeup-artistry', 'Makeup Artistry', 'Fashion & Beauty', '💄', true, 150),
  ('skill_catering', 'catering', 'Catering', 'Hospitality & Services', '🍲', true, 160),
  ('skill_electrical_repairs', 'electrical-repairs', 'Electrical Repairs', 'Technical & Vocational', '⚡', true, 170),
  ('skill_plumbing', 'plumbing', 'Plumbing', 'Technical & Vocational', '🔧', true, 180),
  ('skill_carpentry', 'carpentry', 'Carpentry', 'Technical & Vocational', '🪚', true, 190),
  ('skill_phone_repairs', 'phone-repairs', 'Phone Repairs', 'Technical & Vocational', '🛠️', true, 200),
  ('skill_tutoring', 'academic-tutoring', 'Academic Tutoring', 'Academic & Tutoring', '📚', true, 210),
  ('skill_software_testing', 'software-qa', 'Software QA & Testing', 'Tech & Digital', '🧪', true, 220),
  ('skill_public_speaking', 'public-speaking', 'Public Speaking & MC', 'Media & Writing', '🎤', true, 230),
  ('skill_event_planning', 'event-planning', 'Event Planning', 'Hospitality & Services', '🎪', true, 240)
ON CONFLICT (slug) DO NOTHING;

-- 2. STUDENT SKILLS DIRECTORY MAPPING
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES public.campus_skill_categories(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_skill_user_skill UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_student_skills_user ON public.student_skills (user_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill ON public.student_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_inst ON public.student_skills (institution_name);

-- 3. INDEPENDENT SCHOOL BLOGS (1 PER REGISTERED INSTITUTION)
CREATE TABLE IF NOT EXISTS public.school_blogs (
  institution_id TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  short_name TEXT DEFAULT '',
  category TEXT DEFAULT 'University',
  state TEXT DEFAULT '',
  logo TEXT DEFAULT '🏛️',
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_blogs_name ON public.school_blogs (institution_name);
CREATE INDEX IF NOT EXISTS idx_school_blogs_status ON public.school_blogs (status);

-- 4. SCHOOL BLOGGER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.school_blogger_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id TEXT NOT NULL,
  institution_id TEXT NOT NULL REFERENCES public.school_blogs(institution_id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  department TEXT DEFAULT '',
  level TEXT DEFAULT '',
  reason TEXT NOT NULL,
  experience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')),
  reviewed_by TEXT,
  reviewer_name TEXT,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blogger_apps_user ON public.school_blogger_applications (applicant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogger_apps_inst_status ON public.school_blogger_applications (institution_id, status);

-- 5. SCHOOL BLOGGER ASSIGNMENTS (MAX 1 ACTIVE PRIMARY BLOGGER PER INSTITUTION)
CREATE TABLE IF NOT EXISTS public.school_blogger_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL REFERENCES public.school_blogs(institution_id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  department TEXT DEFAULT '',
  level TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed', 'replaced')),
  appointed_by TEXT NOT NULL,
  appointed_by_name TEXT DEFAULT 'Grobaax Admin',
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_by TEXT,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_school_blogger_per_institution
  ON public.school_blogger_assignments (institution_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_blogger_assign_user ON public.school_blogger_assignments (user_id, status);

-- 6. SCHOOL BLOG ARTICLES
CREATE TABLE IF NOT EXISTS public.school_blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_institution_id TEXT NOT NULL REFERENCES public.school_blogs(institution_id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('News', 'Events', 'Academics', 'Campus Life')),
  cover_image_url TEXT NOT NULL,
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'removed')),
  views_count INTEGER NOT NULL DEFAULT 0,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  moderation_reason TEXT,
  moderated_by TEXT,
  moderated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_inst_status_pub
  ON public.school_blog_articles (blog_institution_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_author
  ON public.school_blog_articles (author_user_id, created_at DESC);

-- 7. ARTICLE INLINE IMAGES
CREATE TABLE IF NOT EXISTS public.school_blog_article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  blog_institution_id TEXT NOT NULL REFERENCES public.school_blogs(institution_id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_article_images_article
  ON public.school_blog_article_images (article_id, sort_order);

-- 8. SERVER-SIDE DEDUPLICATED ARTICLE VIEWS
CREATE TABLE IF NOT EXISTS public.school_blog_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  view_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_article_view_dedup UNIQUE (article_id, viewer_key, view_bucket)
);

-- 9. ARTICLE REACTIONS (ONE REACTION PER USER PER ARTICLE)
CREATE TABLE IF NOT EXISTS public.school_blog_article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'insightful', 'celebrate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_article_reaction_user UNIQUE (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_reactions_article
  ON public.school_blog_article_reactions (article_id);

-- 10. ARTICLE MODERATION REPORTS
CREATE TABLE IF NOT EXISTS public.school_blog_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.school_blog_articles(id) ON DELETE CASCADE,
  blog_institution_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  reporter_name TEXT DEFAULT '',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_article_report_user UNIQUE (article_id, reporter_user_id)
);

-- 11. ADMIN & BLOGGER AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.school_blog_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_blog_audit_created
  ON public.school_blog_audit_logs (created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Privileged writes are handled server-side with JWT verification;
-- Direct anon/authenticated client access is safely scoped.
-- ============================================================================

ALTER TABLE public.campus_skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blogger_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blogger_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_blog_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campus_skill_categories' AND policyname = 'skill_categories_public_read'
  ) THEN
    CREATE POLICY skill_categories_public_read ON public.campus_skill_categories
      FOR SELECT USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_skills' AND policyname = 'student_skills_public_read'
  ) THEN
    CREATE POLICY student_skills_public_read ON public.student_skills
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_skills' AND policyname = 'student_skills_owner_write'
  ) THEN
    CREATE POLICY student_skills_owner_write ON public.student_skills
      FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blogs' AND policyname = 'school_blogs_public_read'
  ) THEN
    CREATE POLICY school_blogs_public_read ON public.school_blogs
      FOR SELECT USING (status = 'active');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blogger_applications' AND policyname = 'blogger_apps_owner_read'
  ) THEN
    CREATE POLICY blogger_apps_owner_read ON public.school_blogger_applications
      FOR SELECT USING (auth.uid()::text = applicant_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blogger_assignments' AND policyname = 'blogger_assign_public_active_read'
  ) THEN
    CREATE POLICY blogger_assign_public_active_read ON public.school_blogger_assignments
      FOR SELECT USING (status = 'active' OR auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blog_articles' AND policyname = 'blog_articles_published_read'
  ) THEN
    CREATE POLICY blog_articles_published_read ON public.school_blog_articles
      FOR SELECT USING (status = 'published' OR auth.uid()::text = author_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blog_article_images' AND policyname = 'blog_images_public_read'
  ) THEN
    CREATE POLICY blog_images_public_read ON public.school_blog_article_images
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_blog_article_reactions' AND policyname = 'blog_reactions_read'
  ) THEN
    CREATE POLICY blog_reactions_read ON public.school_blog_article_reactions
      FOR SELECT USING (true);
  END IF;
END $$;
