/* ============================================================
   journal.js — Journal des visites
   v1.3 — Nouveau modèle + photos visite + mémo audio
   ============================================================ */

let editingJournalIdx  = null;
let _isSavingJournal   = false; // garde contre les doubles soumissions

/* ---- État temporaire du formulaire ---- */
let currentVisitPhotos = []; // [{ dataUrl, blob?, isNew }]
let currentVisitAudio  = null; // { blob, duration } ou { dataUrl, duration }

/* ---- MediaRecorder ---- */
let mediaRecorder    = null;
let audioChunks      = [];
let recordingTimer   = null;
let recordingSeconds = 0;
const MAX_RECORDING  = 60;

/* ---- PHOTOS DE VISITE ---- */
async function addVisitPhoto(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  toast('📸 Compression…');
  for (const file of files) {
    try {
      const blob = await compressImage(file);
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      currentVisitPhotos.push({ dataUrl, blob, isNew: true });
      renderVisitPhotoPreviews();
    } catch (err) { toast('⚠️ Erreur photo'); }
  }
  input.value = '';
}

function removeVisitPhoto(idx) {
  currentVisitPhotos.splice(idx, 1);
  renderVisitPhotoPreviews();
}

function renderVisitPhotoPreviews() {
  const container = document.getElementById('j-photos-preview');
  if (!container) return;
  const addBtn = container.querySelector('label');
  container.querySelectorAll('.visit-photo-wrap').forEach(el => el.remove());
  currentVisitPhotos.forEach((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'visit-photo-wrap';
    wrap.innerHTML = `
      <img src="${p.dataUrl}" class="photo-thumb" onclick="openLightbox('${p.dataUrl}')">
      <button type="button" class="visit-photo-del"
        onclick="event.stopPropagation();removeVisitPhoto(${i})">✕</button>`;
    container.insertBefore(wrap, addBtn);
  });
}

/* ---- AUDIO ---- */
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('⚠️ Micro non disponible sur ce navigateur'); return;
  }
  try {
    const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/mp4';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks   = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mimeType.split(';')[0] });
      currentVisitAudio = { blob, duration: recordingSeconds };
      renderAudioPreview();
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start(1000);
    recordingSeconds = 0;
    const btn   = document.getElementById('j-record-btn');
    const timer = document.getElementById('j-record-timer');
    btn.textContent = '⏹ Arrêter';
    btn.onclick     = stopRecording;
    btn.classList.add('recording');
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
      const s = (recordingSeconds % 60).toString().padStart(2, '0');
      timer.textContent = `${m}:${s} / 01:00`;
      if (recordingSeconds >= MAX_RECORDING) stopRecording();
    }, 1000);
  } catch (err) {
    toast('⚠️ Accès micro refusé ou indisponible');
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  mediaRecorder.stop();
  clearInterval(recordingTimer);
  const btn   = document.getElementById('j-record-btn');
  const timer = document.getElementById('j-record-timer');
  if (btn)   { btn.textContent = '🎙 Enregistrer'; btn.onclick = startRecording; btn.classList.remove('recording'); }
  if (timer) { timer.textContent = ''; }
}

function renderAudioPreview() {
  const el = document.getElementById('j-audio-preview');
  if (!el || !currentVisitAudio) { if (el) el.innerHTML = ''; return; }
  const src = currentVisitAudio.dataUrl
    || (currentVisitAudio.blob ? URL.createObjectURL(currentVisitAudio.blob) : '');
  const dur = currentVisitAudio.duration || 0;
  const m = Math.floor(dur / 60).toString().padStart(2, '0');
  const s = (dur % 60).toString().padStart(2, '0');
  el.innerHTML = `
    <div class="audio-preview">
      <audio controls src="${src}" style="width:100%;height:36px;margin-top:8px;"></audio>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <span style="font-size:0.72rem;color:var(--soft);">🎙 ${m}:${s}</span>
        <button type="button" class="audio-del-btn" onclick="deleteCurrentAudio()">🗑 Supprimer</button>
      </div>
    </div>`;
}

function deleteCurrentAudio() {
  currentVisitAudio = null;
  const el = document.getElementById('j-audio-preview');
  if (el) el.innerHTML = '';
}

/* ---- RAPPELS J+ ---- */
function setRappelJours(n) {
  const input = document.getElementById('j-rappel-jours');
  if (input) input.value = n;
  document.querySelectorAll('.rappel-chip').forEach(b => b.classList.remove('selected'));
  const chips = document.querySelectorAll('.rappel-chip');
  chips.forEach(b => { if (b.textContent === `J+${n}`) b.classList.add('selected'); });
}

