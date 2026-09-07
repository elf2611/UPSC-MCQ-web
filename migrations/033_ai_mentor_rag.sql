-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Base for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(768), -- Gemini text-embedding-004 defaults to 768 dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: HNSW index is deferred until basic RAG is verified and dataset grows.
-- CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- Full-text search index for Hybrid Search
ALTER TABLE knowledge_base ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS knowledge_base_fts_idx ON knowledge_base USING GIN (fts);

-- Hybrid Search Function
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding VECTOR(768),
    query_text TEXT,
    match_count INT DEFAULT 5,
    full_text_weight FLOAT DEFAULT 1.0,
    semantic_weight FLOAT DEFAULT 1.0
) RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH semantic_matches AS (
        SELECT 
            k.id,
            1 - (k.embedding <=> query_embedding) as semantic_score
        FROM knowledge_base k
    ),
    keyword_matches AS (
        SELECT 
            k.id,
            ts_rank(k.fts, websearch_to_tsquery('english', query_text)) as keyword_score
        FROM knowledge_base k
        WHERE k.fts @@ websearch_to_tsquery('english', query_text)
    )
    SELECT 
        k.id,
        k.content,
        k.metadata,
        (
            COALESCE(s.semantic_score, 0.0) * semantic_weight +
            COALESCE(kwd.keyword_score, 0.0) * full_text_weight
        ) as similarity
    FROM knowledge_base k
    LEFT JOIN semantic_matches s ON k.id = s.id
    LEFT JOIN keyword_matches kwd ON k.id = kwd.id
    WHERE (s.semantic_score IS NOT NULL OR kwd.keyword_score > 0)
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Student AI Memory
CREATE TABLE IF NOT EXISTS student_ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    memory_type TEXT NOT NULL, -- e.g., 'weakness', 'preference', 'repeated_mistake'
    content TEXT NOT NULL,
    relevance_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_ai_memory_user ON student_ai_memory(user_id);
