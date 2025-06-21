
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore"; // Import enableIndexedDbPersistence
import { getFunctions, type Functions } from "firebase/functions";

// Your web app's Firebase configuration
// IMPORTANT: These values are read from the .env file.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

if (typeof window !== 'undefined') {
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
    db = getFirestore(app);
    // A simple check to see if the Firestore object is valid
    if (typeof db.collection !== 'function') {
        throw new Error("Firestore object is not valid. The 'collection' method is missing.");
    }
    console.log("Firestore service initialized successfully.");
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log("Firestore offline persistence enabled.");
        })
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Firestore persistence failed (failed-precondition). This can happen if you have multiple tabs open.");
          } else if (err.code === 'unimplemented') {
            console.warn("Firestore persistence failed (unimplemented). The current browser does not support this feature.");
          } else {
            console.error("Firestore persistence failed with error: ", err);
          }
        });
    }
  } catch (firestoreError: any) {
    console.error("--------------------------------------------------------------------");
    console.error("CRITICAL FIRESTORE INITIALIZATION FAILED");
    console.error("MESSAGE:", firestoreError.message);
    console.error("This means the app cannot connect to the database.");
    console.error("TROUBLESHOOTING STEPS:");
    console.error("1. Go to your login page. A diagnostic panel is displayed at the top.");
    console.error("2. Check if the 'Firebase Project ID' shown in the panel is CORRECT.");
    console.error("3. If it's missing or wrong, correct the NEXT_PUBLIC_FIREBASE_PROJECT_ID variable in your .env file and RESTART your server.");
    console.error("4. If the ID is correct, ensure you have CREATED a Firestore Database in your Firebase project console for the correct region.");
    console.error("--------------------------------------------------------------------");
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
