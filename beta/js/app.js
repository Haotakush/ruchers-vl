/* ============================================================
   app.js — Point d'entrée v1.3
   Suppression export/import JSON (Firebase gère tout)
   ============================================================ */

let _appInitialized = false;

function initApp() {
  if (_appInitialized) {
    // auth.onAuthStateChanged peut se déclencher plusieurs fois (refresh token,
    // reconnexion réseau). Si l'app est déjà initialisée, on se contente
    // de relancer les listeners (startRealtimeListeners gère déjà les doublons).
    console.log('🔄 Re-auth détectée — relance listeners uniquement');
    startRealtimeListeners();
    return;
  }
  _appInitialized = true;
  console.log('🐝 Initialisation Ruchers VL v1.3…');
  renderAllSelects();
  renderJournal();
  renderSanitaire();
  renderRuchers();
  renderCalendrier();
  updateDashboard();
  drawChartVisites();
  updateTopbar();
  hydrateIcons();
  showTab('dashboard', null);   // affiche le bouton « Nouvelle visite » dès l'ouverture

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('j-date').value = today;
  document.getElementById('s-date').value = today;

  showInstallBanner();
  updateLogoutButton();
  startRealtimeListeners();
  updateSyncIndicator();

  // Afficher le tutoriel au premier lancement si NAPI vide
  setTimeout(() => {
    const napi = (PARAMS && PARAMS.napi) ? PARAMS.napi.trim() : '';
    if (!napi) openTutoriel();
  }, 800);

  console.log('✅ App v1.3 initialisée !');
}

/* Appelé par firebase-auth.js lors de la déconnexion */
function resetAppState() {
  _appInitialized = false;
  console.log('🔄 État app réinitialisé (déconnexion)');
}

function updateLogoutButton() {
  const logoutWrap = document.getElementById('logout-wrap');
  if (logoutWrap && currentUser) {
    logoutWrap.innerHTML = `
      <button class="menu-row menu-danger" onclick="doLogout()">
        <span class="menu-ico ico-red">${icon('logout', 18)}</span>
        <span class="menu-label">Se déconnecter</span>
        <span class="menu-hint">${esc(currentUser.email || '')}</span>
      </button>`;
  }
  updateProfileCard();
}

/* Carte profil du menu Plus (nom, NAPI, e-mail) */
function updateProfileCard() {
  const nameEl = document.getElementById('profile-name');
  if (!nameEl) return;
  const nom  = (PARAMS && PARAMS.nom || '').trim();
  const napi = (PARAMS && PARAMS.napi || '').trim();
  const mail = currentUser && currentUser.email || '';
  nameEl.textContent = nom || 'Mon exploitation';
  document.getElementById('profile-meta').textContent =
    [napi ? `NAPI ${napi}` : 'NAPI à renseigner', mail].filter(Boolean).join(' · ');
  const initials = (nom || 'Ruchers VL').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('profile-initials').textContent = initials || 'RV';
}

/* ============================================================
   TUTORIEL — Carousel de démarrage
   ============================================================ */
let _tutoSlide = 0;
const _TUTO_TOTAL = 6;

function openTutoriel() {
  _tutoSlide = 0;
  _tutoGoTo(0);
  document.getElementById('modal-tutoriel').style.display = 'flex';
}

function closeTutoriel(goToParams) {
  document.getElementById('modal-tutoriel').style.display = 'none';
  if (goToParams) {
    showTab('params', null);
    loadParamsUI();
  }
}

function tutoNav(dir) {
  const next = _tutoSlide + dir;
  if (next < 0 || next >= _TUTO_TOTAL) return;
  _tutoGoTo(next);
}

function _tutoGoTo(idx) {
  // Masquer toutes les slides
  document.querySelectorAll('.tuto-slide').forEach(s => s.style.display = 'none');
  // Afficher la slide cible
  const target = document.querySelector(`.tuto-slide[data-slide="${idx}"]`);
  if (target) target.style.display = 'flex';

  // Mettre à jour les dots
  document.querySelectorAll('.tuto-dot').forEach((d, i) => {
    d.classList.toggle('tuto-dot-active', i === idx);
  });

  // Bouton Précédent
  const prev = document.getElementById('tuto-btn-prev');
  prev.style.display = idx > 0 ? 'block' : 'none';

  // Bouton Suivant / masqué sur dernière slide (remplacé par le CTA dans la slide)
  const next = document.getElementById('tuto-btn-next');
  const skip = document.getElementById('tuto-btn-skip');
  if (idx === _TUTO_TOTAL - 1) {
    next.style.display = 'none';
    skip.textContent = 'Fermer';
  } else {
    next.style.display = 'block';
    skip.textContent = 'Passer';
  }

  _tutoSlide = idx;
}
