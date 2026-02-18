-- Add school_id to scan_schedule so schedules are per-school.
-- Run in Supabase SQL Editor if not using Supabase CLI.

ALTER TABLE public.scan_schedule
  ADD COLUMN IF NOT EXISTS school_id integer NULL;

-- Optional: add foreign key if you have a school table with school_id.
-- ALTER TABLE public.scan_schedule
--   ADD CONSTRAINT scan_schedule_school_id_fkey
--   FOREIGN KEY (school_id) REFERENCES public.school(school_id);

-- Optional: backfill existing rows with a default school (e.g. 1) then set NOT NULL.
-- UPDATE public.scan_schedule SET school_id = 1 WHERE school_id IS NULL;
-- ALTER TABLE public.scan_schedule ALTER COLUMN school_id SET NOT NULL;

COMMENT ON COLUMN public.scan_schedule.school_id IS 'School this schedule belongs to; filter schedules by logged-in school.';
