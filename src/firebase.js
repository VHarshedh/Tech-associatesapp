// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDgvL-gAdPyxE-fN5SHHRQU-_VDO1hqTj0",
  authDomain: "cool-clarity-464716-v5.firebaseapp.com",
  projectId: "cool-clarity-464716-v5",
  storageBucket: "cool-clarity-464716-v5.firebasestorage.app",
  messagingSenderId: "69998850144",
  appId: "1:69998850144:web:92b0b7d82ce5cf7b1f9305",
  measurementId: "G-86MFJR4G4D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);