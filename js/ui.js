/* ============================================================
   ui.js — Interface utilisateur générique
   v1.2 — Ajout mode rapide/complet + compte rendu

   Ce fichier gère :
   - La navigation entre onglets
   - L'ouverture/fermeture des modals
   - Le toast (notification temporaire)
   - La topbar (titre dynamique)
   - Les quick buttons, steppers
   - La méthode de sélection des ruches
   - Le mode visite rapide / complet
   - Le banner iOS "Ajouter à l'écran d'accueil"
   ============================================================ */


/* ------------------------------------------------------------
   TOPBAR — Mise à jour dynamique
   ------------------------------------------------------------ */

/** Mettre à jour le titre et sous-titre de la topbar */
function updateTopbar() {
  const totalRuches = getTotalRuches();
  document.getElementById('topbar-title').textContent = 'Ruchers VL';
  document.getElementById('topbar-sub').textContent   = `${RUCHERS.length} sites · ${totalRuches} ruches`;

  // Mettre à jour aussi l'entête du registre
  const regInfo = document.getElementById('reg-header-info');
  if (regInfo) {
    regInfo.innerHTML = `${PARAMS.nom} · NAPI ${PARAMS.napi}<br>Conforme à l'arrêté du 11 août 1994`;
  }
}


/* ------------------------------------------------------------
   NAVIGATION — Onglets
   ------------------------------------------------------------ */

/**
 * Afficher un onglet et mettre à jour la nav
 * @param {string} name - ID de l'onglet (ex. 'dashboard', 'journal')
 * @param {Element} el  - bouton nav cliqué
 */
function showTab(name, el) {
  // Désactiver tous les onglets et boutons nav
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  // Activer l'onglet et le bouton demandé
  document.getElementById('tab-' + name).classList.add('active');
  if (el) el.classList.add('active');

  currentTab = name;

  // Remonter en haut (sauf la carte qui garde sa position)
  if (name !== 'carte') {
    document.getElementById('scroll-area').scrollTop = 0;
  }

  // Afficher/masquer le FAB selon l'onglet
  const fab = document.getElementById('fab');
  fab.classList.toggle('hidden', !['journal', 'sanitaire', 'ruchers'].includes(name));

  // Fermer les sous-sections "Plus" si on change d'onglet
  if (name !== 'plus') {
    document.querySelectorAll('[id^=sub-]').forEach(s => s.style.display = 'none');
  }

  // Charger les valeurs actuelles dans les paramètres si on va dans "plus"
  if (name === 'plus') {
    loadParamsUI();
  }
}

/**
 * Afficher une sous-section dans l'onglet "Plus"
 * @param {string} id - ID de la sous-section (ex. 'sub-params')
 */
function showSubSection(id) {
  document.querySelectorAll('[id^=sub-]').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.getElementById('scroll-area').scrollTop = 300;
}


/* ------------------------------------------------------------
   FAB — Bouton flottant +
   ------------------------------------------------------------ */

/** Ouvrir la modal correspondant à l'onglet actif */
function openFab() {
  if (currentTab === 'journal') {
    // Réinitialiser le formulaire et ouvrir
    resetJournalForm();
    editingJournalIdx = null;
    openModal('modal-journal');
  }
  if (currentTab === 'sanitaire')  openModal('modal-sanitaire');
  if (currentTab === 'ruchers')    openModal('modal-rucher');
}


/* ------------------------------------------------------------
   MODALS
   ------------------------------------------------------------ */

/**
 * Ouvrir une modal et pré-remplir la date du jour si vide
 * @param {string} id - ID de la modal-overlay
 */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.querySelector('#' + id + ' input[type=date]');
  if (dateInput && !dateInput.value) dateInput.value = today;
}

/**
 * Fermer une modal
 * @param {string} id - ID de la modal-overlay
 */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Fermer une modal en cliquant sur le fond sombre
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});


/* ------------------------------------------------------------
   TOAST — Notification temporaire
   ------------------------------------------------------------ */

let toastTimer = null;

/**
 * Afficher un message toast pendant 2.6 secondes
 * @param {string} msg - Message à afficher (peut contenir des emojis)
 */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');

  // Réinitialiser le timer si un toast est déjà affiché
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}


/* ------------------------------------------------------------
   FORMULAIRES — Helpers génériques
   ------------------------------------------------------------ */

/**
 * Sélectionner un bouton rapide (qbtn) dans un groupe
 * Met à jour l'input hidden associé
 * @param {string} groupId  - ID du div .quick-btns
 * @param {string} value    - Valeur à stocker
 * @param {Element} btn     - Bouton cliqué
 */
