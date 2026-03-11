/* ============================================================
   journal.js — Journal des visites apicoles
   v1.2 — Mode rapide/complet + compte rendu + édition visite

   Ce fichier gère :
   - Enregistrement d'une nouvelle visite (mode rapide ou complet)
   - Affichage de la liste des visites
   - Suppression d'une visite
   - Compte rendu (détail) d'une visite
   - Édition d'une visite existante
   - Remise à zéro du formulaire

   🔥 Persistance : Firestore (via firebase-db.js)
   ============================================================ */

let editingJournalIdx = null;
let visiteMode = 'rapide';


/* ------------------------------------------------------------
   ENREGISTREMENT
   ------------------------------------------------------------ */

/** Sauvegarder une nouvelle visite (ou mettre à jour une existante) */
async function saveJournal() {
  const date   = document.getElementById('j-date').value;
  const rucher = document.getElementById('j-rucher').value;

  if (!date || !rucher) {
    toast('⚠️ Date et rucher obligatoires');
    return;
  }

  let entry;

  if (visiteMode === 'rapide') {
    // Mode rapide : interventions rapides + observations
    const interventions = Array.from(
      document.querySelectorAll('#j-interv-rapide .check-item.checked')
    ).map(el => el.dataset.val);

    entry = {
      date,
      rucher,
      ruches:        'Toutes',
      methodeRuches: 'numerique',
      meteo:         '',
      force:         '—',
      reine:         '—',
      cadreCouvain:  0,
      cadreReserve:  0,
      cadreVide:     0,
      nbRuchettes:   0,
      etatRuchettes: '',
      obsRuchettes:  '',
      intervention:  interventions.length ? interventions.join(', ') : 'Visite contrôle',
      interventions,
      obs:           document.getElementById('j-obs-rapide')?.value || '',
      mode:          'rapide',
    };
  } else {
    // Mode complet : tous les champs
    const interventions = Array.from(
      document.querySelectorAll('#j-interventions-grid .check-item.checked')
    ).map(el => el.dataset.val);

    entry = {
      date,
      rucher,
      ruches:        getSelectedRuches(),
      methodeRuches: ruchesMethod,
      meteo:         document.getElementById('j-meteo').value || '',
      force:         document.getElementById('j-force').value || '—',
      reine:         document.getElementById('j-reine').value || '—',
      cadreCouvain:  parseInt(document.getElementById('j-couvain').textContent) || 0,
      cadreReserve:  parseInt(document.getElementById('j-reserve').textContent) || 0,
      cadreVide:     parseInt(document.getElementById('j-vide').textContent)    || 0,
      nbRuchettes:   parseInt(document.getElementById('j-nb-ruchettes').textContent) || 0,
      etatRuchettes: document.getElementById('j-etat-ruchettes').value || '',
      obsRuchettes:  document.getElementById('j-obs-ruchettes').value  || '',
      intervention:  interventions.length ? interventions.join(', ') : 'Visite contrôle',
      interventions,
      obs:           document.getElementById('j-obs').value || '',
      mode:          'complet',
    };
  }

  // Édition ou création ?
  if (editingJournalIdx !== null) {
    // ÉDITION d'une visite existante
    const existing = journalData[editingJournalIdx];
    entry._docId = existing._docId;

    if (entry._docId) {
      await updateJournalInFirestore(entry._docId, entry);
    }

    journalData[editingJournalIdx] = entry;
    editingJournalIdx = null;
    toast('✅ Visite mise à jour !');
  } else {
    // NOUVELLE visite
    const docRef = await addJournalToFirestore(entry);
    if (docRef) {
      entry._docId = docRef.id;
    }
    journalData.unshift(entry);
    toast('✅ Visite enregistrée !');
  }

  // Backup localStorage
  localStorage.setItem('journal', JSON.stringify(journalData));

  // Fermer et rafraîchir
  closeModal('modal-journal');
  resetJournalForm();
  renderJournal();
  updateDashboard();
  drawChartVisites();
}


/* ------------------------------------------------------------
   FORMULAIRE — Remise à zéro
   ------------------------------------------------------------ */

