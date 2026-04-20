/* ============================================================
   firebase-init.js — Configuration Firebase v1.3
   Ajout Firebase Storage pour les photos
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyArX1U5M-AmS5TlKU2KbvbsYbKrSZHNKno",
  authDomain: "ruchers-vl-donnes.firebaseapp.com",
  projectId: "ruchers-vl-donnes",
  storageBucket: "ruchers-vl-donnes.firebasestorage.app",
  messagingSenderId: "570332949303",
  appId: "1:570332949303:web:62c7e26712032718e6c8b2"
};

firebase.initializeApp(firebaseConfig);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistance : plusieurs onglets ouverts.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistance : non supportée.');
    }
  });

console.log('🔥 Firebase v1.3 initialisé —', firebaseConfig.projectId);
