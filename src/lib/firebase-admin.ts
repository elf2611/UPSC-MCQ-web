/**
 * Firebase Admin SDK — lazy singleton for server-side use.
 *
 * IMPORTANT: initialization is LAZY (called on first use, not at import time).
 * This means a missing/malformed env var produces a proper JSON error response
 * from the API route instead of an HTML crash page.
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — full service account JSON as one string
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   3. NEXT_PUBLIC_FIREBASE_PROJECT_ID alone — limited mode (token verify only)
 */
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

// ── Env var validation helper ──────────────────────────────────────────────────
// Returns a list of descriptive problems found (empty = all good).
function checkEnvVars(): string[] {
  const problems: string[] = [];

  const hasJsonBlob = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasIndividual =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY;
  const hasProjectIdOnly = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!hasJsonBlob && !hasIndividual && !hasProjectIdOnly) {
    problems.push(
      'No Firebase Admin credentials found. Set one of:\n' +
      '  • FIREBASE_SERVICE_ACCOUNT_JSON (full service-account key JSON)\n' +
      '  • FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
      '  • NEXT_PUBLIC_FIREBASE_PROJECT_ID (limited / token-verify-only mode)'
    );
  }

  if (process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN')) {
    problems.push(
      'FIREBASE_PRIVATE_KEY appears malformed — it should start with "-----BEGIN RSA PRIVATE KEY-----" ' +
      'or "-----BEGIN PRIVATE KEY-----". Make sure you copied the full key value from the service account JSON.'
    );
  }

  return problems;
}

// ── Lazy singleton ─────────────────────────────────────────────────────────────
let _adminApp: App | null = null;

/**
 * Returns the initialized Firebase Admin App.
 * Throws a descriptive Error (not an HTML crash) if credentials are missing/malformed.
 * Call this INSIDE the request handler, never at module top level.
 */
function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  // Return the already-initialized app if another import beat us here
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  // ── Option 1: Full service account JSON blob ─────────────────────────────
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let sa: { project_id?: string; private_key?: string; client_email?: string };
    try {
      sa = JSON.parse(serviceAccountJson) as typeof sa;
    } catch (e) {
      throw new Error(
        `Server misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. ` +
        `Parse error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    if (!sa.project_id) throw new Error('Server misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is missing field "project_id".');
    if (!sa.client_email) throw new Error('Server misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is missing field "client_email".');
    if (!sa.private_key) throw new Error('Server misconfigured: FIREBASE_SERVICE_ACCOUNT_JSON is missing field "private_key".');

    _adminApp = initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        // Vercel sometimes double-escapes newlines — normalize them
        privateKey: sa.private_key.replace(/\\n/g, '\n'),
      }),
    });
    return _adminApp;
  }

  // ── Option 2: Three separate env vars ────────────────────────────────────
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey && projectId) {
    if (!privateKey.includes('BEGIN')) {
      throw new Error(
        'Server misconfigured: FIREBASE_PRIVATE_KEY appears malformed. ' +
        'It must contain the full PEM key including "-----BEGIN ... KEY-----" headers. ' +
        'On Vercel, paste the exact value from the service-account JSON (with literal \\n characters).'
      );
    }
    _adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    return _adminApp;
  }

  // ── Option 3: Project-ID only (limited mode) ──────────────────────────────
  if (projectId) {
    console.warn(
      '[firebase-admin] No service account credentials — running in project-ID-only mode. ' +
      'Token verification works, but most other Admin SDK features will not.'
    );
    _adminApp = initializeApp({ projectId });
    return _adminApp;
  }

  // ── Nothing at all — hard failure with instructions ───────────────────────
  const envProblems = checkEnvVars();
  throw new Error(
    'Server misconfigured: cannot initialize Firebase Admin SDK.\n' +
    envProblems.join('\n')
  );
}

/**
 * Get the Firebase Admin Auth instance.
 * Always call inside a try/catch — throws if credentials are missing/malformed.
 */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
