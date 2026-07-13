/**
 * Firebase Admin SDK — server-side singleton.
 *
 * Credential resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — full service account JSON as a string (recommended)
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — individual vars
 *   3. NEXT_PUBLIC_FIREBASE_PROJECT_ID alone — project-ID-only mode (token verification
 *      still works via Firebase's public keys, but no other Admin features)
 *
 * If none of the above resolve to a usable credential, the module throws at startup
 * with a clear message rather than silently producing a broken client.
 */
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  // Singleton — return existing app on hot reloads / repeated imports
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // ── Option 1: Full service account JSON blob ───────────────────────────────
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let serviceAccount: { project_id: string; private_key: string; client_email: string };
    try {
      serviceAccount = JSON.parse(serviceAccountJson) as typeof serviceAccount;
    } catch (e) {
      throw new Error(
        '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. ' +
        'Paste the entire downloaded service-account key file as the env var value. ' +
        `Parse error: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error(
        '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON parsed successfully but is missing ' +
        'one or more required fields: project_id, private_key, client_email.'
      );
    }

    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        // Vercel sometimes double-escapes newlines in env vars — fix them
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
        clientEmail: serviceAccount.client_email,
      }),
    });
  }

  // ── Option 2: Three separate env vars ─────────────────────────────────────
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey && projectId) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  // ── Option 3: Project-ID only (no service account) ────────────────────────
  // Firebase Admin can still verify ID tokens using its public key endpoint,
  // but other Admin APIs (user management, custom tokens, etc.) will fail.
  if (projectId) {
    console.warn(
      '[firebase-admin] No service account credentials found. ' +
      'Initializing in project-ID-only mode — token verification will work ' +
      'but most other Admin SDK features will not. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID + ' +
      'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) to enable full Admin access.'
    );
    return initializeApp({ projectId });
  }

  // ── No configuration at all — hard failure ─────────────────────────────────
  throw new Error(
    '[firebase-admin] Cannot initialize Firebase Admin SDK: no credentials found. ' +
    'Set one of the following in your environment:\n' +
    '  • FIREBASE_SERVICE_ACCOUNT_JSON  (full service account key JSON)\n' +
    '  • FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
    '  • NEXT_PUBLIC_FIREBASE_PROJECT_ID  (project-ID-only / limited mode)'
  );
}

const adminApp: App = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);
