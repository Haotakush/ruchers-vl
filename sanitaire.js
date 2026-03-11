/* ============================================================
   sanitaire.js — Registre des traitements sanitaires

   🔥 Persistance : Firestore (via firebase-db.js)
   ============================================================ */

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

  // Sauvegarder dans Firestore
  const docRef = await addSanitaireToFirestore(entry);
  if (docRef) {
    entry._docId = docRef.id;
  }

  sanitaireData.unshift(entry);
  localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));

  closeModal('modal-sanitaire');
  renderSanitaire();
  updateDashboard();
  toast('✅ Traitement enregistré !');
}

function renderSanitaire() {
  const list = document.getElementById('sanitaire-list');
  if (!sanitaireData.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">💊</div>
        <p>Aucun traitement.<br>Appuyez sur + pour en ajouter.</p>
      </div>`;
    return;
  }
  list.innerHTML = sanitaireData.map((s, i) => {
    const deleteAction = s._docId
      ? `delSanitaire('${s._docId}', ${i})`
      : `delSanitaire(null, ${i})`;

    return `
    <div class="entry-card">
      <button class="btn-delete" onclick="${deleteAction}">🗑</button>
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

async function delSanitaire(docId, i) {
  if (!confirm('Supprimer ce traitement ?')) return;

  // Supprimer de Firestore
  if (docId) {
    await deleteSanitaireFromFirestore(docId);
  }

  sanitaireData.splice(i, 1);
  localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));
  renderSanitaire();
  updateDashboard();
  toast('🗑 Supprimé');
}
