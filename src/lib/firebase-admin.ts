/**
 * Firebase Admin SDK initialization.
 * Uses a singleton pattern to avoid re-initializing on hot reloads
 * and to work correctly in a serverless environment.
 *
 * The SDK is initialized with Application Default Credentials (ADC) OR
 * with a service account JSON stored in FIREBASE_SERVICE_ACCOUNT_JSON env var.
 *
 * For Vercel deployments, set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON
 * of the service account key file (as a single-line JSON string).
 */
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as {
        project_id: string;
        private_key: string;
        client_email: string;
      };
      return initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
          clientEmail: serviceAccount.client_email,
        }),
      });
    } catch (e) {
      console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
    }
  }

  // Fallback: use FIREBASE_PROJECT_ID with a client-side public key approach.
  // This lets us verify tokens using the Firebase project ID alone via the
  // Firebase public key endpoint (no service account needed, but less secure).
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID env var. Cannot initialize Firebase Admin.');
  }

  // Initialize without credentials — only token verification works in this mode
  // using Firebase's published public keys.
  return initializeApp({ projectId });
}

const adminApp = getAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
