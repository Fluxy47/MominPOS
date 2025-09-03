// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBuKtHSqt0U0zsVrfQ9yIjipUAQwQKYMns',
  authDomain: 'momin-pos-1af0e.firebaseapp.com',
  projectId: 'momin-pos-1af0e',
  storageBucket: 'momin-pos-1af0e.firebasestorage.app',
  messagingSenderId: '648052431915',
  appId: '1:648052431915:web:9b2599c8eded78e7f61e6e',
  measurementId: 'G-YM1930TYWM'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

export { db, auth }
