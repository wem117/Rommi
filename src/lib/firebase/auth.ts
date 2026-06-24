import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";

import { auth, googleProvider } from "@/lib/firebase/client";

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential;
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function sendResetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function sendCurrentUserVerificationEmail() {
  if (!auth.currentUser) throw new Error("No signed-in user");
  return sendEmailVerification(auth.currentUser);
}

export async function signOutClient() {
  await firebaseSignOut(auth);
  await fetch("/api/auth/session", { method: "DELETE" });
}
