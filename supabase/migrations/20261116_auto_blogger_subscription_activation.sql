-- ============================================================================
-- GROBAAX CAMPUS: AUTOMATIC SUBSCRIPTION-BASED BLOGGER ACTIVATION
-- Allows every verified student with an active Premium or VIP subscription
-- at an institution to hold active School Blogger access without Admin queue lock.
-- Admin suspension/revocation (status IN ('suspended', 'removed')) remains strictly enforced.
-- ============================================================================

DROP INDEX IF EXISTS public.uq_active_school_blogger_per_institution;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_school_blogger_per_user_institution
  ON public.school_blogger_assignments (institution_id, user_id)
  WHERE status = 'active';
