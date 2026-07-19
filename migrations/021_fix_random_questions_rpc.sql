CREATE OR REPLACE FUNCTION get_random_questions(
    p_user_id TEXT,
    p_subject TEXT,
    p_topic TEXT,
    p_subtopic TEXT,
    p_difficulty TEXT,
    p_year INTEGER,
    p_date DATE,
    p_mode TEXT,
    p_limit INTEGER
) RETURNS SETOF questions LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH filtered_q AS (
        SELECT *
        FROM questions
        WHERE (
            p_subject IS NULL OR
            (length(p_subject) = 36 AND p_subject LIKE '%-%' AND subject_id = p_subject::UUID) OR
            (subject = p_subject)
        )
        AND (p_topic IS NULL OR topic = p_topic)
        AND (p_subtopic IS NULL OR subtopic = p_subtopic)
        AND (p_difficulty IS NULL OR p_difficulty = 'All Levels' OR difficulty = p_difficulty)
        AND (p_year IS NULL OR year = p_year)
        AND (p_mode != 'pyq' OR year IS NOT NULL)
        AND (p_mode NOT IN ('practice', 'test') OR year IS NULL)
        AND (p_mode != 'current-affairs' OR (source = 'current-affairs' AND (p_date IS NULL OR article_date = p_date)))
    )
    SELECT f.*
    FROM filtered_q f
    ORDER BY
        -- For practice and pyq modes, we want to prioritize questions the user hasn't seen recently.
        -- By sorting by the last time they answered the question (NULLs first), we naturally exclude
        -- recently seen questions, but fallback to repeating older ones if we run out of fresh ones!
        CASE 
            WHEN p_mode IN ('practice', 'pyq') THEN
                (SELECT MAX(aa.created_at) 
                 FROM attempt_answers aa 
                 JOIN test_attempts ta ON aa.attempt_id = ta.id 
                 WHERE aa.question_id = f.id AND ta.user_id = p_user_id)
            ELSE NULL 
        END ASC NULLS FIRST,
        CASE 
            WHEN p_mode = 'mock' THEN (f.id::text)
            ELSE (random()::text)
        END
    LIMIT COALESCE(p_limit, 10);
END;
$$;
