// Import the functions you need from the SDKs you need
// This file initializes the Firebase app and exports the auth and db objects.
// It also sets up the Firebase configuration for the app.
// The configuration includes the API key, auth domain, project ID, storage bucket, messaging sender ID, and app ID.
// The app is initialized using the initializeApp function and the analytics object is created using the getAnalytics function.
// The auth object is created using the getAuth function and the db object is created using the getFirestore function.
// The firebaseConfig object is used to configure the app and the app is initialized using the initializeApp function.
// The analytics object is used to track the app's performance and the auth and db objects are used to authenticate and store data in the database.
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET, // Correct value from .env
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Analytics only when supported (avoids runtime errors in some envs)
analyticsIsSupported().then((supported) => {
  if (supported && firebaseConfig.measurementId) {
    try { getAnalytics(app); } catch (e) { /* noop */ }
  }
});

// Initialize App Check (required if Firestore has App Check enforcement)
try {
  const siteKey = process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (_) { /* noop */ }
export const auth = getAuth(app);
export const db = getFirestore(app);