function addJoursToDate(dateStr, jours) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + jours);
  return d.toISOString().split('T')[0];
}

/* ---- PROMPT ICS après sauvegarde avec rappel ---- */
function showICSPrompt(rappel, rucherLabel, idx) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
      <span>✅ Visite enregistrée !</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:0.78rem;opacity:0.85;">Rappel le ${rappel.echeance}</span>
        <button onclick="exportRappelByIdx(${idx});this.closest('#toast').classList.remove('show');"
          style="background:#fff;color:#8B4513;border:none;border-radius:10px;padding:4px 10px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;">
          📅 Calendrier
        </button>
      </div>
    </div>`;
  el.classList.add('show');
  clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(() => {
    el.classList.remove('show');
    el.innerHTML = '';
  }, 6000);
}

/* ---- EXPORT .ICS (Calendrier iPhone / Android / Mac) ---- */
/* Entrée par index — évite tout problème d'échappement JSON dans les onclick */
function exportRappelByIdx(idx) {
  const v = journalData[idx];
  if (!v?.rappel) return;
  exportRappelICS(v.rappel, getRucherLabel(v.rucher));
}

function exportRappelICS(rappel, rucherLabel) {
  if (!rappel?.echeance || !rappel?.texte) return;

  const dateICS = rappel.echeance.replace(/-/g, '');
  const uid     = `ruchers-vl-${Date.now()}@rappel`;
  const now     = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruchers VL//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateICS}`,
    `DTEND;VALUE=DATE:${dateICS}`,
    `SUMMARY:🍯 ${rappel.texte} — ${rucherLabel}`,
    `DESCRIPTION:Rappel créé depuis Ruchers VL (J+${rappel.jours})`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${rappel.texte} — ${rucherLabel}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `rappel-rucher-${dateICS}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function dataUrlToBlob(dataUrl) {
  const arr  = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

/* ---- SAUVEGARDE ---- */
async function saveJournal() {
  if (_isSavingJournal) return; // empêche le double-tap
  _isSavingJournal = true;

  // Désactiver le bouton visuellement
  const saveBtn = document.querySelector('#modal-journal .btn-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Enregistrement…'; }

  try {
    await _doSaveJournal();
  } finally {
    _isSavingJournal = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✓ Enregistrer'; }
  }
}

async function _doSaveJournal() {
  const date   = document.getElementById('j-date').value;
  const rucher = document.getElementById('j-rucher').value;
  if (!date || !rucher) { toast('⚠️ Date et rucher obligatoires'); return; }

  const interventions = Array.from(
    document.querySelectorAll('#j-interventions-grid .check-item.checked')
  ).map(el => el.dataset.val);

  // Marquage : coché OU texte rempli → inclus automatiquement
  const marquageItems = Array.from(
    document.querySelectorAll('#j-marquage-grid .marquage-item')
  ).filter(item => {
    const isChecked = item.classList.contains('checked');
    const input     = item.querySelector('.champ-libre-input');
    return isChecked || (input?.value?.trim().length > 0);
  }).map(item => {
    const label = item.dataset.val;
    const input = item.querySelector('.champ-libre-input');
    const desc  = input?.value?.trim();
    return desc ? `${label} (${desc})` : label;
  });

  // Rappel J+
  const rappelTexte = document.getElementById('j-rappel-texte')?.value?.trim() || '';
  const rappelJours = parseInt(document.getElementById('j-rappel-jours')?.value) || 0;
  const rappel = (rappelTexte && rappelJours > 0)
    ? { texte: rappelTexte, jours: rappelJours, echeance: addJoursToDate(date, rappelJours), fait: false }
    : null;

  const entry = {
    date,
    rucher,
    force:        document.getElementById('j-force').value || '—',
    marquage:     marquageItems,
    nbRuches:     parseInt(document.getElementById('j-nb-ruches').textContent)    || 0,
    nbRuchettes:  parseInt(document.getElementById('j-nb-ruchettes').textContent) || 0,
    interventions,
    intervention: interventions.length ? interventions.join(', ') : 'Visite contrôle',
    obs:          document.getElementById('j-obs').value || '',
    rappel,
  };

  const isEditing = editingJournalIdx !== null;
  let visitId;

  // ---- Filet anti-doublon (dernière ligne de défense) ----
  // Calcule une empreinte de l'entrée. Si une entrée identique a été sauvegardée
  // dans les 45 dernières secondes, on bloque. Couvre : double-tap, re-auth Firebase,
  // réseau lent + retry utilisateur, listeners en doublon.
  if (!isEditing) {
    const fp  = `${entry.date}|${entry.rucher}|${entry.nbRuches}|${entry.obs}`;
    const last = JSON.parse(localStorage.getItem('_lastJournalSave') || '{}');
    const now  = Date.now();
    if (last.fp === fp && (now - last.ts) < 45000) {
      toast('⚠️ Cette visite vient d\'être enregistrée !');
      return;
    }
    localStorage.setItem('_lastJournalSave', JSON.stringify({ fp, ts: now }));
  }

  if (isEditing) {
    const existing = journalData[editingJournalIdx];
    entry._docId = existing._docId;
    visitId = entry._docId;
    if (entry._docId) {
      await updateJournalInFirestore(entry._docId, entry);
    } else {
      // Ancienne visite sans _docId → on la crée dans Firestore maintenant
      const docRef = await addJournalToFirestore(entry);
      if (docRef) { entry._docId = docRef.id; visitId = docRef.id; }
    }
    editingJournalIdx = null;
    // Le listener onSnapshot va reconstruire journalData automatiquement
  } else {
    const docRef = await addJournalToFirestore(entry);
    if (docRef) { entry._docId = docRef.id; visitId = docRef.id; }
    // NE PAS faire journalData.unshift() ici — le listener onSnapshot est
    // la seule source de vérité et va ajouter l'entrée depuis Firestore.
    // Cela évite tout doublon.
  }

  /* ---- Upload médias ---- */
  if (visitId) {
    try {
      if (isEditing) {
        // Supprimer uniquement les métadonnées Firestore des photos (pas les fichiers Storage),
        // car certaines photos existantes sont conservées et seront ré-enregistrées.
        await deleteAllVisitPhotosMetadata(visitId);

        // Pour l'audio : supprimer de Storage + Firestore seulement si un nouveau
        // enregistrement remplace l'ancien. Sinon, juste supprimer les métadonnées.
        if (currentVisitAudio?.blob) {
          await deleteVisitAudio(visitId); // supprime Storage + Firestore
        } else {
          await deleteVisitAudioMetadata(visitId); // supprime Firestore seulement
        }
      }

      // ---- Photos ----
      if (currentVisitPhotos.length) {
        visitPhotos[visitId] = [];
        for (const p of currentVisitPhotos) {
          const filename = `visit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
          let url;

          if (p.blob) {
            // Nouvelle photo → uploader vers Firebase Storage
            url = await uploadVisitPhotoToFirestore(visitId, p.blob, filename);

          } else if (p.dataUrl?.startsWith('data:')) {
            // Ancienne photo base64 (avant migration Storage) → migrer vers Storage
            const blob = dataUrlToBlob(p.dataUrl);
            url = await uploadVisitPhotoToFirestore(visitId, blob, filename);

          } else if (p.dataUrl) {
            // Photo déjà dans Storage (URL https://) → ré-enregistrer métadonnées Firestore
            // sans re-uploader le fichier (évite de dupliquer dans Storage)
            await reRegisterVisitPhoto(visitId, p.dataUrl);
            url = p.dataUrl;
          }

          if (url) visitPhotos[visitId].push(url);
        }
      } else if (isEditing) {
        delete visitPhotos[visitId];
      }

      // ---- Audio ----
      if (currentVisitAudio?.blob) {
        // Nouveau enregistrement → uploader vers Firebase Storage
        const url = await uploadVisitAudioToFirestore(visitId, currentVisitAudio.blob, currentVisitAudio.duration);
        visitAudio[visitId] = { data: url, duration: currentVisitAudio.duration };

      } else if (currentVisitAudio?.dataUrl) {
        // Audio existant à conserver
        if (currentVisitAudio.dataUrl.startsWith('data:') && isEditing) {
          // Ancien base64 → migrer vers Storage
          const blob = dataUrlToBlob(currentVisitAudio.dataUrl);
          const url  = await uploadVisitAudioToFirestore(visitId, blob, currentVisitAudio.duration);
          visitAudio[visitId] = { data: url, duration: currentVisitAudio.duration };
        } else {
          // URL Storage existante → ré-enregistrer dans Firestore + mettre à jour le cache
          if (isEditing) await reRegisterVisitAudio(visitId, currentVisitAudio.dataUrl, currentVisitAudio.duration);
          visitAudio[visitId] = { data: currentVisitAudio.dataUrl, duration: currentVisitAudio.duration };
        }

      } else if (isEditing) {
        delete visitAudio[visitId];
      }

    } catch (err) { console.error('Erreur upload médias visite:', err); }
  }

  // ---- Sync rucher : mise à jour nb ruches + ruchettes depuis la visite ----
  if (entry.nbRuches > 0) {
    const rIdx = RUCHERS.findIndex(r => r.id === entry.rucher);
    if (rIdx !== -1) {
      RUCHERS[rIdx].nb          = entry.nbRuches;
      RUCHERS[rIdx].nbRuchettes = entry.nbRuchettes || 0;
      await saveRucherToFirestore(RUCHERS[rIdx]);
      saveRuchers();
      renderRuchers();
      renderAllSelects();
    }
  }

  closeModal('modal-journal');
  resetJournalForm();
  renderJournal();
  updateDashboard();
  drawChartVisites();

  // Proposer l'ajout au calendrier si un rappel a été défini
  if (entry.rappel) {
    const savedIdx = isEditing ? journalData.indexOf(entry) : 0;
    showICSPrompt(entry.rappel, getRucherLabel(entry.rucher), savedIdx);
  } else {
    toast(isEditing ? '✅ Visite mise à jour !' : '✅ Visite enregistrée !');
  }
}

