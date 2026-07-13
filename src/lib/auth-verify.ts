/**
 * Server-side admin authentication verification utility.
 *
 * This module verifies that the incoming request:
 *   1. Contains a valid Firebase ID token in the Authorization header.
 *   2. That the token decodes to a real Firebase user.
 *   3. That the Firebase UID maps to a profile in Supabase with role='admin'
 *      OR has the hardcoded admin email.
 *
 * Returns granular, diagnosable error messages instead of a single "Unauthorized".
 */
import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// The hardcoded admin email as a fallback to the role column.
const ADMIN_EMAIL = 'admin@prepwise.com';

export type AdminVerifyResult =
  | { ok: true; uid: string; email: string }
  | { ok: false; status: 401 | 403; error: string; detail: string };

/**
 * Verify that the request carries a valid Firebase ID token from an admin user.
 *
 * All failure paths are logged to console (and system_logs table) with
 * full diagnostic context so failures are never opaque.
 */
export async function verifyAdminToken(request: NextRequest): Promise<AdminVerifyResult> {
  const route = request.nextUrl.pathname;

  // ─── Step 1: Check Authorization header ───────────────────────────────────
  const authHeader = request.headers.get('authorization');
  logger.info({
    event_type: 'admin_verify_start',
    route,
    has_auth_header: !!authHeader,
    header_prefix: authHeader ? authHeader.substring(0, 15) : null,
  });

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      event_type: 'admin_verify_fail',
      route,
      reason: 'missing_token',
      detail: 'No Authorization: Bearer header present on request',
    });
    return {
      ok: false,
      status: 401,
      error: 'Not logged in. Please sign in to continue.',
      detail: 'No Authorization header was present on the request.',
    };
  }

  const idToken = authHeader.substring(7); // Strip "Bearer "

  // ─── Step 2: Verify the Firebase ID token ─────────────────────────────────
  let decodedToken: { uid: string; email?: string };
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken, true); // checkRevoked=true
    logger.info({
      event_type: 'admin_verify_token_ok',
      route,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isExpired =
      errMsg.includes('expired') || errMsg.includes('auth/id-token-expired');

    logger.warn({
      event_type: 'admin_verify_fail',
      route,
      reason: isExpired ? 'token_expired' : 'token_invalid',
      detail: errMsg,
    });

    return {
      ok: false,
      status: 401,
      error: isExpired
        ? 'Session expired. Please refresh the page and try again.'
        : 'Invalid session token. Please sign out and sign back in.',
      detail: errMsg,
    };
  }

  const { uid, email: tokenEmail } = decodedToken;

  // ─── Step 3: Check email fast-path ────────────────────────────────────────
  // If the token's email is the hardcoded admin email, allow immediately
  // without hitting the database.
  if (tokenEmail === ADMIN_EMAIL) {
    logger.info({
      event_type: 'admin_verify_ok',
      route,
      uid,
      method: 'email_fastpath',
    });
    return { ok: true, uid, email: tokenEmail };
  }

  // ─── Step 4: Query Supabase profiles by Firebase UID ─────────────────────
  // We use the service role key here so RLS never blocks this read.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email')
    .eq('id', uid) // Firebase UID is stored as profiles.id
    .single();

  logger.info({
    event_type: 'admin_verify_db_query',
    route,
    uid,
    profile_found: !!profile,
    profile_role: profile?.role ?? null,
    profile_email: profile?.email ?? null,
    db_error: profileError?.message ?? null,
  });

  if (profileError) {
    // PGRST116 = "no rows returned" — profile doesn't exist yet
    if (profileError.code === 'PGRST116') {
      logger.warn({
        event_type: 'admin_verify_fail',
        route,
        uid,
        reason: 'no_profile',
        detail: 'No profile row found for this Firebase UID in Supabase',
      });
      return {
        ok: false,
        status: 403,
        error: 'Account not found in database. Please sign out and sign back in.',
        detail: `No profile found for uid=${uid}`,
      };
    }

    // Any other DB error
    logger.error({
      event_type: 'admin_verify_fail',
      route,
      uid,
      reason: 'db_error',
      detail: profileError.message,
    });
    return {
      ok: false,
      status: 403,
      error: 'Database error while verifying admin status. Please try again.',
      detail: profileError.message,
    };
  }

  if (!profile) {
    return {
      ok: false,
      status: 403,
      error: 'Account not found in database.',
      detail: `Profile query returned null for uid=${uid}`,
    };
  }

  // ─── Step 5: Check role OR email in DB ────────────────────────────────────
  const isAdmin =
    profile.role === 'admin' || profile.email === ADMIN_EMAIL;

  if (!isAdmin) {
    logger.warn({
      event_type: 'admin_verify_fail',
      route,
      uid,
      reason: 'not_admin',
      profile_role: profile.role,
      profile_email: profile.email,
      detail: 'Profile exists but does not have admin role',
    });
    return {
      ok: false,
      status: 403,
      error: 'Account does not have admin privileges.',
      detail: `Profile role="${profile.role}", email="${profile.email}" — neither qualifies as admin.`,
    };
  }

  logger.info({
    event_type: 'admin_verify_ok',
    route,
    uid,
    method: 'db_role',
    profile_role: profile.role,
  });

  return { ok: true, uid, email: profile.email ?? tokenEmail ?? '' };
}
