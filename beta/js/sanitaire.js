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
    11: { title: 'Comptage varroa — dans 1 mois', text: 'Le mois de décembre est la période de comptage. Préparez vos outils.' },
    12: { title: 'Période de comptage — Décembre', text: 'C\'est le moment de faire votre comptage varroa de fin d\'année.' },
    2:  { title: 'Comptage varroa — dans 1 mois', text: 'Le mois de mars est une période de comptage. Anticipez.' },
    3:  { title: 'Période de comptage — Mars', text: 'Effectuez votre comptage varroa de sortie de miellée baies roses.' },
    4:  { title: 'Comptage varroa — dans 1 mois', text: 'Le mois de mai est une période de comptage. Préparez-vous.' },
    5:  { title: 'Période de comptage — Mai', text: 'Effectuez votre comptage varroa de sortie de miellée intermédiaire.' },
    6:  { title: 'Comptage varroa — dans 1 mois', text: 'Juillet est une période de comptage. Anticipez dès maintenant.' },
    7:  { title: 'Période de comptage — Juillet', text: 'Effectuez votre comptage varroa post-traitement d\'été.' },
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

/* Valeur de champ sûre : ni « undefined », ni le tiret des champs vides */
function fieldVal(v) { return (v === undefined || v === null || v === '—') ? '' : v; }

function openEditSanitaire(idx) {
  const s = sanitaireData[idx];
  if (!s) return;
  editingSanitaireIdx = idx;
  const modalTitle = document.querySelector('#modal-sanitaire .modal-title');
  if (modalTitle) modalTitle.textContent = 'Modifier le traitement';

  document.getElementById('s-date').value    = s.date;
  document.getElementById('s-rucher').value  = s.rucher;
  document.getElementById('s-type').value    = fieldVal(s.type);
  document.getElementById('s-produit').value = fieldVal(s.produit);
  document.getElementById('s-dose').value    = fieldVal(s.dose);
  document.getElementById('s-duree').value   = fieldVal(s.duree);
  document.getElementById('s-gdsa').value    = s.gdsa || 'Non';
  document.getElementById('s-motif').value   = fieldVal(s.motif);
  document.getElementById('s-obs').value     = s.obs     || '';
  openModal('modal-sanitaire');
}

/* Durée saisie librement (« 10 semaines », « 30 jours », « 3 mois ») → nombre de jours */
function dureeEnJours(duree) {
  const m = String(duree || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(j|jour|jours|s|sem|semaine|semaines|m|mois)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2];
  if (u.startsWith('j')) return Math.round(n);
  if (u.startsWith('s')) return Math.round(n * 7);
  return Math.round(n * 30);
}

function renderSanitaire() {
  const list = document.getElementById('sanitaire-list');
  if (!sanitaireData.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">${icon('shield', 36)}</div>
      <p>Aucun traitement.<br>Touchez « Nouveau traitement » pour en ajouter un.</p></div>`;
    return;
  }
  const lieu = id => { const r = getRucherById(id); return r ? r.lieu : id; };
  const items = sanitaireData.map((s, i) => {
    const jours = dureeEnJours(s.duree);
    const debut = parseISODate(s.date);
    let fin = null, enCours = false, pct = 0;
    if (jours && debut) {
      fin = new Date(debut); fin.setDate(fin.getDate() + jours);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      enCours = today >= debut && today < fin;
      pct = Math.min(100, Math.max(3, Math.round((today - debut) / (fin - debut) * 100)));
    }
    const finIso = fin ? `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}` : null;
    return { s, i, enCours, pct, finIso };
  }).sort((a, b) => (b.s.date || '').localeCompare(a.s.date || ''));

  const card = ({ s, i, enCours, pct, finIso }) => {
    const deleteAction = s._docId ? `confirmDelSanitaire('${s._docId}', ${i})` : `confirmDelSanitaire(null, ${i})`;
    const details = [s.produit, s.dose, s.duree].filter(x => x && x !== '—').join(' · ');
    const fin = finIso ? fmtEcheance(finIso) : null;
    return `
    <div class="visit-card" onclick="openEditSanitaire(${i})">
      <div class="visit-head">
        <span class="visit-title">${esc(s.type || 'Traitement')} · ${esc(lieu(s.rucher))}</span>
        <span class="visit-date">${fmtDate(s.date)}</span>
        <button class="icon-btn icon-btn-sm" onclick="event.stopPropagation();${deleteAction}" title="Supprimer le traitement" aria-label="Supprimer le traitement">${icon('trash', 16)}</button>
      </div>
      ${details ? `<div class="list-meta">${esc(details)}</div>` : ''}
      ${s.motif && s.motif !== '—' ? `<div class="list-meta">${esc(s.motif)}</div>` : ''}
      ${enCours ? `
      <div class="treat-progress">
        <div class="meter"><span class="meter-soon" style="width:${pct}%"></span></div>
        <div class="treat-dates"><span>Posé le ${fmtDate(s.date)}</span><span>Retrait ${fin.tone === 'neutral' ? 'le ' + fmtDate(finIso) : fin.label.toLowerCase()}</span></div>
      </div>` : ''}
      <div class="visit-tags">
        ${s.gdsa === 'Oui' ? `<span class="pill pill-late">Déclaré au GDSA</span>` : ''}
        ${s.obs ? `<span class="tag">${esc(s.obs)}</span>` : ''}
      </div>
    </div>`;
  };

  const encours = items.filter(x => x.enCours);
  const autres  = items.filter(x => !x.enCours);
  list.innerHTML =
    (encours.length ? `<div class="list-section">En cours</div>` + encours.map(card).join('') : '') +
    (autres.length ? `<div class="list-section">Historique</div>` + autres.map(card).join('') : '');
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
