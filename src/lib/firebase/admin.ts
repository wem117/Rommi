import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "roommate-kz-local";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const key = privateKey();
const credential = clientEmail && key ? { credential: cert({ projectId, clientEmail, privateKey: key }) } : { projectId };

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp(credential);

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
