
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore"; // Import enableIndexedDbPersistence
import { getFunctions, type Functions } from "firebase/functions";

// Your web app's Firebase configuration
// IMPORTANT: These values are read from the .env file.
// Make sure you have a .env file in the root of your project
// and that it contains your actual Firebase project credentials.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | null = null; // Initialize app as null
let auth: Auth | null = null; // Initialize auth as null
let db: Firestore | null = null;
let functions: Functions | null = null;

if (typeof window !== 'undefined') { // Ensure this only runs on the client-side
  console.log("Attempting Firebase initialization with effective config:", JSON.stringify({
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? "<REDACTED>" : "MISSING_API_KEY",
    projectId: firebaseConfig.projectId || "MISSING_PROJECT_ID"
  }, null, 2));

  if (!firebaseConfig.projectId) {
    console.error(
      "CRITICAL_ENV_ERROR: Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is MISSING or undefined. Firebase cannot initialize."
    );
  }
  if (!firebaseConfig.apiKey) {
    console.error(
      "CRITICAL_ENV_ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or undefined. Firebase initialization will likely fail."
    );
  }
}

if (!getApps().length) {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.error("CRITICAL_INIT_STOP: Firebase initialization halted due to missing projectId or apiKey in firebaseConfig. Please check your .env file and ensure the Next.js server was restarted after changes.");
  } else {
    try {
      console.log("Calling initializeApp(firebaseConfig)...");
      app = initializeApp(firebaseConfig);
      console.log("Firebase app object initialized successfully:", app ? "Instance created" : "Instance IS NULL");
    } catch (initError: any) {
      console.error("CRITICAL_INIT_ERROR: Error during firebase.initializeApp(firebaseConfig):", initError.message, initError.code, initError);
      console.error("This usually means the firebaseConfig object itself is malformed or missing essential fields BEFORE being passed to initializeApp. Double check environment variables and their loading. Full config used:", JSON.stringify({ ...firebaseConfig, apiKey: "<REDACTED>" }, null, 2));
      app = null; // Ensure app is null if initialization fails
    }
  }
} else {
  app = getApp();
  console.log("Firebase app re-used existing instance:", app ? "Instance retrieved" : "Instance IS NULL after getApp()");
}

if (app) {
  try {
    auth = getAuth(app);
    console.log("Firebase Auth service initialized.");
  } catch (authError: any) {
    console.error("Error initializing Firebase Auth:", authError.message, authError.code, authError);
    auth = null;
  }

  try {
    console.log("Calling getFirestore(app)...");
    db = getFirestore(app);
    console.log("Firestore service initialized via getFirestore(app). Firestore instance:", db ? "Instance created" : "Instance IS NULL");
    if (!db || typeof db.collection !== 'function') {
      console.error(
        "CRITICAL: Firestore instance (db) appears to be invalid AFTER getFirestore() call. " +
        "This strongly suggests a problem with the Firebase configuration (check .env variables like NEXT_PUBLIC_FIREBASE_PROJECT_ID), " +
        "that Firestore service is not properly enabled for your project in the Firebase console, " +
        "OR a network issue/Firebase service problem is preventing proper initialization. " +
        "Please verify ALL NEXT_PUBLIC_FIREBASE_... variables, check your Firebase project setup in the console, and ensure your network connection to Firebase services is stable."
      );
      db = null; // Ensure db is null if invalid
    } else {
      console.log("Firestore instance (db) seems valid (has a collection method).");
      if (typeof window !== 'undefined') {
        enableIndexedDbPersistence(db)
          .then(() => {
            console.log("Firestore offline persistence enabled.");
          })
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn("Firestore persistence failed (failed-precondition). This can happen if you have multiple tabs open or if persistence is already enabled.");
            } else if (err.code === 'unimplemented') {
              console.warn("Firestore persistence failed (unimplemented). The current browser does not support all of the features required to enable persistence.");
            } else {
              console.error("Firestore persistence failed with error: ", err);
            }
          });
      }
    }
  } catch (firestoreError: any) {
    console.error("CRITICAL_FIRESTORE_INIT_ERROR: Error explicitly thrown by getFirestore(app):", firestoreError.message, firestoreError.code, firestoreError);
    console.error(
        "This could be due to issues like Firestore not being enabled in your Firebase project console, " +
        "incorrect Firebase project configuration (check .env variables), " +
        "or network issues preventing SDK initialization. Please verify your Firebase project setup and network connectivity."
    );
    db = null;
  }

  try {
    functions = getFunctions(app);
    console.log("Firebase Functions service initialized.");
  } catch (functionsError: any) {
    console.error("Error initializing Firebase Functions:", functionsError.message, functionsError.code, functionsError);
    functions = null;
  }
} else {
    console.error("CRITICAL_APP_NULL: Firebase app object is null or invalid, cannot initialize Auth, Firestore, or Functions. Check initializeApp errors above.");
    auth = null;
    db = null;
    functions = null;
}

export { app, auth, db, functions };

/*
Instructions for setting up Firebase environment variables:

1. Create a file named `.env` in the root of your project (if it doesn't exist).
2. Add the following lines to `.env`, replacing the placeholder values with your actual Firebase project credentials:

NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"

3. Make sure `.env` is included in your `.gitignore` file if it contains sensitive real credentials
   and you plan to commit this project to a public repository. For Firebase Studio, this file will be managed.
4. **IMPORTANT: After creating or modifying the .env file, you MUST restart your Next.js development server for the changes to be applied.**

You can find these credentials in your Firebase project settings:
Project Overview -> Project settings (gear icon) -> General tab -> Your apps -> Web app -> Firebase SDK snippet -> Config.
*/
