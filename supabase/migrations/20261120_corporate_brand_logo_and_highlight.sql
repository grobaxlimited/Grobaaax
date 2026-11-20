-- ============================================================================
-- CORPORATE ADVERTISER BRAND LOGO & TEXT HIGHLIGHT COLOR SUPPORT
-- ============================================================================

ALTER TABLE public.corporate_accounts
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_highlight_color TEXT DEFAULT '#2563EB';

ALTER TABLE public.corporate_ad_campaigns
  ADD COLUMN IF NOT EXISTS brand_highlight_color TEXT DEFAULT '';

ALTER TABLE public.corporate_ticker_campaigns
  ADD COLUMN IF NOT EXISTS brand_highlight_color TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';
