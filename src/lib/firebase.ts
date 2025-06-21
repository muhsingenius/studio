// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, enableIndexedDbPersistence, collection } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

// Load Firebase configuration from environment variables
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Declare Firebase services
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

// Only initialize Firebase in the browser
if (typeof window !== 'undefined') {
  console.log("Initializing Firebase with config:", {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? "<REDACTED>" : "MISSING_API_KEY",
    projectId: firebaseConfig.projectId || "MISSING_PROJECT_ID"
  });

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Missing Firebase API key or Project ID in environment variables.");
  }

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized.");
    } catch (error: any) {
      console.error("Failed to initialize Firebase app:", error.message, error);
      app = null;
    }
  } else {
    app = getApp();
    console.log("Reusing existing Firebase app instance.");
  }

  if (app) {
    try {
      auth = getAuth(app);
      console.log("Firebase Auth initialized.");
    } catch (error: any) {
      console.error("Auth initialization failed:", error.message, error);
      auth = null;
    }

    try {
      db = getFirestore(app);
      console.log("Firestore initialized.");
      
      // 🔁 Validate Firestore by calling `collection(db, "__test__")`
      try {
        const test = collection(db, "__test__");
        if (!test) throw new Error("collection() returned undefined/null");
        console.log("Firestore instance is valid.");
      } catch (collectionTestError) {
        console.error("Firestore instance test failed:", collectionTestError);
        db = null;
      }

      // Enable offline persistence
      if (db && typeof window !== "undefined") {
        enableIndexedDbPersistence(db).then(() => {
          console.log("Firestore offline persistence enabled.");
        }).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Offline persistence failed: multiple tabs open.");
          } else if (err.code === 'unimplemented') {
            console.warn("Offline persistence not supported by browser.");
          } else {
            console.error("Failed to enable offline persistence:", err);
          }
        });
      }

    } catch (error: any) {
      console.error("Failed to initialize Firestore:", error.message, error);
      db = null;
    }

    try {
      functions = getFunctions(app);
      console.log("Firebase Functions initialized.");
    } catch (error: any) {
      console.error("Functions initialization failed:", error.message, error);
      functions = null;
    }
  } else {
    console.error("Firebase app is null — skipping Auth, Firestore, and Functions initialization.");
  }
}

// Export initialized services
export { app, auth, db, functions };
export type { FirebaseApp, Auth, Firestore, Functions };
