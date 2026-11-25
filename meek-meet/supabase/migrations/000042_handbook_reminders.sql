-- Handbook reminders: the summons returns each day until the handbook is
-- complete. The dispatch cron stamps last_reminder_at on every reminder it
-- sends; a handbook whose completed_at is set (or whose responses are all
-- answered) is never reminded again.

ALTER TABLE public.session_handbooks
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- The reminder query scans incomplete, already-summoned handbooks.
CREATE INDEX IF NOT EXISTS session_handbooks_reminder_idx
  ON public.session_handbooks (emailed_at)
  WHERE completed_at IS NULL;
