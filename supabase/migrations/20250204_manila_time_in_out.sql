-- Use Manila time for time_in / time_out by accepting client timestamps and using them when inserting.
-- Run this in Supabase SQL Editor and adjust function bodies to match your existing record_time_in / record_time_out logic.
-- The scanner PWA now sends time_in_at and time_out_at (ISO strings); use them when setting time_in/time_out columns.

-- Example: add optional parameters to record_time_in and use p_time_in_at when inserting.
-- Replace the body with your actual logic; only the signature and usage of p_time_in_at are shown.

-- For record_time_in: add parameter   p_time_in_at timestamptz DEFAULT (now() AT TIME ZONE 'UTC')
-- and in the INSERT/SELECT that sets time_in, use: COALESCE(p_time_in_at::timestamptz, now()) AT TIME ZONE 'Asia/Manila'
-- or simply use p_time_in_at for the time_in column if the column is timestamptz (stores UTC; display in Manila in app).

-- For record_time_out: add parameter   p_time_out_at timestamptz DEFAULT (now() AT TIME ZONE 'UTC')
-- and use it for the time_out column.

-- Minimal example (adjust table/column names to match your schema):

/*
CREATE OR REPLACE FUNCTION record_time_in(
  learner_ref_number text,
  rfid_tag text,
  grade_level text,
  school_year text,
  p_time_in_at timestamptz DEFAULT now()
)
RETURNS ... AS $$
  ...
  -- When inserting into attendance, set time_in = p_time_in_at (or use p_time_in_at for your time_in column).
  ...
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_time_out(
  learner_ref_number text,
  p_time_out_at timestamptz DEFAULT now()
)
RETURNS ... AS $$
  ...
  -- When updating attendance, set time_out = p_time_out_at.
  ...
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- If your columns are type TIMESTAMP WITH TIME ZONE (timestamptz): storing p_time_in_at is correct;
-- the app already displays in Manila. If your columns are TIMESTAMP WITHOUT TIME ZONE and you want
-- the stored value to be Manila local time, use:
--   (p_time_in_at AT TIME ZONE 'Asia/Manila')  when inserting into a timestamp (no tz) column.
-- Then when you read back, interpret as Manila.
