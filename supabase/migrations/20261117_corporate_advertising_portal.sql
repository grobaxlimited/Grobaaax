-- ============================================================================
-- GROBAAX CORPORATE ADVERTISING PORTAL — COMPLETE DATABASE SCHEMA & RLS
-- Completely isolated from student wallets, GP balances, and student tiers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CORPORATE ADVERTISER ACCOUNTS & APPLICATIONS
CREATE TABLE IF NOT EXISTS public.corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'corporate_advertiser' CHECK (account_type = 'corporate_advertiser'),
  company_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  registration_number TEXT DEFAULT '',
  website TEXT DEFAULT '',
  description TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  official_email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  supporting_document_url TEXT DEFAULT '',
  supporting_document_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
  admin_feedback TEXT DEFAULT '',
  reviewed_by TEXT,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corporate_accounts_auth ON public.corporate_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_accounts_status ON public.corporate_accounts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corporate_accounts_email ON public.corporate_accounts (lower(official_email));

-- 2. ADMIN-CONFIGURABLE CORPORATE SUBSCRIPTION PLANS
-- (No prices are hardcoded; Grobaax Admin creates and configures plans)
CREATE TABLE IF NOT EXISTS public.corporate_subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_price_naira NUMERIC(12, 2) NOT NULL CHECK (monthly_price_naira > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  max_active_campaigns INTEGER NOT NULL DEFAULT 1 CHECK (max_active_campaigns > 0),
  campaign_duration_days INTEGER NOT NULL DEFAULT 30 CHECK (campaign_duration_days > 0),
  placement_eligibility JSONB NOT NULL DEFAULT '["school_blog_article_footer"]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_plans_active ON public.corporate_subscription_plans (is_active, sort_order, monthly_price_naira);

-- 3. CORPORATE PAYMENT TRANSACTIONS (SEPARATE FROM STUDENT WALLETS & GP)
CREATE TABLE IF NOT EXISTS public.corporate_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  subscription_id UUID,
  plan_id TEXT NOT NULL REFERENCES public.corporate_subscription_plans(id) ON DELETE RESTRICT,
  plan_name_snapshot TEXT NOT NULL DEFAULT '',
  reference TEXT UNIQUE NOT NULL,
  receipt_number TEXT UNIQUE,
  amount_naira NUMERIC(12, 2) NOT NULL CHECK (amount_naira >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  channel TEXT DEFAULT 'paystack',
  gateway_response TEXT DEFAULT '',
  gateway_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_payments_company ON public.corporate_payments (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corp_payments_status ON public.corporate_payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corp_payments_plan ON public.corporate_payments (plan_id);

-- 4. CORPORATE SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.corporate_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.corporate_subscription_plans(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES public.corporate_payments(id) ON DELETE SET NULL,
  payment_reference TEXT UNIQUE NOT NULL,
  plan_name_snapshot TEXT NOT NULL,
  monthly_price_snapshot NUMERIC(12, 2) NOT NULL,
  duration_days_snapshot INTEGER NOT NULL,
  max_active_campaigns_snapshot INTEGER NOT NULL,
  campaign_duration_days_snapshot INTEGER NOT NULL,
  placement_eligibility_snapshot JSONB NOT NULL DEFAULT '["school_blog_article_footer"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'superseded')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_subs_company_status ON public.corporate_subscriptions (company_id, status, expiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_corp_subs_expiry ON public.corporate_subscriptions (status, expiry_date);

-- 5. CORPORATE ADVERTISING CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.corporate_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.corporate_subscriptions(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  ad_text TEXT NOT NULL,
  creative_image_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  cta_label TEXT NOT NULL DEFAULT 'Learn More',
  placement_type TEXT NOT NULL DEFAULT 'school_blog_article_footer',
  requested_duration_days INTEGER NOT NULL DEFAULT 30 CHECK (requested_duration_days > 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Pending Review', 'Approved', 'Rejected', 'Active', 'Paused', 'Expired', 'Suspended')
  ),
  admin_feedback TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  reviewed_by TEXT,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  impressions_count BIGINT NOT NULL DEFAULT 0,
  clicks_count BIGINT NOT NULL DEFAULT 0,
  last_served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_campaigns_company ON public.corporate_ad_campaigns (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corp_campaigns_serving ON public.corporate_ad_campaigns (status, expiry_date, last_served_at);
CREATE INDEX IF NOT EXISTS idx_corp_campaigns_sub ON public.corporate_ad_campaigns (subscription_id, status);

-- 6. BACKEND-CONTROLLED IMPRESSION TRACKING (DEDUPLICATED)
CREATE TABLE IF NOT EXISTS public.corporate_ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.corporate_ad_campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  institution_id TEXT DEFAULT '',
  viewer_key TEXT NOT NULL,
  impression_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_corp_ad_impression_dedup UNIQUE (campaign_id, article_id, viewer_key, impression_bucket)
);

CREATE INDEX IF NOT EXISTS idx_corp_impressions_campaign ON public.corporate_ad_impressions (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corp_impressions_company ON public.corporate_ad_impressions (company_id, created_at DESC);

-- 7. BACKEND-CONTROLLED CLICK TRACKING (DEDUPLICATED, NEVER COUNTS AS IMPRESSION)
CREATE TABLE IF NOT EXISTS public.corporate_ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.corporate_ad_campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.corporate_accounts(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  institution_id TEXT DEFAULT '',
  viewer_key TEXT NOT NULL,
  click_bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_corp_ad_click_dedup UNIQUE (campaign_id, article_id, viewer_key, click_bucket)
);

CREATE INDEX IF NOT EXISTS idx_corp_clicks_campaign ON public.corporate_ad_clicks (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corp_clicks_company ON public.corporate_ad_clicks (company_id, created_at DESC);

-- 8. CORPORATE ADVERTISING ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.corporate_ad_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_audit_created ON public.corporate_ad_audit_logs (created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- All writes and admin reviews run server-side via JWT verification + supabaseAdmin
-- ============================================================================
ALTER TABLE public.corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_ad_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_accounts' AND policyname = 'corp_accounts_owner_select'
  ) THEN
    CREATE POLICY corp_accounts_owner_select ON public.corporate_accounts
      FOR SELECT USING (auth.uid() = auth_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_subscription_plans' AND policyname = 'corp_plans_active_public_select'
  ) THEN
    CREATE POLICY corp_plans_active_public_select ON public.corporate_subscription_plans
      FOR SELECT USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_payments' AND policyname = 'corp_payments_owner_select'
  ) THEN
    CREATE POLICY corp_payments_owner_select ON public.corporate_payments
      FOR SELECT USING (
        company_id IN (SELECT id FROM public.corporate_accounts WHERE auth_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_subscriptions' AND policyname = 'corp_subs_owner_select'
  ) THEN
    CREATE POLICY corp_subs_owner_select ON public.corporate_subscriptions
      FOR SELECT USING (
        company_id IN (SELECT id FROM public.corporate_accounts WHERE auth_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_ad_campaigns' AND policyname = 'corp_campaigns_owner_or_active_select'
  ) THEN
    CREATE POLICY corp_campaigns_owner_or_active_select ON public.corporate_ad_campaigns
      FOR SELECT USING (
        status = 'Active'
        OR company_id IN (SELECT id FROM public.corporate_accounts WHERE auth_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_ad_impressions' AND policyname = 'corp_impressions_owner_select'
  ) THEN
    CREATE POLICY corp_impressions_owner_select ON public.corporate_ad_impressions
      FOR SELECT USING (
        company_id IN (SELECT id FROM public.corporate_accounts WHERE auth_user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'corporate_ad_clicks' AND policyname = 'corp_clicks_owner_select'
  ) THEN
    CREATE POLICY corp_clicks_owner_select ON public.corporate_ad_clicks
      FOR SELECT USING (
        company_id IN (SELECT id FROM public.corporate_accounts WHERE auth_user_id = auth.uid())
      );
  END IF;
END $$;

-- Dedicated storage buckets for corporate ad creatives (public) & verification docs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('corporate-ad-media', 'corporate-ad-media', true),
  ('corporate-verification-docs', 'corporate-verification-docs', false)
ON CONFLICT (id) DO NOTHING;
