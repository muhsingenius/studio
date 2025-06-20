
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

// Log the project ID to the console for debugging purposes
if (typeof window !== 'undefined') { // Ensure this only runs on the client-side
  console.log("Firebase initializing with Config:", JSON.stringify(firebaseConfig, (key, value) => key === "apiKey" ? "<REDACTED>" : value, 2));
  if (!firebaseConfig.projectId) {
    console.error(
      "Firebase Project ID is MISSING in firebaseConfig. " +
      "This means NEXT_PUBLIC_FIREBASE_PROJECT_ID is likely undefined or not set in your .env file or not being picked up. " +
      "Firebase cannot initialize without a Project ID."
    );
  }
  if (!firebaseConfig.apiKey) {
    console.error(
      "Firebase API Key is MISSING in firebaseConfig. " +
      "This means NEXT_PUBLIC_FIREBASE_API_KEY is likely undefined or not set in your .env file or not being picked up. " +
      "Firebase may not initialize correctly without an API Key."
    );
  }
}


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore | null = null; // Initialize db as null
let functions: Functions | null = null; // Initialize functions as null

if (!getApps().length) {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.error("CRITICAL: Firebase initialization cannot proceed due to missing projectId or apiKey in firebaseConfig. Please check your .env file and ensure the Next.js server was restarted after changes.");
  }
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
  } catch (initError: any) {
    console.error("CRITICAL: Error during firebase.initializeApp(firebaseConfig):", initError.message, initError.code, initError);
    console.error("This usually means the firebaseConfig object itself is malformed or missing essential fields BEFORE being passed to initializeApp. Double check environment variables and their loading.");
    // @ts-ignore // Allow assigning to app even if it's potentially uninitialized due to error
    app = null;
  }
} else {
  app = getApp();
  console.log("Firebase app re-used existing instance.");
}

if (app) { // Only proceed if app initialization was successful (or app was reused)
  auth = getAuth(app);
  try {
    db = getFirestore(app);
    console.log("Firestore service initialized via getFirestore(app). Firestore instance:", db);
    if (!db || typeof db.collection !== 'function') {
      console.error(
        "CRITICAL: Firestore instance (db) appears to be invalid AFTER getFirestore() call. " +
        "This strongly suggests a problem with the Firebase configuration (check .env variables like NEXT_PUBLIC_FIREBASE_PROJECT_ID), " +
        "that Firestore service is not properly enabled for your project in the Firebase console, " +
        "OR a network issue/Firebase service problem is preventing proper initialization. " +
        "Please verify ALL NEXT_PUBLIC_FIREBASE_... variables, check your Firebase project setup in the console, and ensure your network connection to Firebase services is stable."
      );
    } else {
        console.log("Firestore instance (db) seems valid (has a collection method).");
    }
  } catch (firestoreError: any) {
    console.error("CRITICAL: Error explicitly thrown by getFirestore(app):", firestoreError.message, firestoreError.code, firestoreError);
    console.error(
        "This could be due to issues like Firestore not being enabled in your Firebase project console, " +
        "incorrect Firebase project configuration (check .env variables), " +
        "or network issues preventing SDK initialization. Please verify your Firebase project setup and network connectivity."
    );
    db = null;
  }


  // Enable Firestore persistence
  if (typeof window !== 'undefined' && db && typeof db.collection === 'function') {
    enableIndexedDbPersistence(db)
      .then(() => {
        console.log("Firestore offline persistence enabled.");
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore persistence failed (failed-precondition). This can happen if you have multiple tabs open or if persistence is already enabled. The app can still function but might not have full offline capabilities.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore persistence failed (unimplemented). The current browser does not support all of the features required to enable persistence.");
        } else {
          console.error("Firestore persistence failed with error: ", err);
        }
      });
  } else if (typeof window !== 'undefined' && (!db || typeof db.collection !== 'function')) {
      console.warn("Firestore offline persistence SKIPPED because the Firestore instance (db) is invalid or not initialized.");
  }


  try {
    functions = getFunctions(app);
    console.log("Firebase Functions service initialized.");
  } catch (functionsError: any) {
    console.error("Error initializing Firebase Functions:", functionsError.message, functionsError.code, functionsError);
    functions = null;
  }
} else {
    console.error("CRITICAL: Firebase app object is null, cannot initialize Auth, Firestore, or Functions. Check initializeApp errors above.");
    // @ts-ignore
    auth = null; // Explicitly nullify if app is null
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
