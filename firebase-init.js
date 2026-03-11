/* ============================================================
   firebase-init.js — Configuration et initialisation Firebase

   Ce fichier gère :
   - La configuration Firebase (clés du projet)
   - L'initialisation de l'app Firebase
   - L'export des instances Auth et Firestore

   ⚠️  Ce fichier doit être chargé APRÈS les scripts CDN Firebase
       et AVANT tous les autres fichiers JS de l'app.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyArX1U5M-AmS5TlKU2KbvbsYbKrSZHNKno",
  authDomain: "ruchers-vl-donnes.firebaseapp.com",
  projectId: "ruchers-vl-donnes",
  storageBucket: "ruchers-vl-donnes.firebasestorage.app",
  messagingSenderId: "570332949303",
  appId: "1:570332949303:web:62c7e26712032718e6c8b2"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Instances globales
const auth = firebase.auth();
const db   = firebase.firestore();

// Activer la persistance offline (les données restent dispo hors connexion)
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistance : plusieurs onglets ouverts, un seul peut être offline.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistance : non supportée par ce navigateur.');
    }
  });

console.log('🔥 Firebase initialisé —', firebaseConfig.projectId);
