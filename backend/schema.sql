-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Documents table (Phase 1: RAG)
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),  -- 1536 for OpenAI text-embedding-3-small; adjust if you use a different model
  source text,             -- e.g. filename
  topic text,               -- optional tag to filter by subject
  created_at timestamp with time zone default now()
);

-- 3. Similarity search function used by the /retrieve endpoint
create or replace function match_documents (
  query_embedding vector(1536),
  match_count int default 5,
  filter_topic text default null
)
returns table (
  id bigint,
  content text,
  source text,
  topic text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.source,
    documents.topic,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where filter_topic is null or documents.topic = filter_topic
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 4. Summaries table (Phase 3: acts as long-term "memory" of covered topics)
create table if not exists summaries (
  id bigserial primary key,
  topic text not null,
  summary text not null,
  created_at timestamp with time zone default now()
);

-- 5. Quiz history (Phase 4: avoid repeating questions on the same topic)
create table if not exists quiz_history (
  id bigserial primary key,
  topic text not null,
  question text not null,
  options jsonb,
  correct_answer text,
  created_at timestamp with time zone default now()
);
