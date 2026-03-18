import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCF1JAr-Jcne8bSVX-wcAhU5h_pEGkg_nw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ttok-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ttok-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ttok-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "807744420623",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:807744420623:web:347a88bfcc4b4e7bacdc7a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-K91CMMMMD8",
};

const isFirebaseConfigured = true;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("[Firebase] Initialized successfully");
} catch (error) {
  console.warn("[Firebase] Initialization failed:", error);
}

export { app, db, auth, isFirebaseConfigured };
