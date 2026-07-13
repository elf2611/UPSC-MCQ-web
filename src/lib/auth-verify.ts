/**
 * Server-side admin authentication verification utility.
 *
 * Verifies the incoming request has a valid Firebase ID token belonging to an admin.
 * Returns granular, diagnosable error messages — never a generic "Unauthorized".
 *
 * All failure paths are logged to console + system_logs table.
 */
import { NextRequest } from 'next/server';
import { getAdminAuth } from './firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'admin@prepwise.com';

export type AdminVerifyResult =
  | { ok: true; uid: string; email: string }
  | { ok: false; status: 401 | 403 | 500; error: string; detail: string };

/**
 * Verify the request carries a valid Firebase ID token from an admin user.
 * Safe to call even if Firebase Admin credentials are misconfigured — returns
 * a JSON-serializable result instead of throwing.
 */
export async function verifyAdminToken(request: NextRequest): Promise<AdminVerifyResult> {
  const route = request.nextUrl.pathname;

  // ── Step 1: Check Authorization header ────────────────────────────────────
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

  // ── Step 2: Verify the Firebase ID token ──────────────────────────────────
  // getAdminAuth() can throw if env vars are misconfigured — we catch it here
  // and return a 500 JSON result instead of letting it propagate as an HTML crash.
  let decodedToken: { uid: string; email?: string };
  try {
    const adminAuth = getAdminAuth();
    decodedToken = await adminAuth.verifyIdToken(idToken, true); // checkRevoked=true
    logger.info({
      event_type: 'admin_verify_token_ok',
      route,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);

    // Distinguish misconfiguration from an actual bad token
    const isMisconfigured =
      errMsg.includes('Server misconfigured') ||
      errMsg.includes('Cannot initialize Firebase Admin') ||
      errMsg.includes('FIREBASE_');

    const isExpired =
      errMsg.includes('expired') || errMsg.includes('auth/id-token-expired');

    logger.warn({
      event_type: 'admin_verify_fail',
      route,
      reason: isMisconfigured ? 'server_misconfigured' : isExpired ? 'token_expired' : 'token_invalid',
      detail: errMsg,
    });

    if (isMisconfigured) {
      return {
        ok: false,
        status: 500,
        error: 'Server configuration error. Please contact the administrator.',
        detail: errMsg,
      };
    }

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

  // ── Step 3: Email fast-path ────────────────────────────────────────────────
  // If the Firebase token's email is the hardcoded admin email, allow immediately.
  if (tokenEmail === ADMIN_EMAIL) {
    logger.info({ event_type: 'admin_verify_ok', route, uid, method: 'email_fastpath' });
    return { ok: true, uid, email: tokenEmail };
  }

  // ── Step 4: Query Supabase profiles ───────────────────────────────────────
  // Service role key is used so RLS never blocks this read.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email')
    .eq('id', uid)
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
    if (profileError.code === 'PGRST116') {
      logger.warn({ event_type: 'admin_verify_fail', route, uid, reason: 'no_profile' });
      return {
        ok: false,
        status: 403,
        error: 'Account not found in database. Please sign out and sign back in.',
        detail: `No profile row found for uid=${uid}`,
      };
    }
    logger.error({ event_type: 'admin_verify_fail', route, uid, reason: 'db_error', detail: profileError.message });
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

  // ── Step 5: Check role or email in DB ─────────────────────────────────────
  const isAdmin = profile.role === 'admin' || profile.email === ADMIN_EMAIL;

  if (!isAdmin) {
    logger.warn({
      event_type: 'admin_verify_fail',
      route, uid,
      reason: 'not_admin',
      profile_role: profile.role,
      profile_email: profile.email,
    });
    return {
      ok: false,
      status: 403,
      error: 'Account does not have admin privileges.',
      detail: `Profile role="${profile.role}", email="${profile.email}" — neither qualifies as admin.`,
    };
  }

  logger.info({ event_type: 'admin_verify_ok', route, uid, method: 'db_role' });
  return { ok: true, uid, email: profile.email ?? tokenEmail ?? '' };
}
