-- Fix schema drift where user_id might still be UUID on some tables, although live tables might already be TEXT.
-- This ensures all related tables definitively use TEXT for user_id to match Firebase UIDs.
ALTER TABLE test_attempts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE attempt_answers ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE revision_queue ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE user_statistics ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE question_attempts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Drop the old RPC that strictly required uuid for p_user_id
DROP FUNCTION IF EXISTS submit_test_attempt(uuid, uuid, text, numeric, numeric, integer, integer, integer, numeric, integer, timestamptz, jsonb);

-- Recreate the RPC with TEXT for p_user_id to support Firebase UIDs properly
CREATE OR REPLACE FUNCTION submit_test_attempt(
  p_user_id text,
  p_test_id uuid,
  p_mode text,
  p_score numeric,
  p_total_marks numeric,
  p_correct_count integer,
  p_wrong_count integer,
  p_unattempted_count integer,
  p_accuracy_percent numeric,
  p_time_taken_seconds integer,
  p_started_at timestamptz,
  p_answers jsonb
) RETURNS uuid AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  -- 1. Insert into test_attempts
  INSERT INTO test_attempts (
    user_id, test_id, mode, score, total_marks,
    correct_count, wrong_count, unattempted_count,
    accuracy_percent, time_taken_seconds, started_at, submitted_at
  ) VALUES (
    p_user_id, p_test_id, p_mode, p_score, p_total_marks,
    p_correct_count, p_wrong_count, p_unattempted_count,
    p_accuracy_percent, p_time_taken_seconds, p_started_at, now()
  ) RETURNING id INTO v_attempt_id;

  -- 2. Insert into attempt_answers if answers exist
  IF p_answers IS NOT NULL AND jsonb_array_length(p_answers) > 0 THEN
    INSERT INTO attempt_answers (
      attempt_id, question_id, selected_option,
      is_correct, time_spent_seconds, marked_for_review, user_id
    )
    SELECT
      v_attempt_id,
      (value->>'question_id')::uuid,
      value->>'selected_option',
      COALESCE((value->>'is_correct')::boolean, false),
      COALESCE((value->>'time_spent_seconds')::integer, 0),
      COALESCE((value->>'marked_for_review')::boolean, false),
      p_user_id
    FROM jsonb_array_elements(p_answers);
  END IF;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
