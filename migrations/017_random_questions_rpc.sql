-- Migration 017: RPC for randomized questions with fallback exclusion

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
                (SELECT MAX(created_at) FROM attempt_answers aa WHERE aa.question_id = f.id AND aa.user_id = p_user_id)
            ELSE NULL 
        END ASC NULLS FIRST,
        -- Mock tests shouldn't be fully randomized on every load if they represent a fixed paper, 
        -- but if they are dynamic, they should. The user said: "Don't apply this exclusion to mock mode, 
        -- where a fixed test paper should stay consistent across attempts."
        -- To make mock tests consistent, we can order by ID.
        -- Wait, the prompt says "Update route.ts to call .rpc... for every mode... just move it into the RPC and randomize the final selection. Don't apply this exclusion to mock mode". 
        -- It implies we still randomize other modes? Actually, the prompt says "randomize the final selection" for everything, but "Don't apply this exclusion to mock mode, where a fixed test paper should stay consistent across attempts." 
        -- If it's a fixed paper, maybe we order by ID for mock mode? Or we just randomize anyway if mock tests are dynamic? 
        -- Let's order by random() for everything EXCEPT mock, or random() for everything, but mock doesn't get the exclusion.
        -- If mock is a fixed test paper, it implies `mock` mode expects the SAME questions if the filters are the same.
        -- Let's use `f.id` for mock mode to ensure stable ordering, and `random()` for others.
        CASE 
            WHEN p_mode = 'mock' THEN (f.id::text)
            ELSE (random()::text)
        END
    LIMIT COALESCE(p_limit, 10);
END;
$$;
