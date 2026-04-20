/* ============================================================
   sanitaire.js — Traitements sanitaires
   v1.3 — Ajout édition des traitements
   ============================================================ */

let editingSanitaireIdx = null;
let _isSavingSanitaire  = false;

async function saveSanitaire() {
  if (_isSavingSanitaire) return; // empêche le double-tap
  _isSavingSanitaire = true;

  // Désactiver le bouton visuellement
  const saveBtn = document.querySelector('#modal-sanitaire .btn-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Enregistrement…'; }

  try {
    await _doSaveSanitaire();
  } finally {
    _isSavingSanitaire = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✓ Enregistrer'; }
  }
}

async function _doSaveSanitaire() {
  const date   = document.getElementById('s-date').value;
  const rucher = document.getElementById('s-rucher').value;
  if (!date || !rucher) { toast('⚠️ Date et rucher obligatoires'); return; }

  const entry = {
    date, rucher,
    type:    document.getElementById('s-type').value    || '—',
    produit: document.getElementById('s-produit').value || '—',
    dose:    document.getElementById('s-dose').value    || '—',
    duree:   document.getElementById('s-duree').value   || '—',
    gdsa:    document.getElementById('s-gdsa').value,
    motif:   document.getElementById('s-motif').value   || '—',
    obs:     document.getElementById('s-obs').value     || '',
  };

  if (editingSanitaireIdx !== null) {
    const existing = sanitaireData[editingSanitaireIdx];
    entry._docId = existing._docId;
    if (entry._docId) await updateSanitaireInFirestore(entry._docId, entry);
    sanitaireData[editingSanitaireIdx] = entry;
    editingSanitaireIdx = null;
    if (typeof uploadPendingDoc === 'function') await uploadPendingDoc(entry._docId || '');
    toast('✅ Traitement mis à jour !');
  } else {
    const docRef = await addSanitaireToFirestore(entry);
    if (docRef) entry._docId = docRef.id;
    sanitaireData.unshift(entry);
    if (typeof uploadPendingDoc === 'function') await uploadPendingDoc(entry._docId || '');
    toast('✅ Traitement enregistré !');
  }

  localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));
  closeModal('modal-sanitaire');
  resetSanitaireForm();
  renderSanitaire();
  updateDashboard();
}

function resetSanitaireForm() {
  ['s-type','s-produit','s-dose','s-duree','s-motif','s-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('s-rucher').value = '';
  document.getElementById('s-gdsa').value   = 'Non';
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
  editingSanitaireIdx = null;
  if (typeof clearPendingDoc === 'function') clearPendingDoc();
}

/* ---- Chips type de traitement ---- */
function selectTypeChip(btn) {
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const typeInput = document.getElementById('s-type');
  typeInput.value = btn.dataset.val;
  // Si Varroa : vider pour forcer le choix du produit dans la datalist
  if (btn.dataset.val === 'Varroa') {
    document.getElementById('s-produit').focus();
  }
}

/* ---- Guide varroa ---- */
function openVarroaGuide() {
  openModal('modal-varroa-guide');
}

/* ---- Bannière rappel comptage ---- */
function checkComptageReminder() {
  const mois = new Date().getMonth() + 1; // 1=Jan … 12=Déc
  const reminder = document.getElementById('comptage-reminder');
  if (!reminder) return;

  // Mois de comptage : 12=Déc, 3=Mars, 5=Mai, 7=Juil
  // On affiche aussi le mois précédent comme rappel anticipé
  const periodes = {
    11: { title: '🔬 Comptage varroa — dans 1 mois', text: 'Le mois de décembre est la période de comptage. Préparez vos outils.' },
    12: { title: '🔬 Période de comptage — Décembre', text: 'C\'est le moment de faire votre comptage varroa de fin d\'année.' },
    2:  { title: '🔬 Comptage varroa — dans 1 mois', text: 'Le mois de mars est une période de comptage. Anticipez.' },
    3:  { title: '🔬 Période de comptage — Mars', text: 'Effectuez votre comptage varroa de sortie de miellée baies roses.' },
    4:  { title: '🔬 Comptage varroa — dans 1 mois', text: 'Le mois de mai est une période de comptage. Préparez-vous.' },
    5:  { title: '🔬 Période de comptage — Mai', text: 'Effectuez votre comptage varroa de sortie de miellée intermédiaire.' },
    6:  { title: '🔬 Comptage varroa — dans 1 mois', text: 'Juillet est une période de comptage. Anticipez dès maintenant.' },
    7:  { title: '🔬 Période de comptage — Juillet', text: 'Effectuez votre comptage varroa post-traitement d\'été.' },
  };

  const info = periodes[mois];
  if (info) {
    document.getElementById('comptage-reminder-title').textContent = info.title;
    document.getElementById('comptage-reminder-text').textContent  = info.text;
    reminder.style.display = 'flex';
  } else {
    reminder.style.display = 'none';
  }
}

function openEditSanitaire(idx) {
  const s = sanitaireData[idx];
  if (!s) return;
  editingSanitaireIdx = idx;
  const modalTitle = document.querySelector('#modal-sanitaire .modal-title');
  if (modalTitle) modalTitle.textContent = '✏️ Modifier le traitement';

  document.getElementById('s-date').value    = s.date;
  document.getElementById('s-rucher').value  = s.rucher;
  document.getElementById('s-type').value    = s.type    !== '—' ? s.type    : '';
  document.getElementById('s-produit').value = s.produit !== '—' ? s.produit : '';
  document.getElementById('s-dose').value    = s.dose    !== '—' ? s.dose    : '';
  document.getElementById('s-duree').value   = s.duree   !== '—' ? s.duree   : '';
  document.getElementById('s-gdsa').value    = s.gdsa;
  document.getElementById('s-motif').value   = s.motif   !== '—' ? s.motif   : '';
  document.getElementById('s-obs').value     = s.obs     || '';
  openModal('modal-sanitaire');
}

function renderSanitaire() {
  const list = document.getElementById('sanitaire-list');
  if (!sanitaireData.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">💊</div>
      <p>Aucun traitement.<br>Appuyez sur + pour en ajouter.</p></div>`;
    return;
  }
  list.innerHTML = sanitaireData.map((s, i) => {
    const deleteAction = s._docId ? `confirmDelSanitaire('${s._docId}', ${i})` : `confirmDelSanitaire(null, ${i})`;
    return `
    <div class="entry-card" onclick="openEditSanitaire(${i})" style="cursor:pointer;">
      <button class="btn-delete" onclick="event.stopPropagation();${deleteAction}">🗑</button>
      <div class="entry-top">
        <span class="entry-date">${s.date}</span>
        <span class="entry-id">${getRucherLabel(s.rucher)}</span>
      </div>
      <div class="entry-main">${s.type}</div>
      <div class="entry-sub">${s.produit} · ${s.dose} · ${s.duree}</div>
      <div class="entry-sub" style="margin-top:3px;">${s.motif}</div>
      <div class="entry-tags">
        <span class="badge badge-sani">${s.gdsa === 'Oui' ? '🚨 GDSA déclaré' : 'GDSA: Non'}</span>
        ${s.obs ? `<span class="badge badge-couvain">${s.obs}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function confirmDelSanitaire(docId, i) {
  showConfirm('Supprimer ce traitement ?', () => delSanitaire(docId, i));
}

async function delSanitaire(docId, i) {
  if (docId) await deleteSanitaireFromFirestore(docId);
  sanitaireData.splice(i, 1);
  localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));
  renderSanitaire(); updateDashboard();
  toast('🗑 Supprimé');
}
