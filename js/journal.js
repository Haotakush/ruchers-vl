/* ============================================================
   journal.js — Journal des visites apicoles

   Ce fichier gère :
   - Enregistrement d'une nouvelle visite
   - Affichage de la liste des visites
   - Suppression d'une visite
   - Remise à zéro du formulaire

   🔥 Persistance : Firestore (via firebase-db.js)
   ============================================================ */


/* ------------------------------------------------------------
   ENREGISTREMENT
   ------------------------------------------------------------ */

/** Sauvegarder une nouvelle visite depuis le formulaire modal */
async function saveJournal() {
  const date   = document.getElementById('j-date').value;
  const rucher = document.getElementById('j-rucher').value;

  if (!date || !rucher) {
    toast('⚠️ Date et rucher obligatoires');
    return;
  }

  // Récupérer les interventions cochées
  const interventions = Array.from(
    document.querySelectorAll('#j-interventions-grid .check-item.checked')
  ).map(el => el.dataset.val);

  // Construire l'objet visite
  const entry = {
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
    // Compatibilité : stocker aussi comme string pour le registre
    intervention:  interventions.length ? interventions.join(', ') : 'Visite contrôle',
    interventions,
    obs:           document.getElementById('j-obs').value || '',
  };

  // Sauvegarder dans Firestore
  const docRef = await addJournalToFirestore(entry);
  if (docRef) {
    entry._docId = docRef.id;
  }

  // Ajouter en tête de liste (plus récent en premier)
  journalData.unshift(entry);

  // Backup localStorage
  localStorage.setItem('journal', JSON.stringify(journalData));

  // Fermer et rafraîchir
  closeModal('modal-journal');
  resetJournalForm();
  renderJournal();
  updateDashboard();
  drawChartVisites();
  toast('✅ Visite enregistrée !');
}


/* ------------------------------------------------------------
   FORMULAIRE — Remise à zéro
   ------------------------------------------------------------ */

/** Réinitialiser tous les champs du formulaire de visite */
function resetJournalForm() {
  document.getElementById('j-obs').value           = '';
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
    '#j-interventions-grid .check-item, #ruches-marquage-section .marquage-item'
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

  // Revenir à la méthode numérique
  setRuchesMethod('numerique');
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

  list.innerHTML = data.map((v, i) => buildJournalCard(v, i)).join('');
}

/**
 * Construire le HTML d'une carte de visite
 * @param {object} v - Objet visite
 * @param {number} i - Index dans le tableau filtré
 * @returns {string} HTML de la carte
 */
function buildJournalCard(v, i) {
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

  // Utiliser le _docId pour la suppression Firestore
  const deleteAction = v._docId
    ? `delJournal('${v._docId}', ${i})`
    : `delJournal(null, ${i})`;

  return `
    <div class="entry-card">
      <button class="btn-delete" onclick="${deleteAction}">🗑</button>
      <div class="entry-top">
        <span class="entry-date">${v.date}</span>
        <span class="entry-id">${getRucherLabel(v.rucher)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--soft);margin-bottom:6px;">
        ${methodeIcon} <strong style="color:var(--ink)">${v.ruches || '—'}</strong>
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
