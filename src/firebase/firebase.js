import { _measureText } from "chart.js/helpers";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
 
const firebaseConfig = {
  apiKey: "AIzaSyB9h7WLIa2TIhK3BFKciVmBXfIFRdUTHaQ",
  authDomain: "orphancare-project-1f0b9.firebaseapp.com",
  projectId: "orphancare-project-1f0b9",
  storageBucket: "orphancare-project-1f0b9.firebasestorage.app",
  messagingSenderId: "122183816829",
  appId: "1:122183816829:web:ca7d4f9772628306404314",
  measurementId: "G-5Z0YDLP7LE",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
