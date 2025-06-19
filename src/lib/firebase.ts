
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore"; // Import enableIndexedDbPersistence
import { getFunctions, type Functions } from "firebase/functions";

// Your web app's Firebase configuration
// IMPORTANT: These values are read from the .env file.
// Make sure you have a .env file in the root of your project
// and that it contains your actual Firebase project credentials.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log the project ID to the console for debugging purposes
if (typeof window !== 'undefined') { // Ensure this only runs on the client-side
  console.log("Firebase initializing with Project ID:", firebaseConfig.projectId);
  if (!firebaseConfig.projectId) {
    console.error("Firebase Project ID is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set.");
  }
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set.");
  }
}


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

// Enable Firestore persistence
if (typeof window !== 'undefined') { // Ensure this only runs on the client-side
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
}

functions = getFunctions(app); // Initialize Cloud Functions

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

You can find these credentials in your Firebase project settings:
Project Overview -> Project settings (gear icon) -> General tab -> Your apps -> Web app -> Firebase SDK snippet -> Config.
*/

