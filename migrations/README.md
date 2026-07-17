# Prepwise Database Migrations

This folder contains the complete, authoritative source of truth for the Supabase database schema used in the Prepwise application.

## How to Apply to a Fresh Supabase Project

To reproduce the exact database schema, apply these SQL scripts in the Supabase SQL Editor in numerical order:

1. `001_core_schema.sql` (Tables: profiles, subjects, topics, questions, bookmarks)
2. `002_test_pipeline.sql` (Tables: test_attempts, attempt_answers, question_attempts)
3. `003_processing_pipeline.sql` (Tables: question_history)
4. `004_gamification.sql` (Tables: revision_queue, user_statistics, achievements, daily_current_affairs)
5. `005_search_and_indexes.sql` (Constraints, indexes, RPC functions)
6. `006_rls_policies.sql` (Default deny policies for Firebase auth)
7. `007_seed_data.sql` (Initial subject categories)

## Important Note on Row Level Security (RLS)

Because this app uses **Firebase Authentication** instead of Supabase Authentication, the standard Supabase `auth.uid()` functions do not work.

Instead, the `006_rls_policies.sql` file implements a **Default Deny** posture for almost all tables:
- `questions`, `profiles`, `test_attempts`, `bookmarks`, etc. are entirely blocked from client-side access.
- Only safe metadata (`subjects`, `topics`) are readable client-side.
- All actual app reads/writes MUST go through Next.js server API routes using the Supabase Service Role key (which bypasses RLS), after verifying the Firebase ID token in the route handler.

## Making Future Changes

**DO NOT** create one-off `patch.sql` files in the repo root.
Instead, create a new numbered file (e.g., `008_new_feature.sql`) in this directory.
