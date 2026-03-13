/* ============================================================
   journal.js — Journal des visites
   v1.3 — Nouveau modèle : visite par rucher, marquage, force,
          nb ruches, nb ruchettes. Suppression données par ruche.
   ============================================================ */

let editingJournalIdx = null;

/* ---- SAUVEGARDE ---- */
async function saveJournal() {
  const date   = document.getElementById('j-date').value;
  const rucher = document.getElementById('j-rucher').value;
  if (!date || !rucher) { toast('⚠️ Date et rucher obligatoires'); return; }

  const interventions = Array.from(
    document.querySelectorAll('#j-interventions-grid .check-item.checked')
  ).map(el => el.dataset.val);

  const marquageItems = Array.from(
    document.querySelectorAll('#j-marquage-grid .marquage-item.checked')
  ).map(item => {
    const label = item.dataset.val;
    const input = item.querySelector('.champ-libre-input');
    const desc  = input?.value?.trim();
    return desc ? `${label} (${desc})` : label;
  });

  const entry = {
    date,
    rucher,
    meteo:        document.getElementById('j-meteo').value || '',
    force:        document.getElementById('j-force').value || '—',
    marquage:     marquageItems,
    nbRuches:     parseInt(document.getElementById('j-nb-ruches').textContent)    || 0,
    nbRuchettes:  parseInt(document.getElementById('j-nb-ruchettes').textContent) || 0,
    interventions,
    intervention: interventions.length ? interventions.join(', ') : 'Visite contrôle',
    obs:          document.getElementById('j-obs').value || '',
  };

  if (editingJournalIdx !== null) {
    const existing = journalData[editingJournalIdx];
    entry._docId = existing._docId;
    if (entry._docId) await updateJournalInFirestore(entry._docId, entry);
    journalData[editingJournalIdx] = entry;
    editingJournalIdx = null;
    toast('✅ Visite mise à jour !');
  } else {
    const docRef = await addJournalToFirestore(entry);
    if (docRef) entry._docId = docRef.id;
    journalData.unshift(entry);
    toast('✅ Visite enregistrée !');
  }

  localStorage.setItem('journal', JSON.stringify(journalData));
  closeModal('modal-journal');
  resetJournalForm();
  renderJournal();
  updateDashboard();
  drawChartVisites();
}

/* ---- RESET FORMULAIRE ---- */
function resetJournalForm() {
  document.getElementById('j-obs').value    = '';
  document.getElementById('j-rucher').value = '';
  document.getElementById('j-meteo').value  = '';
  document.getElementById('j-force').value  = '';
  document.getElementById('j-nb-ruches').textContent    = '0';
  document.getElementById('j-nb-ruchettes').textContent = '0';

  document.querySelectorAll('#j-interventions-grid .check-item').forEach(el => el.classList.remove('checked'));
  document.querySelectorAll('#j-marquage-grid .marquage-item').forEach(el => {
    el.classList.remove('checked');
    const inp = el.querySelector('.champ-libre-input');
    if (inp) inp.value = '';
  });
  document.querySelectorAll('#j-force-btns .qbtn, #j-meteo-btns .qbtn').forEach(b => b.classList.remove('selected'));

  editingJournalIdx = null;
  const modalTitle = document.querySelector('#modal-journal .modal-title');
  if (modalTitle) modalTitle.textContent = '📋 Nouvelle visite';
}