/** Réinitialiser tous les champs du formulaire de visite */
function resetJournalForm() {
  document.getElementById('j-obs').value           = '';
  const obsRapide = document.getElementById('j-obs-rapide');
  if (obsRapide) obsRapide.value = '';
  document.getElementById('j-obs-ruchettes').value = '';
  document.getElementById('j-rucher').value         = '';
  document.getElementById('j-etat-ruchettes').value = '';

  // Remettre le sélecteur de ruches à l'état initial
  document.getElementById('j-ruches-selector').innerHTML =
    `<div style="font-size:0.78rem;color:var(--soft);font-style:italic;">Sélectionnez d'abord un rucher</div>`;

  // Remettre les compteurs à 0
  ['j-couvain', 'j-reserve', 'j-vide', 'j-nb-ruchettes'].forEach(id => {
    document.getElementById(id).textContent = '0';
  });

  // Désélectionner tous les boutons rapides
  document.querySelectorAll(
    '#j-interventions-grid .check-item, #j-interv-rapide .check-item, #ruches-marquage-section .marquage-item'
  ).forEach(el => el.classList.remove('checked'));

  document.querySelectorAll(
    '#j-force-btns .qbtn, #j-reine-btns .qbtn, #j-meteo-btns .qbtn'
  ).forEach(b => b.classList.remove('selected'));

  // Vider les inputs hidden
  ['j-force', 'j-reine', 'j-meteo'].forEach(id => {
    document.getElementById(id).value = '';
  });

  // Vider les champs libres de marquage
  document.querySelectorAll('#ruches-marquage-section .champ-libre-input').forEach(inp => {
    inp.value = '';
  });

  // Vider les rappels zone
  const rappels = document.getElementById('j-rappels-zone');
  if (rappels) rappels.innerHTML = '';

  // Revenir à la méthode numérique
  setRuchesMethod('numerique');

  // Réinitialiser le mode en cours
  editingJournalIdx = null;

  // Mettre à jour le titre de la modal
  const modalTitle = document.querySelector('#modal-journal .modal-title');
  if (modalTitle) modalTitle.textContent = '📋 Nouvelle visite';
}


/* ------------------------------------------------------------
   AFFICHAGE
   ------------------------------------------------------------ */

