-- ============================================
-- 000035 Marketing Email Themes
-- ============================================
-- Record which visual theme each marketing send used, so resends can
-- escalate through the ladder (parchment → midnight → terracotta) and the
-- history shows what each recipient has already seen.

ALTER TABLE public.marketing_sends
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'parchment';