/* ---- RENDU LISTE ---- */
function renderJournal() {
  const list = document.getElementById('journal-list');
  const filterRucher = document.getElementById('flt-rucher').value;
  const filterForce  = document.getElementById('flt-force').value;

  const data = journalData.filter(v =>
    (!filterRucher || v.rucher === filterRucher) &&
    (!filterForce  || v.force  === filterForce)
  );

  if (!data.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>
      <p>Aucune visite.<br>Appuyez sur + pour en ajouter.</p></div>`;
    return;
  }

  list.innerHTML = data.map(v => {
    const realIdx = journalData.indexOf(v);
    return buildJournalCard(v, realIdx);
  }).join('');
}

function buildJournalCard(v, idx) {
  const forceCls = { 'Forte':'badge-forte', 'Moyenne':'badge-moyenne', 'Faible':'badge-faible' }[v.force] || '';
  const meteoIcons = { 'Ensoleillé':'☀️', 'Nuageux':'☁️', 'Pluvieux':'🌧️', 'Venteux':'💨' };
  const meteoBadge = v.meteo
    ? `<span class="meteo-badge">${meteoIcons[v.meteo] || '🌤️'} ${v.meteo}</span>` : '';

  const marquageBadges = v.marquage?.length
    ? v.marquage.map(m => `<span class="badge badge-marquage">🪨 ${m}</span>`).join('')
    : '';

  const intv = v.interventions?.length
    ? v.interventions.map(x => `<span class="badge badge-action">${x}</span>`).join('')
    : `<span class="badge badge-couvain">${v.intervention || '—'}</span>`;

  const ruchettesBadge = v.nbRuchettes > 0
    ? `<span class="badge" style="background:#FFF3E0;color:#E65100;">🪣 ${v.nbRuchettes} ruchette${v.nbRuchettes > 1 ? 's' : ''}</span>`
    : '';

  const deleteAction = v._docId ? `confirmDelJournal('${v._docId}', ${idx})` : `confirmDelJournal(null, ${idx})`;

  return `
    <div class="entry-card" onclick="openCompteRendu(${idx})" style="cursor:pointer;">
      <button class="btn-delete" onclick="event.stopPropagation();${deleteAction}">🗑</button>
      <div class="entry-top">
        <span class="entry-date">${v.date}</span>
        <span class="entry-id">${getRucherLabel(v.rucher)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--soft);margin-bottom:6px;">
        🐝 <strong style="color:var(--ink)">${v.nbRuches || '—'} ruches</strong>
        ${v.nbRuchettes > 0 ? `· ${ruchettesBadge}` : ''}
      </div>
      ${marquageBadges ? `<div class="entry-tags" style="margin-bottom:6px;">${marquageBadges}</div>` : ''}
      <div class="entry-tags" style="margin-bottom:6px;">${intv}</div>
      <div class="entry-tags">
        ${v.force && v.force !== '—' ? `<span class="badge ${forceCls}">${v.force}</span>` : ''}
        ${meteoBadge}
      </div>
      ${v.obs ? `<div class="entry-sub" style="margin-top:6px;">💬 ${v.obs}</div>` : ''}
    </div>`;
}

/* ---- SUPPRESSION ---- */
function confirmDelJournal(docId, i) {
  showConfirm('Supprimer cette visite ?', () => delJournal(docId, i));
}

async function delJournal(docId, i) {
  if (docId) await deleteJournalFromFirestore(docId);
  journalData.splice(i, 1);
  localStorage.setItem('journal', JSON.stringify(journalData));
  renderJournal(); updateDashboard(); drawChartVisites();
  toast('🗑 Visite supprimée');
}

/* ---- COMPTE RENDU ---- */
function openCompteRendu(idx) {
  const v = journalData[idx];
  if (!v) return;
  const meteoIcons = { 'Ensoleillé':'☀️', 'Nuageux':'☁️', 'Pluvieux':'🌧️', 'Venteux':'💨' };
  const forceCls = { 'Forte':'badge-forte', 'Moyenne':'badge-moyenne', 'Faible':'badge-faible' }[v.force] || '';

  let html = `
    <div style="padding:4px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--ink);">${getRucherLabel(v.rucher)}</div>
          <div style="font-size:0.82rem;color:var(--mid);">${v.date}</div>
        </div>
        <button class="btn-rucher-action" onclick="openEditJournal(${idx})" title="Modifier">✏️</button>
      </div>`;

  if (v.meteo) html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Météo</div>
      <div>${meteoIcons[v.meteo] || '🌤️'} ${v.meteo}</div>
    </div>`;

  if (v.force && v.force !== '—') html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Force colonie</div>
      <span class="badge ${forceCls}">${v.force}</span>
    </div>`;

  html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Ruches</div>
      <div>🐝 ${v.nbRuches || '—'} ruches${v.nbRuchettes > 0 ? ` · 🪣 ${v.nbRuchettes} ruchette${v.nbRuchettes > 1 ? 's' : ''}` : ''}</div>
    </div>`;

  if (v.marquage?.length) html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Marquage</div>
      <div class="entry-tags">${v.marquage.map(m => `<span class="badge badge-marquage">🪨 ${m}</span>`).join('')}</div>
    </div>`;

  html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Interventions</div>
      <div class="entry-tags">
        ${v.interventions?.length
          ? v.interventions.map(x => `<span class="badge badge-action">${x}</span>`).join('')
          : `<span class="badge badge-couvain">${v.intervention || 'Aucune'}</span>`}
      </div>
    </div>`;

  if (v.obs) html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Observations</div>
      <div style="background:var(--cream);border-radius:8px;padding:10px;border:1px solid var(--border);font-size:0.85rem;">
        💬 ${v.obs}
      </div>
    </div>`;

  html += `</div>`;
  document.getElementById('cr-content').innerHTML = html;
  openModal('modal-compte-rendu');
}

/* ---- ÉDITION ---- */
function openEditJournal(idx) {
  const v = journalData[idx];
  if (!v) return;
  closeModal('modal-compte-rendu');
  editingJournalIdx = idx;
  const modalTitle = document.querySelector('#modal-journal .modal-title');
  if (modalTitle) modalTitle.textContent = '✏️ Modifier la visite';

  document.getElementById('j-date').value   = v.date;
  document.getElementById('j-rucher').value = v.rucher;
  document.getElementById('j-meteo').value  = v.meteo || '';
  document.getElementById('j-force').value  = v.force || '';
  document.getElementById('j-nb-ruches').textContent    = v.nbRuches    || 0;
  document.getElementById('j-nb-ruchettes').textContent = v.nbRuchettes || 0;

  // Météo — cocher le bouton
  document.querySelectorAll('#j-meteo-btns .qbtn').forEach(btn => {
    if (v.meteo && btn.onclick?.toString().includes(`'${v.meteo}'`)) btn.classList.add('selected');
  });

  // Force — cocher le bouton
  document.querySelectorAll('#j-force-btns .qbtn').forEach(btn => {
    if (v.force && btn.textContent.includes(v.force)) btn.classList.add('selected');
  });

  // Marquage
  if (v.marquage?.length) {
    document.querySelectorAll('#j-marquage-grid .marquage-item').forEach(item => {
      const dataVal = item.dataset.val;
      const match = v.marquage.find(m => m === dataVal || m.startsWith(dataVal + ' ('));
      if (match) {
        item.classList.add('checked');
        const parenMatch = match.match(/\((.+)\)$/);
        const inp = item.querySelector('.champ-libre-input');
        if (parenMatch && inp) inp.value = parenMatch[1];
      }
    });
  }

  // Interventions
  document.querySelectorAll('#j-interventions-grid .check-item').forEach(item => {
    if (v.interventions?.includes(item.dataset.val)) item.classList.add('checked');
  });

  document.getElementById('j-obs').value = v.obs || '';
  openModal('modal-journal');
}