function selectQuick(groupId, value, btn) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.qbtn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // L'input hidden a le même ID sans le suffixe "-btns"
  const hiddenId = groupId.replace('-btns', '');
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = value;
}

/**
 * Incrémenter/décrémenter un compteur (steppers cadres, ruchettes)
 * @param {string} id    - ID de l'élément affichant la valeur
 * @param {number} delta - +1 ou -1
 * @param {number} max   - Valeur maximale (défaut : 10)
 */
function stepCadre(id, delta, max = 10) {
  const el = document.getElementById(id);
  let val = parseInt(el.textContent) || 0;
  val = Math.max(0, Math.min(max, val + delta));
  el.textContent = val;
}


/* ------------------------------------------------------------
   MODE VISITE — Rapide / Complet
   ------------------------------------------------------------ */

/**
 * Basculer entre le mode rapide et le mode complet
 * @param {string} mode - 'rapide' | 'complet'
 */
function switchVisiteMode(mode) {
  visiteMode = mode;

  // Toggle des boutons
  const btnRapide  = document.getElementById('btn-mode-rapide');
  const btnComplet = document.getElementById('btn-mode-complet');
  if (btnRapide)  btnRapide.classList.toggle('active', mode === 'rapide');
  if (btnComplet) btnComplet.classList.toggle('active', mode === 'complet');

  // Toggle des sections
  const sectionRapide  = document.getElementById('section-mode-rapide');
  const sectionComplet = document.getElementById('section-mode-complet');
  if (sectionRapide)  sectionRapide.style.display  = mode === 'rapide'  ? 'block' : 'none';
  if (sectionComplet) sectionComplet.style.display = mode === 'complet' ? 'block' : 'none';
}

/**
 * Appelé quand on change de rucher dans le formulaire de visite
 * Met à jour les ruches et les rappels zone
 */
function onRucherChange() {
  const rucherId = document.getElementById('j-rucher').value;

  // Mettre à jour le sélecteur de ruches (mode numérique)
  updateRuchesSection();

  // Afficher les rappels de la dernière visite
  updateRappelsZone(rucherId);
}

/**
 * Afficher les rappels de la dernière visite pour le rucher sélectionné
 */
function updateRappelsZone(rucherId) {
  const container = document.getElementById('j-rappels-zone');
  if (!container) return;

  if (!rucherId) {
    container.innerHTML = '';
    return;
  }

  // Trouver la dernière visite pour ce rucher
  const lastVisit = journalData.find(v => v.rucher === rucherId);

  if (!lastVisit) {
    container.innerHTML = `<div style="font-size:0.75rem;color:var(--soft);font-style:italic;padding:8px 0;">
      Aucune visite précédente pour ce rucher.
    </div>`;
    return;
  }

  container.innerHTML = `
    <div style="background:var(--cream);border-radius:10px;padding:10px 12px;margin-top:8px;border:1px solid var(--border);">
      <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:6px;">
        📋 Dernière visite — ${lastVisit.date}
      </div>
      <div style="font-size:0.78rem;color:var(--ink);">
        ${lastVisit.force && lastVisit.force !== '—' ? `<span style="margin-right:8px;">Force: <strong>${lastVisit.force}</strong></span>` : ''}
        ${lastVisit.reine && lastVisit.reine !== '—' ? `<span style="margin-right:8px;">Reine: <strong>${lastVisit.reine}</strong></span>` : ''}
        ${lastVisit.intervention ? `<div style="margin-top:4px;">→ ${lastVisit.intervention}</div>` : ''}
        ${lastVisit.obs ? `<div style="margin-top:4px;font-style:italic;color:var(--mid);">💬 ${lastVisit.obs}</div>` : ''}
      </div>
    </div>`;
}


/* ------------------------------------------------------------
   SÉLECTEUR DE RUCHES — Méthode numérique
   ------------------------------------------------------------ */

/**
 * Générer les boutons de ruches après sélection d'un rucher
 * Appelé quand l'utilisateur change le select "Rucher" dans le formulaire
 */
function updateRuchesSection() {
  const rucherId  = document.getElementById('j-rucher').value;
  const container = document.getElementById('j-ruches-selector');

  if (!rucherId) {
    container.innerHTML = `<div style="font-size:0.78rem;color:var(--soft);font-style:italic;">Sélectionnez d'abord un rucher</div>`;
    return;
  }

  const rucher = getRucherById(rucherId);
  const nb     = rucher?.nb || 20;

  let html = `<button type="button" class="ruche-btn ruche-btn-all" onclick="toggleToutesRuches(this)">Toutes</button>`;
  for (let i = 1; i <= nb; i++) {
    const num = String(i).padStart(2, '0');
    html += `<button type="button" class="ruche-btn" onclick="toggleRuche(this,'${num}')">${num}</button>`;
  }
  container.innerHTML = html;
}