/** Rendre la liste des visites (avec filtres rucher et force) */
function renderJournal() {
  const list = document.getElementById('journal-list');
  const filterRucher = document.getElementById('flt-rucher').value;
  const filterForce  = document.getElementById('flt-force').value;

  const data = journalData.filter(v =>
    (!filterRucher || v.rucher === filterRucher) &&
    (!filterForce  || v.force  === filterForce)
  );

  if (!data.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <p>Aucune visite.<br>Appuyez sur + pour en ajouter.</p>
      </div>`;
    return;
  }

  list.innerHTML = data.map((v, i) => {
    // Trouver l'index réel dans journalData (pas l'index filtré)
    const realIdx = journalData.indexOf(v);
    return buildJournalCard(v, realIdx);
  }).join('');
}

/**
 * Construire le HTML d'une carte de visite
 * @param {object} v - Objet visite
 * @param {number} idx - Index dans journalData
 * @returns {string} HTML de la carte
 */
function buildJournalCard(v, idx) {
  // Badge couleur force colonie
  const forceCls = {
    'Forte':   'badge-forte',
    'Moyenne': 'badge-moyenne',
    'Faible':  'badge-faible',
  }[v.force] || 'badge-couvain';

  // Couleur et icône reine/ponte
  const reineColor = v.reine === 'PONTE OK' ? '#2E7D32' : v.reine === 'PAS DE PONTE' ? '#C62828' : 'var(--mid)';
  const reineIcon  = v.reine === 'PONTE OK' ? '👑' : v.reine === 'PAS DE PONTE' ? '🚫' : '❓';

  // Badges interventions
  const intv = v.interventions?.length
    ? v.interventions.map(x => `<span class="badge badge-action">${x}</span>`).join('')
    : `<span class="badge badge-couvain">${v.intervention || '—'}</span>`;

  // Résumé cadres (si renseigné)
  const cadres = v.cadreCouvain !== undefined ? `
    <div class="cadres-summary">
      <span>🐝 ${v.cadreCouvain}/10</span>
      <span>🍯 ${v.cadreReserve}/10</span>
      <span>⬜ ${v.cadreVide}/5</span>
    </div>` : '';

  // Badge ruchettes
  const ruchettesBadge = v.nbRuchettes > 0
    ? `<span class="badge" style="background:#FFF3E0;color:#E65100;">🪣 ${v.nbRuchettes} ruchette${v.nbRuchettes > 1 ? 's' : ''}</span>`
    : '';

  // Badge météo
  const meteoIcons = { 'Ensoleillé':'☀️', 'Nuageux':'☁️', 'Pluvieux':'🌧️', 'Venteux':'💨' };
  const meteoBadge = v.meteo
    ? `<span class="meteo-badge">${meteoIcons[v.meteo] || '🌤️'} ${v.meteo}</span>`
    : '';

  // Icône méthode ruches
  const methodeIcon = v.methodeRuches === 'marquage' ? '🪨' : '🔢';

  // Badge mode visite
  const modeBadge = v.mode === 'rapide'
    ? '<span class="badge" style="background:#E3F2FD;color:#1565C0;font-size:0.65rem;">⚡ Rapide</span>'
    : '';

  // Actions
  const deleteAction = v._docId
    ? `delJournal('${v._docId}', ${idx})`
    : `delJournal(null, ${idx})`;

  return `
    <div class="entry-card" onclick="openCompteRendu(${idx})" style="cursor:pointer;">
      <button class="btn-delete" onclick="event.stopPropagation();${deleteAction}">🗑</button>
      <div class="entry-top">
        <span class="entry-date">${v.date}</span>
        <span class="entry-id">${getRucherLabel(v.rucher)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--soft);margin-bottom:6px;">
        ${methodeIcon} <strong style="color:var(--ink)">${v.ruches || '—'}</strong>
        ${modeBadge}
      </div>
      <div class="entry-tags" style="margin-bottom:8px;">${intv}</div>
      ${cadres}
      <div class="entry-tags" style="margin-top:6px;">
        ${v.force && v.force !== '—' ? `<span class="badge ${forceCls}">${v.force}</span>` : ''}
        <span style="font-size:0.76rem;font-weight:600;color:${reineColor};">${reineIcon} ${v.reine || '—'}</span>
        ${meteoBadge}
        ${ruchettesBadge}
      </div>
      ${v.obs ? `<div class="entry-sub" style="margin-top:6px;">💬 ${v.obs}</div>` : ''}
    </div>`;
}


/* ------------------------------------------------------------
   COMPTE RENDU — Détail d'une visite
   ------------------------------------------------------------ */

/**
 * Ouvrir le modal de compte rendu pour une visite
 * @param {number} idx - Index dans journalData
 */
function openCompteRendu(idx) {
  const v = journalData[idx];
  if (!v) return;

  const meteoIcons = { 'Ensoleillé':'☀️', 'Nuageux':'☁️', 'Pluvieux':'🌧️', 'Venteux':'💨' };
  const reineColor = v.reine === 'PONTE OK' ? '#2E7D32' : v.reine === 'PAS DE PONTE' ? '#C62828' : 'var(--mid)';
  const reineIcon  = v.reine === 'PONTE OK' ? '👑' : v.reine === 'PAS DE PONTE' ? '🚫' : '❓';

  const forceCls = {
    'Forte':   'badge-forte',
    'Moyenne': 'badge-moyenne',
    'Faible':  'badge-faible',
  }[v.force] || '';

  let html = `
    <div style="padding:4px 0;">
      <!-- En-tête -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--ink);">${getRucherLabel(v.rucher)}</div>
          <div style="font-size:0.82rem;color:var(--mid);">${v.date}</div>
        </div>
        <button class="btn-rucher-action" onclick="openEditJournal(${idx})" title="Modifier">✏️</button>
      </div>

      <!-- Ruches -->
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Ruches</div>
        <div style="font-size:0.85rem;font-weight:600;">${v.methodeRuches === 'marquage' ? '🪨' : '🔢'} ${v.ruches || '—'}</div>
      </div>`;

  // Météo
  if (v.meteo) {
    html += `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Météo</div>
        <div style="font-size:0.85rem;">${meteoIcons[v.meteo] || '🌤️'} ${v.meteo}</div>
      </div>`;
  }

  // Force + Reine
  html += `
    <div style="display:flex;gap:20px;margin-bottom:14px;">
      <div>
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Force</div>
        <div>${v.force && v.force !== '—' ? `<span class="badge ${forceCls}">${v.force}</span>` : '<span style="color:var(--mid);">—</span>'}</div>
      </div>
      <div>
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Reine / Ponte</div>
        <div style="font-weight:600;color:${reineColor};">${reineIcon} ${v.reine || '—'}</div>
      </div>
    </div>`;

  // Cadres
  if (v.cadreCouvain || v.cadreReserve || v.cadreVide) {
    html += `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Cadres</div>
        <div class="cadres-summary">
          <span>🐝 Couvain ${v.cadreCouvain}/10</span>
          <span>🍯 Réserve ${v.cadreReserve}/10</span>
          <span>⬜ Vide ${v.cadreVide}/5</span>
        </div>
      </div>`;
  }

  // Ruchettes
  if (v.nbRuchettes > 0) {
    html += `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Ruchettes</div>
        <div style="font-size:0.85rem;">🪣 ${v.nbRuchettes} ruchette${v.nbRuchettes > 1 ? 's' : ''}</div>
        ${v.etatRuchettes ? `<div style="font-size:0.8rem;color:var(--mid);margin-top:2px;">État : ${v.etatRuchettes}</div>` : ''}
        ${v.obsRuchettes ? `<div style="font-size:0.8rem;color:var(--mid);margin-top:2px;font-style:italic;">${v.obsRuchettes}</div>` : ''}
      </div>`;
  }

  // Interventions
  html += `
    <div style="margin-bottom:14px;">
      <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:6px;">Interventions</div>
      <div class="entry-tags">
        ${v.interventions?.length
          ? v.interventions.map(x => `<span class="badge badge-action">${x}</span>`).join('')
          : `<span class="badge badge-couvain">${v.intervention || 'Aucune'}</span>`}
      </div>
    </div>`;

  // Observations
  if (v.obs) {
    html += `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--soft);letter-spacing:0.06em;margin-bottom:4px;">Observations</div>
        <div style="font-size:0.85rem;color:var(--ink);background:var(--cream);border-radius:8px;padding:10px;border:1px solid var(--border);">
          💬 ${v.obs}
        </div>
      </div>`;
  }

  html += `</div>`;

  document.getElementById('cr-content').innerHTML = html;
  openModal('modal-compte-rendu');
}


/* ------------------------------------------------------------
   ÉDITION — Modifier une visite existante
   ------------------------------------------------------------ */

/**
 * Ouvrir le formulaire de visite pré-rempli pour édition
 * @param {number} idx - Index dans journalData
 */
function openEditJournal(idx) {
  const v = journalData[idx];
  if (!v) return;

  // Fermer le compte rendu
  closeModal('modal-compte-rendu');

  editingJournalIdx = idx;

  // Mettre à jour le titre de la modal
  const modalTitle = document.querySelector('#modal-journal .modal-title');
  if (modalTitle) modalTitle.textContent = '✏️ Modifier la visite';

  // Choisir le mode
  const mode = v.mode || 'complet';
  switchVisiteMode(mode);

  // Remplir les champs communs
  document.getElementById('j-date').value   = v.date;
  document.getElementById('j-rucher').value = v.rucher;

  if (mode === 'rapide') {
    // Mode rapide : cocher les interventions rapides
    document.querySelectorAll('#j-interv-rapide .check-item').forEach(item => {
      if (v.interventions?.includes(item.dataset.val)) {
        item.classList.add('checked');
      }
    });
    const obsRapide = document.getElementById('j-obs-rapide');
    if (obsRapide) obsRapide.value = v.obs || '';
  } else {
    // Mode complet : remplir tous les champs
    updateRuchesSection();

    // Météo
    if (v.meteo) {
      document.querySelectorAll('#j-meteo-btns .qbtn').forEach(btn => {
        if (btn.textContent.includes(v.meteo.substring(0, 4)) || btn.onclick?.toString().includes(v.meteo)) {
          btn.classList.add('selected');
        }
      });
      document.getElementById('j-meteo').value = v.meteo;
    }

    // Force
    if (v.force && v.force !== '—') {
      document.querySelectorAll('#j-force-btns .qbtn').forEach(btn => {
        if (btn.textContent.includes(v.force)) btn.classList.add('selected');
      });
      document.getElementById('j-force').value = v.force;
    }

    // Reine
    if (v.reine && v.reine !== '—') {
      document.querySelectorAll('#j-reine-btns .qbtn').forEach(btn => {
        if (btn.textContent.includes(v.reine.substring(0, 5))) btn.classList.add('selected');
      });
      document.getElementById('j-reine').value = v.reine;
    }

    // Cadres
    document.getElementById('j-couvain').textContent     = v.cadreCouvain || 0;
    document.getElementById('j-reserve').textContent     = v.cadreReserve || 0;
    document.getElementById('j-vide').textContent        = v.cadreVide || 0;
    document.getElementById('j-nb-ruchettes').textContent= v.nbRuchettes || 0;
    document.getElementById('j-etat-ruchettes').value    = v.etatRuchettes || '';
    document.getElementById('j-obs-ruchettes').value     = v.obsRuchettes || '';

    // Interventions
    document.querySelectorAll('#j-interventions-grid .check-item').forEach(item => {
      if (v.interventions?.includes(item.dataset.val)) {
        item.classList.add('checked');
      }
    });

    // Observations
    document.getElementById('j-obs').value = v.obs || '';
  }

  // Ouvrir la modal
  openModal('modal-journal');
}


/* ------------------------------------------------------------
   SUPPRESSION
   ------------------------------------------------------------ */

/**
 * Supprimer une visite après confirmation
 * @param {string|null} docId - ID du document Firestore
 * @param {number} i - Index dans le tableau
 */
async function delJournal(docId, i) {
  if (!confirm('Supprimer cette visite ?')) return;

  // Supprimer de Firestore
  if (docId) {
    await deleteJournalFromFirestore(docId);
  }

  journalData.splice(i, 1);
  localStorage.setItem('journal', JSON.stringify(journalData));

  renderJournal();
  updateDashboard();
  drawChartVisites();
  toast('🗑 Visite supprimée');
}
