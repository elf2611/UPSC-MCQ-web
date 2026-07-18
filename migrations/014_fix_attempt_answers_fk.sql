-- Add missing foreign key constraint on attempt_answers table to ensure data integrity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attempt_answers_question_id_fkey') THEN
        ALTER TABLE attempt_answers ADD CONSTRAINT attempt_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    END IF;
END $$;