/** Sélectionner/désélectionner une ruche individuelle */
function toggleRuche(btn) {
  const allBtn = document.querySelector('#j-ruches-selector .ruche-btn-all');
  if (allBtn) allBtn.classList.remove('selected');
  btn.classList.toggle('selected');
}

/** Sélectionner/désélectionner "Toutes les ruches" */
function toggleToutesRuches(btn) {
  const container  = document.getElementById('j-ruches-selector');
  const isSelected = btn.classList.contains('selected');
  container.querySelectorAll('.ruche-btn:not(.ruche-btn-all)').forEach(b => b.classList.remove('selected'));
  btn.classList.toggle('selected', !isSelected);
}

/**
 * Récupérer la sélection de ruches sous forme de string
 * Prend en compte la méthode active (numérique ou marquage)
 * @returns {string} ex. "01, 03, 05" | "Toutes" | "Pierre seule (reine vue)"
 */
function getSelectedRuches() {
  if (ruchesMethod === 'marquage') {
    const items = document.querySelectorAll('#ruches-marquage-section .marquage-item.checked');
    if (!items.length) return '—';
    return Array.from(items).map(item => {
      const label = item.dataset.val;
      const input = item.querySelector('.champ-libre-input');
      const desc  = input?.value?.trim();
      return desc ? `${label} (${desc})` : label;
    }).join(', ');
  }

  const allBtn = document.querySelector('#j-ruches-selector .ruche-btn-all');
  if (allBtn?.classList.contains('selected')) return 'Toutes';

  const sel = Array.from(
    document.querySelectorAll('#j-ruches-selector .ruche-btn:not(.ruche-btn-all).selected')
  ).map(b => b.textContent);

  return sel.length ? sel.join(', ') : '—';
}


/* ------------------------------------------------------------
   SÉLECTEUR DE RUCHES — Méthode marquage physique
   ------------------------------------------------------------ */

/**
 * Basculer entre la méthode numérique et la méthode marquage
 * @param {string} method - 'numerique' | 'marquage'
 */
function setRuchesMethod(method) {
  ruchesMethod = method;

  document.getElementById('method-num-btn').classList.toggle('active', method === 'numerique');
  document.getElementById('method-marq-btn').classList.toggle('active', method === 'marquage');

  document.getElementById('ruches-numerique-section').style.display = method === 'numerique' ? 'block' : 'none';
  document.getElementById('ruches-marquage-section').style.display  = method === 'marquage'  ? 'block' : 'none';
}

// Rendre les check-items d'interventions cliquables via délégation d'événement
// Supporte à la fois le mode complet (#j-interventions-grid) et le mode rapide (#j-interv-rapide)
document.addEventListener('click', e => {
  const item = e.target.closest('#j-interventions-grid .check-item, #j-interv-rapide .check-item');
  if (item) item.classList.toggle('checked');
});


/* ------------------------------------------------------------
   LIGHTBOX — Zoom sur les photos
   ------------------------------------------------------------ */

/** Ouvrir la lightbox avec une image */
function openLightbox(src) {
  document.getElementById('lb-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}

/** Fermer la lightbox */
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}


/* ------------------------------------------------------------
   INSTALL BANNER — iOS "Ajouter à l'écran d'accueil"
   S'affiche uniquement sur iPhone/iPad, une seule fois
   ------------------------------------------------------------ */
function showInstallBanner() {
  const isIOS          = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone   = window.navigator.standalone;
  const wasDismissed   = localStorage.getItem('installDismissed');

  if (!isIOS || isStandalone || wasDismissed) return;

  document.getElementById('install-banner-wrap').innerHTML = `
    <div class="install-banner">
      <strong>📲 Ajouter à l'écran d'accueil</strong><br>
      Pour utiliser comme une vraie app iPhone :
      <div class="install-steps">
        <span>1. Appuyez sur <strong>⎋ Partager</strong> en bas de Safari</span>
        <span>2. Choisissez <strong>« Sur l'écran d'accueil »</strong></span>
        <span>3. L'app apparaîtra comme <strong>Ruchers VL</strong> 🐝</span>
      </div>
      <button onclick="
        document.getElementById('install-banner-wrap').innerHTML='';
        localStorage.setItem('installDismissed','1')
      ">Compris ✓</button>
    </div>`;
}
