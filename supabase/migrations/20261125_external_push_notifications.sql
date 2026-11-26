-- ============================================================================
-- GROBAAX EXTERNAL WEB PUSH NOTIFICATIONS (FCM)
-- Tables: push_device_tokens, push_notification_preferences, push_delivery_logs
-- Strict Row Level Security tied to Supabase auth.uid()::text
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. USER REGISTERED PUSH DEVICES (SUPPORTS MULTIPLE DEVICES PER USER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web_desktop',
  browser TEXT NOT NULL DEFAULT 'Browser',
  device_label TEXT NOT NULL DEFAULT 'Web Browser',
  user_agent TEXT NOT NULL DEFAULT '',
  is_standalone BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user_active
  ON public.push_device_tokens (user_id, is_active, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_token
  ON public.push_device_tokens (token);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_device_tokens' AND policyname = 'push_device_tokens_owner_select'
  ) THEN
    CREATE POLICY push_device_tokens_owner_select
      ON public.push_device_tokens
      FOR SELECT
      USING (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_device_tokens' AND policyname = 'push_device_tokens_owner_insert'
  ) THEN
    CREATE POLICY push_device_tokens_owner_insert
      ON public.push_device_tokens
      FOR INSERT
      WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_device_tokens' AND policyname = 'push_device_tokens_owner_update'
  ) THEN
    CREATE POLICY push_device_tokens_owner_update
      ON public.push_device_tokens
      FOR UPDATE
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_device_tokens' AND policyname = 'push_device_tokens_owner_delete'
  ) THEN
    CREATE POLICY push_device_tokens_owner_delete
      ON public.push_device_tokens
      FOR DELETE
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. USER EXTERNAL PUSH NOTIFICATION PREFERENCES & CATEGORY TOGGLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  user_id TEXT PRIMARY KEY,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  categories JSONB NOT NULL DEFAULT '{
    "connections": true,
    "messages": true,
    "announcements": true,
    "school_dome": true,
    "competitions": true,
    "school_blog": true,
    "wallet": true,
    "system": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_notification_preferences' AND policyname = 'push_prefs_owner_select'
  ) THEN
    CREATE POLICY push_prefs_owner_select
      ON public.push_notification_preferences
      FOR SELECT
      USING (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_notification_preferences' AND policyname = 'push_prefs_owner_insert'
  ) THEN
    CREATE POLICY push_prefs_owner_insert
      ON public.push_notification_preferences
      FOR INSERT
      WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_notification_preferences' AND policyname = 'push_prefs_owner_update'
  ) THEN
    CREATE POLICY push_prefs_owner_update
      ON public.push_notification_preferences
      FOR UPDATE
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_notification_preferences' AND policyname = 'push_prefs_owner_delete'
  ) THEN
    CREATE POLICY push_prefs_owner_delete
      ON public.push_notification_preferences
      FOR DELETE
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. SERVER-ONLY PUSH DELIVERY LOGS & DEDUPLICATION GUARD
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT UNIQUE,
  notification_id TEXT,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_recipient
  ON public.push_delivery_logs (recipient_user_id, created_at DESC);

ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;
-- Intentionally NO client RLS policies on push_delivery_logs; server service_role only.