/* ---- RESET FORMULAIRE ---- */
function resetJournalForm() {
  document.getElementById('j-obs').value    = '';
  document.getElementById('j-rucher').value = '';
  document.getElementById('j-force').value  = '';
  document.getElementById('j-nb-ruches').textContent    = '0';
  document.getElementById('j-nb-ruchettes').textContent = '0';

  document.querySelectorAll('#j-interventions-grid .check-item').forEach(el => el.classList.remove('checked'));
  document.querySelectorAll('#j-marquage-grid .marquage-item').forEach(el => {
    el.classList.remove('checked');
    const inp = el.querySelector('.champ-libre-input');
    if (inp) inp.value = '';
  });
  document.querySelectorAll('#j-force-btns .qbtn').forEach(b => b.classList.remove('selected'));

  // Rappel
  const rtEl = document.getElementById('j-rappel-texte');
  const rjEl = document.getElementById('j-rappel-jours');
  if (rtEl) rtEl.value = '';
  if (rjEl) rjEl.value = '';
  document.querySelectorAll('.rappel-chip').forEach(b => b.classList.remove('selected'));

  // Médias
  stopRecording();
  currentVisitPhotos = [];
  currentVisitAudio  = null;
  renderVisitPhotoPreviews();
  const audioPreview = document.getElementById('j-audio-preview');
  if (audioPreview) audioPreview.innerHTML = '';
  const recordTimer = document.getElementById('j-record-timer');
  if (recordTimer) recordTimer.textContent = '';

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

  const marquageBadges = v.marquage?.length
    ? v.marquage.map(m => `<span class="badge badge-marquage">🪨 ${m}</span>`).join('')
    : '';

  const intv = v.interventions?.length
    ? v.interventions.map(x => `<span class="badge badge-action">${x}</span>`).join('')
    : `<span class="badge badge-couvain">${v.intervention || '—'}</span>`;

  const ruchettesBadge = v.nbRuchettes > 0
    ? `<span class="badge" style="background:#FFF3E0;color:#E65100;">🪣 ${v.nbRuchettes} ruchette${v.nbRuchettes > 1 ? 's' : ''}</span>`
    : '';

  const hasPhotos = v._docId && visitPhotos[v._docId]?.length > 0;
  const hasAudio  = v._docId && visitAudio[v._docId];
  const mediaBadges = [
    hasPhotos ? `<span class="badge" style="background:#E8F5E9;color:#2E7D32;">📸 ${visitPhotos[v._docId].length}</span>` : '',
    hasAudio  ? `<span class="badge" style="background:#E3F2FD;color:#1565C0;">🎙</span>` : '',
  ].filter(Boolean).join('');

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
        ${mediaBadges}
      </div>
      ${v.obs ? `<div class="entry-sub" style="margin-top:6px;">💬 ${v.obs}</div>` : ''}
      ${v.rappel && !v.rappel.fait ? `
      <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;
        background:#FFF8E1;border-radius:8px;padding:6px 10px;">
        <span style="font-size:0.75rem;color:#8B4513;">📌 ${v.rappel.texte} — ${v.rappel.echeance}</span>
        <button class="rappel-cal-btn" style="border:none;background:none;font-size:0.9rem;cursor:pointer;padding:0;"
          onclick="event.stopPropagation();exportRappelByIdx(${idx})" title="Ajouter au calendrier">📅</button>
      </div>` : ''}
    </div>`;
}

/* ---- SUPPRESSION ---- */
function confirmDelJournal(docId, i) {
  showConfirm('Supprimer cette visite ?', () => delJournal(docId, i));
}

async function delJournal(docId, i) {
  if (docId) {
    await deleteJournalFromFirestore(docId);
    await deleteAllVisitPhotos(docId);
    await deleteVisitAudio(docId);
  }
  journalData.splice(i, 1);
  localStorage.setItem('journal', JSON.stringify(journalData));
  renderJournal(); updateDashboard(); drawChartVisites();
  toast('🗑 Visite supprimée');
}

/* ---- COMPTE RENDU ---- */
function openCompteRendu(idx) {
  const v = journalData[idx];
  if (!v) return;
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

  if (v.force && v.force !== '—') html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">État général du rucher</div>
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

  // Photos de la visite
  const visitId = v._docId;
  if (visitId && visitPhotos[visitId]?.length) {
    html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Photos</div>
      <div class="photo-scroll" style="padding:0;gap:8px;">
        ${visitPhotos[visitId].map(url =>
          `<img src="${url}" class="photo-thumb" onclick="openLightbox('${url}')" style="cursor:pointer;">`
        ).join('')}
      </div>
    </div>`;
  }

  // Mémo vocal
  if (visitId && visitAudio[visitId]) {
    const { data, duration } = visitAudio[visitId];
    const am = Math.floor(duration / 60).toString().padStart(2, '0');
    const as_ = (duration % 60).toString().padStart(2, '0');
    html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Mémo vocal</div>
      <div class="audio-preview">
        <audio controls src="${data}" style="width:100%;height:36px;"></audio>
        <span style="font-size:0.72rem;color:var(--soft);margin-top:4px;display:block;">🎙 ${am}:${as_}</span>
      </div>
    </div>`;
  }

  // Rappel
  if (v.rappel && !v.rappel.fait) {
    html += `
    <div style="margin-bottom:12px;">
      <div class="cr-label">Rappel</div>
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#FFF8E1;border-radius:10px;padding:10px 12px;">
        <div>
          <div style="font-size:0.88rem;font-weight:600;color:var(--ink);">${v.rappel.texte}</div>
          <div style="font-size:0.72rem;color:var(--mid);margin-top:2px;">📅 ${v.rappel.echeance} (J+${v.rappel.jours})</div>
        </div>
        <button onclick="exportRappelByIdx(${idx})"
          style="background:var(--honey);color:#fff;border:none;border-radius:10px;
            padding:7px 12px;font-size:0.8rem;font-weight:700;cursor:pointer;white-space:nowrap;">
          📅 Calendrier
        </button>
      </div>
    </div>`;
  }

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

  // État général — cocher le bouton
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

  // Pré-remplir rappel
  const rtEl = document.getElementById('j-rappel-texte');
  const rjEl = document.getElementById('j-rappel-jours');
  if (rtEl) rtEl.value = v.rappel?.texte || '';
  if (rjEl) rjEl.value = v.rappel?.jours || '';
  document.querySelectorAll('.rappel-chip').forEach(b => {
    b.classList.toggle('selected', v.rappel?.jours === parseInt(b.textContent.replace('J+', '')));
  });

  // Pré-charger les médias existants
  const visitId = v._docId;
  currentVisitPhotos = [];
  currentVisitAudio  = null;
  if (visitId && visitPhotos[visitId]?.length) {
    currentVisitPhotos = visitPhotos[visitId].map(dataUrl => ({ dataUrl, isNew: false }));
  }
  if (visitId && visitAudio[visitId]) {
    currentVisitAudio = { dataUrl: visitAudio[visitId].data, duration: visitAudio[visitId].duration };
  }

  openModal('modal-journal');
  // Rendu différé pour laisser le DOM s'afficher
  setTimeout(() => {
    renderVisitPhotoPreviews();
    renderAudioPreview();
  }, 50);
}
