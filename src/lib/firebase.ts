import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Lazy singleton — only initialized on first use, never at module load time.
// This prevents the Next.js build-time static analysis pass from throwing
// auth/invalid-api-key when NEXT_PUBLIC_* vars aren't available during prerender.
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_API_KEY — check your .env.local or Vercel environment variables."
    );
  }
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export const app = {
  /** Returns the Firebase app instance, initializing it on first call. */
  get instance() { return getFirebaseApp(); },
};

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getFirebaseApp());
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});
