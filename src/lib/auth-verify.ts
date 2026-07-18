/**
 * Server-side admin authentication — NO firebase-admin SDK required.
 *
 * Verifies Firebase ID tokens using the Firebase Auth REST API
 * (identitytoolkit.googleapis.com) which only needs NEXT_PUBLIC_FIREBASE_API_KEY
 * — already present in your Vercel env vars.
 *
 * Then checks the decoded UID/email against the Supabase profiles table.
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

// Service-role Supabase client — bypasses RLS for the profile read
export function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export type AdminVerifyResult =
  | { ok: true; uid: string; email: string }
  | { ok: false; status: 401 | 403 | 500; error: string; detail: string };

/**
 * Verify the request's Firebase ID token for ANY user.
 * Never throws — always returns a result object safe to return as JSON.
 */
export async function verifyUserToken(request: NextRequest): Promise<AdminVerifyResult> {
  const route = request.nextUrl.pathname;

  // ── Step 1: Check Authorization header ──────────────────────────────────
  const authHeader = request.headers.get('authorization');
  logger.info({ event_type: 'verify_start', route, has_auth_header: !!authHeader });

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ event_type: 'verify_fail', route, reason: 'missing_token' });
    return {
      ok: false,
      status: 401,
      error: 'Not logged in. Please sign in to continue.',
      detail: 'No Authorization: Bearer header on request.',
    };
  }

  const idToken = authHeader.substring(7);

  // ── Step 2: Verify token via Firebase REST API ───────────────────────────
  // Uses NEXT_PUBLIC_FIREBASE_API_KEY — already set in Vercel, no service account needed.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    logger.error({ event_type: 'verify_fail', route, reason: 'missing_api_key' });
    return {
      ok: false,
      status: 500,
      error: 'Server misconfigured: missing NEXT_PUBLIC_FIREBASE_API_KEY.',
      detail: 'NEXT_PUBLIC_FIREBASE_API_KEY env var is not set.',
    };
  }

  try {
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!firebaseRes.ok) {
      const errBody = await firebaseRes.json().catch(() => ({}));
      const errCode = (errBody as { error?: { message?: string } })?.error?.message ?? `HTTP ${firebaseRes.status}`;

      const isExpired = errCode.includes('EXPIRED') || errCode.includes('TOKEN_EXPIRED');
      logger.warn({ event_type: 'verify_fail', route, reason: isExpired ? 'token_expired' : 'token_invalid', detail: errCode });

      return {
        ok: false,
        status: 401,
        error: isExpired
          ? 'Session expired. Please refresh the page and try again.'
          : 'Invalid session token. Please sign out and sign back in.',
        detail: errCode,
      };
    }

    const body = await firebaseRes.json() as { users?: Array<{ localId: string; email?: string }> };
    const fbUser = body.users?.[0];

    if (!fbUser?.localId) {
      logger.warn({ event_type: 'verify_fail', route, reason: 'no_user_in_response' });
      return {
        ok: false,
        status: 401,
        error: 'Invalid session token. Please sign out and sign back in.',
        detail: 'Firebase returned no user for this token.',
      };
    }

    const uid = fbUser.localId;
    const tokenEmail = fbUser.email || '';

    logger.info({ event_type: 'verify_token_ok', route, uid, email: tokenEmail });
    return { ok: true, uid, email: tokenEmail };
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({ event_type: 'verify_fail', route, reason: 'network_error', detail });
    return {
      ok: false,
      status: 500,
      error: 'Could not verify session — network error contacting Firebase.',
      detail,
    };
  }
}

/**
 * Verify the request's Firebase ID token and confirm the user is an admin.
 * Never throws — always returns a result object safe to return as JSON.
 */
export async function verifyAdminToken(request: NextRequest): Promise<AdminVerifyResult> {
  const route = request.nextUrl.pathname;
  
  const tokenResult = await verifyUserToken(request);
  if (!tokenResult.ok) {
    return tokenResult;
  }
  
  const { uid, email: tokenEmail } = tokenResult;

  // ── Step 3: Email fast-path ──────────────────────────────────────────────
  if (tokenEmail === ADMIN_EMAIL && ADMIN_EMAIL !== '') {
    logger.info({ event_type: 'admin_verify_ok', route, uid, method: 'email_fastpath' });
    return { ok: true, uid, email: tokenEmail };
  }

  // ── Step 4: Check Supabase profile for admin role ────────────────────────
  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email')
    .eq('id', uid)
    .single();

  logger.info({
    event_type: 'admin_verify_db_query',
    route, uid,
    profile_found: !!profile,
    profile_role: profile?.role ?? null,
    profile_email: profile?.email ?? null,
    db_error: profileError?.message ?? null,
  });

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      // No profile row yet — auto-create it and check email
      logger.warn({ event_type: 'admin_verify_fail', route, uid, reason: 'no_profile' });
      return {
        ok: false,
        status: 403,
        error: 'Account not found in database. Please sign out and sign back in to create your profile.',
        detail: `No profile row for uid=${uid}`,
      };
    }
    logger.error({ event_type: 'admin_verify_fail', route, uid, reason: 'db_error', detail: profileError.message });
    return {
      ok: false,
      status: 403,
      error: 'Database error verifying admin status. Please try again.',
      detail: profileError.message,
    };
  }

  if (!profile) {
    return { ok: false, status: 403, error: 'Account not found in database.', detail: `uid=${uid}` };
  }

  const isAdmin = profile.role === 'admin' || (profile.email === ADMIN_EMAIL && ADMIN_EMAIL !== '');
  if (!isAdmin) {
    logger.warn({
      event_type: 'admin_verify_fail', route, uid, reason: 'not_admin',
      profile_role: profile.role, profile_email: profile.email,
    });
    return {
      ok: false,
      status: 403,
      error: 'Account does not have admin privileges.',
      detail: `role="${profile.role}", email="${profile.email}"`,
    };
  }

  logger.info({ event_type: 'admin_verify_ok', route, uid, method: 'db_role' });
  return { ok: true, uid, email: profile.email ?? tokenEmail ?? '' };
}
