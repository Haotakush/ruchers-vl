/* ============================================================
   firebase-auth.js — Authentification email/mot de passe

   Ce fichier gère :
   - L'écran de connexion (afficher/masquer)
   - La connexion / déconnexion
   - L'écoute du changement d'état d'authentification
   - Le lancement de l'app après connexion

   ⚠️  Dépend de firebase-init.js (variables auth, db)
   ============================================================ */


/* ------------------------------------------------------------
   ÉTAT
   ------------------------------------------------------------ */
let currentUser = null;


/* ------------------------------------------------------------
   UI — Afficher / Masquer l'écran de login
   ------------------------------------------------------------ */

/** Afficher l'écran de connexion et masquer l'app */
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

/** Masquer l'écran de connexion et afficher l'app */
function hideLoginScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
}


/* ------------------------------------------------------------
   CONNEXION
   ------------------------------------------------------------ */

/** Tenter la connexion avec email/mot de passe */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');

  errEl.textContent = '';

  if (!email || !pass) {
    errEl.textContent = 'Email et mot de passe requis.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Connexion…';

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    // Le onAuthStateChanged ci-dessous prendra le relais
  } catch (err) {
    console.error('Erreur login:', err);
    const messages = {
      'auth/user-not-found':       'Aucun compte avec cet email.',
      'auth/wrong-password':       'Mot de passe incorrect.',
      'auth/invalid-email':        'Adresse email invalide.',
      'auth/too-many-requests':    'Trop de tentatives. Réessayez plus tard.',
      'auth/invalid-credential':   'Identifiants invalides.',
    };
    errEl.textContent = messages[err.code] || `Erreur : ${err.message}`;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Se connecter';
  }
}

/** Permettre la connexion avec Entrée */
function handleLoginKeypress(e) {
  if (e.key === 'Enter') doLogin();
}


/* ------------------------------------------------------------
   DÉCONNEXION
   ------------------------------------------------------------ */

/** Déconnecter l'utilisateur */
async function doLogout() {
  try {
    await auth.signOut();
    // Le onAuthStateChanged prendra le relais
  } catch (err) {
    console.error('Erreur logout:', err);
    toast('❌ Erreur de déconnexion');
  }
}


/* ------------------------------------------------------------
   ÉCOUTE DU CHANGEMENT D'AUTH
   C'est le cœur : quand l'utilisateur se connecte ou se déconnecte,
   cette fonction est appelée automatiquement par Firebase.
   ------------------------------------------------------------ */

auth.onAuthStateChanged(async (user) => {
  if (user) {
    // ✅ Connecté
    currentUser = user;
    console.log('👤 Connecté:', user.email);

    hideLoginScreen();

    // Charger les données depuis Firestore et démarrer l'app
    await loadAllDataFromFirestore();
    initApp();

  } else {
    // ❌ Déconnecté
    currentUser = null;
    console.log('👤 Déconnecté');
    showLoginScreen();
  }
});
