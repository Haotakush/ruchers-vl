/* ============================================================
   firebase-auth.js — Authentification
   v1.3 — Ajout création de compte
   ============================================================ */

let currentUser = null;
let showingCreate = false;

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';
}

/* ---- Toggle formulaire connexion / création ---- */
function toggleCreateAccount() {
  showingCreate = !showingCreate;
  document.getElementById('login-form').style.display    = showingCreate ? 'none' : 'block';
  document.getElementById('create-form').style.display   = showingCreate ? 'block' : 'none';
  document.getElementById('login-error').textContent  = '';
  document.getElementById('create-error').textContent = '';
}

/* ---- Connexion ---- */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Email et mot de passe requis.'; return; }
  btn.disabled = true; btn.textContent = 'Connexion...';
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    const messages = {
      'auth/user-not-found':     'Aucun compte avec cet email.',
      'auth/wrong-password':     'Mot de passe incorrect.',
      'auth/invalid-email':      'Adresse email invalide.',
      'auth/too-many-requests':  'Trop de tentatives. Réessayez plus tard.',
      'auth/invalid-credential': 'Identifiants invalides.',
    };
    errEl.textContent = messages[err.code] || `Erreur : ${err.message}`;
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

function handleLoginKeypress(e) { if (e.key === 'Enter') doLogin(); }

/* ---- Création de compte ---- */
async function doCreateAccount() {
  const email   = document.getElementById('create-email').value.trim();
  const pass    = document.getElementById('create-pass').value;
  const pass2   = document.getElementById('create-pass2').value;
  const errEl   = document.getElementById('create-error');
  const btn     = document.getElementById('create-btn');
  errEl.textContent = '';
  if (!email || !pass || !pass2) { errEl.textContent = 'Tous les champs sont requis.'; return; }
  if (pass.length < 6)           { errEl.textContent = 'Mot de passe minimum 6 caractères.'; return; }
  if (pass !== pass2)            { errEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
  btn.disabled = true; btn.textContent = 'Création...';
  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    // onAuthStateChanged prendra le relais
  } catch (err) {
    const messages = {
      'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
      'auth/invalid-email':        'Adresse email invalide.',
      'auth/weak-password':        'Mot de passe trop faible (min 6 caractères).',
    };
    errEl.textContent = messages[err.code] || `Erreur : ${err.message}`;
  } finally {
    btn.disabled = false; btn.textContent = 'Créer le compte';
  }
}

function handleCreateKeypress(e) { if (e.key === 'Enter') doCreateAccount(); }

/* ---- Déconnexion ---- */
async function doLogout() {
  try { await auth.signOut(); }
  catch (err) { toast('❌ Erreur de déconnexion'); }
}

/* ---- Listener Auth ---- */
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    console.log('👤 Connecté:', user.email);
    hideLoginScreen();
    await loadAllDataFromFirestore();
    initApp();
    if (typeof window._checkWhatsNew === 'function') window._checkWhatsNew();
    if (typeof checkRappelsNotifications === 'function') checkRappelsNotifications();
  } else {
    currentUser = null;
    console.log('👤 Déconnecté');
    // Arrêter les listeners et réinitialiser le flag pour la prochaine connexion
    if (typeof stopRealtimeListeners === 'function') stopRealtimeListeners();
    if (typeof resetAppState === 'function') resetAppState();
    showLoginScreen();
  }
});
