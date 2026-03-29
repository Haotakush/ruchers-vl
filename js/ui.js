/* ============================================================
   ui.js — Interface utilisateur générique
   v1.3 — Suppression mode visite, indicateur sync, confirm custom
   ============================================================ */

/* ---- TOPBAR ---- */
function updateTopbar() {
  const totalRuches = getTotalRuches();
  document.getElementById('topbar-title').textContent = 'Ruchers VL';
  document.getElementById('topbar-sub').textContent   = `${RUCHERS.length} sites · ${totalRuches} ruches`;
  const regInfo = document.getElementById('reg-header-info');
  if (regInfo) regInfo.innerHTML = `${PARAMS.nom} · NAPI ${PARAMS.napi}<br>Conforme à l'arrêté du 11 août 1994`;
}

/** Mettre à jour l'indicateur de dernière synchronisation */
function updateSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  if (!lastSyncTime) { el.textContent = ''; return; }
  const now     = new Date();
  const diffMin = Math.floor((now - lastSyncTime) / 60000);
  if (diffMin < 1)  el.textContent = '✓ Sync à l\'instant';
  else if (diffMin < 60) el.textContent = `✓ Sync il y a ${diffMin} min`;
  else el.textContent = `✓ Sync ${lastSyncTime.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}`;
}

// Mettre à jour l'indicateur toutes les minutes
setInterval(updateSyncIndicator, 60000);

/* ---- NAVIGATION ---- */
function showTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (el) el.classList.add('active');
  currentTab = name;
  if (name !== 'carte') document.getElementById('scroll-area').scrollTop = 0;
  const fab = document.getElementById('fab');
  fab.classList.toggle('hidden', !['journal', 'sanitaire', 'ruchers'].includes(name));
  if (name !== 'plus') document.querySelectorAll('[id^=sub-]').forEach(s => s.style.display = 'none');
  if (name === 'plus') loadParamsUI();
}

function showSubSection(id) {
  document.querySelectorAll('[id^=sub-]').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.getElementById('scroll-area').scrollTop = 300;
}

/* ---- FAB ---- */
function openFab() {
  if (currentTab === 'journal') {
    editingJournalIdx = null;
    resetJournalForm();
    const modalTitle = document.querySelector('#modal-journal .modal-title');
    if (modalTitle) modalTitle.textContent = '📋 Nouvelle visite';
    openModal('modal-journal');
  }
  if (currentTab === 'sanitaire') {
    editingSanitaireIdx = null;
    resetSanitaireForm();
    const modalTitle = document.querySelector('#modal-sanitaire .modal-title');
    if (modalTitle) modalTitle.textContent = '💊 Nouveau traitement';
    openModal('modal-sanitaire');
  }
  if (currentTab === 'ruchers') openModal('modal-rucher');
}

/* ---- MODALS ---- */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.querySelector('#' + id + ' input[type=date]');
  if (dateInput && !dateInput.value) dateInput.value = today;
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});

/* ---- CONFIRM PERSONNALISÉ ---- */
let confirmCallback = null;

function showConfirm(message, onConfirm) {
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = onConfirm;
  document.getElementById('modal-confirm').classList.add('open');
}

function confirmYes() {
  document.getElementById('modal-confirm').classList.remove('open');
  if (confirmCallback) { confirmCallback(); confirmCallback = null; }
}

function confirmNo() {
  document.getElementById('modal-confirm').classList.remove('open');
  confirmCallback = null;
}

/* ---- TOAST ---- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---- FORMULAIRES ---- */
function selectQuick(groupId, value, btn) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.qbtn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hiddenId = groupId.replace('-btns', '');
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = value;
}

function stepCadre(id, delta, max = 10) {
  const el = document.getElementById(id);
  let val = parseInt(el.textContent) || 0;
  val = Math.max(0, Math.min(max, val + delta));
  el.textContent = val;
}

/* ---- SÉLECTION RUCHER DANS VISITE ---- */
function onJournalRucherChange() {
  const rucherId = document.getElementById('j-rucher').value;
  if (!rucherId) {
    document.getElementById('j-nb-ruches').textContent = '0';
    document.getElementById('j-nb-ruchettes').textContent = '0';
    return;
  }
  const rucher = getRucherById(rucherId);
  if (rucher) {
    document.getElementById('j-nb-ruches').textContent = rucher.nb || '0';
  }
  const lastRuchettes = getLastNbRuchettes(rucherId);
  document.getElementById('j-nb-ruchettes').textContent =
    lastRuchettes !== null ? lastRuchettes : '0';
}

/* ---- INTERVENTIONS — check-items cliquables ---- */
document.addEventListener('click', e => {
  const item = e.target.closest('.check-item');
  if (item) item.classList.toggle('checked');
});

/* ---- MARQUAGE — marquage-items cliquables (toggle checked) ---- */
document.addEventListener('click', e => {
  const item = e.target.closest('.marquage-item');
  if (!item) return;
  // Ne pas toggle si on clique sur l'input champ-libre
  if (e.target.classList.contains('champ-libre-input')) return;
  item.classList.toggle('checked');
});

/* ---- LIGHTBOX ---- */
function openLightbox(src) {
  document.getElementById('lb-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

/* ---- INSTALL BANNER iOS ---- */
function showInstallBanner() {
  const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  const wasDismissed = localStorage.getItem('installDismissed');
  if (!isIOS || isStandalone || wasDismissed) return;
  document.getElementById('install-banner-wrap').innerHTML = `
    <div class="install-banner">
      <strong>📲 Ajouter à l'écran d'accueil</strong><br>
      Pour utiliser comme une vraie app iPhone :
      <div class="install-steps">
        <span>1. Appuyez sur <strong>⎋ Partager</strong> en bas de Safari</span>
        <span>2. Choisissez <strong>« Sur l'écran d'accueil »</strong></span>
        <span>3. L'app apparaîtra comme <strong>Ruchers VL</strong> ✓</span>
      </div>
      <button onclick="
        document.getElementById('install-banner-wrap').innerHTML='';
        localStorage.setItem('installDismissed','1')
      ">Compris ✓</button>
    </div>`;
}
