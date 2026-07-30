// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9yufQv6cSrzSqnGaIoUd9qUe8cv2dBDI",
  authDomain: "datagenie-23.firebaseapp.com",
  projectId: "datagenie-23",
  storageBucket: "datagenie-23.firebasestorage.app",
  messagingSenderId: "147820054852",
  appId: "1:147820054852:web:80a8363f6e43928730af11",
  measurementId: "G-YPK3K834MD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();