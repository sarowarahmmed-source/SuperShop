import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBDz5gR_Zb-EOCga3G7pX3N2Rqwef4_hIw",
  authDomain: "supershop-bc036.firebaseapp.com",
  databaseURL: "https://supershop-bc036-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "supershop-bc036",
  storageBucket: "supershop-bc036.firebasestorage.app",
  messagingSenderId: "528401541608",
  appId: "1:528401541608:web:e1b352f95286170de09c5d",
  measurementId: "G-W4D9D0Z20S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { db };