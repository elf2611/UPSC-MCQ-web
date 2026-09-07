-- Enhance Adaptive Learning Logic with AI-driven Priority

-- This function wraps the existing adaptive logic but prioritizes weak topics identified by the AI Mentor
CREATE OR REPLACE FUNCTION get_smart_adaptive_questions(
    p_user_id TEXT,
    p_subject TEXT,
    p_weak_topics TEXT[], -- Array of weak topics identified by AI/stats
    p_difficulty TEXT,
    p_limit INTEGER,
    p_ability_score NUMERIC DEFAULT 1200.0
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
        AND (p_difficulty IS NULL OR p_difficulty = 'All Levels' OR difficulty = p_difficulty)
    )
    SELECT f.*
    FROM filtered_q f
    ORDER BY
        -- Priority 1: Is it in the weak topics array?
        CASE WHEN f.topic = ANY(p_weak_topics) THEN 0 ELSE 1 END ASC,
        -- Priority 2: Closest to user's ability score
        ABS(f.difficulty_rating - p_ability_score) ASC,
        -- Exclude seen questions
        (SELECT MAX(created_at) FROM attempt_answers aa WHERE aa.question_id = f.id AND aa.user_id = p_user_id) ASC NULLS FIRST,
        -- Randomize ties
        random()
    LIMIT COALESCE(p_limit, 10);
END;
$$;
