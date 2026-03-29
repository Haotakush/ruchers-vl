/* ============================================================
   sanitaire.js — Traitements sanitaires
   v1.3 — Ajout édition des traitements
   ============================================================ */

let editingSanitaireIdx = null;

async function saveSanitaire() {
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
    toast('✅ Traitement mis à jour !');
  } else {
    const docRef = await addSanitaireToFirestore(entry);
    if (docRef) entry._docId = docRef.id;
    sanitaireData.unshift(entry);
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
  editingSanitaireIdx = null;
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
