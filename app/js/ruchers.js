/* ============================================================
   ruchers.js — Gestion des ruchers
   v1.3 — Ajout nbRuchettes, photos via Firebase Storage
   ============================================================ */

let editingRucherIdx = null;

function renderRuchers() {
  const list = document.getElementById('ruchers-list');
  if (!RUCHERS.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📍</div>
      <p>Aucun rucher.<br>Appuyez sur + pour en ajouter.</p></div>`;
    return;
  }

  list.innerHTML = RUCHERS.map((r, idx) => {
    const photos  = rucherPhotos[r.id] || [];
    const zoneCls = r.zone === 'Bas'       ? 'badge-zone-bas'
                  : r.zone === 'Mi-pentes' ? 'badge-zone-mi'
                  : 'badge-zone-hauts';
    const zoneLabel = r.zone === 'Bas'       ? 'Bas 0–400m'
                    : r.zone === 'Mi-pentes' ? 'Mi-pentes 400–800m'
                    : 'Hauts 800m+';
    const coords = r.lat
      ? `<span style="font-size:0.68rem;color:var(--soft);font-family:'DM Mono',monospace;">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</span>`
      : '';

    return `
      <div class="rucher-card">
        <div class="rucher-head">
          <span class="rucher-rid">${r.id} — ${r.lieu}</span>
          <div class="rucher-head-actions">
            <span class="rucher-nb">🐝 ${r.nb !== null && r.nb !== undefined ? r.nb : '—'}</span>
            ${r.nbRuchettes ? `<span class="rucher-nb" style="color:#E65100;">🪣 ${r.nbRuchettes}</span>` : ''}
            <button class="btn-rucher-action" title="Modifier" onclick="openEditRucher(${idx})">✏️</button>
            <button class="btn-rucher-action" title="Supprimer" onclick="confirmDeleteRucher(${idx})">🗑️</button>
          </div>
        </div>
        <div class="rucher-body">
          <div class="rucher-meta">
            <span class="rucher-alt">⛰ ${r.alt}m · ${r.cp}</span>
            <span class="badge ${zoneCls}">${zoneLabel}</span>
            ${coords}
          </div>
          <div style="font-size:0.7rem;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Photos</div>
          <div class="photo-scroll" id="photos-${r.id}">
            <label class="photo-add" title="Ajouter des photos">
              <span style="font-size:1.4rem;">＋</span>
              <span>Photo</span>
              <input type="file" accept="image/*" multiple style="display:none"
                onchange="addPhoto('${r.id}', this)">
            </label>
          </div>
        </div>
      </div>`;
  }).join('');

  // Charger les photos après rendu
  RUCHERS.forEach(r => {
    const photos    = rucherPhotos[r.id] || [];
    const container = document.getElementById(`photos-${r.id}`);
    if (!container) return;
    const addBtn = container.querySelector('label');
    photos.forEach((src, pi) => {
      const img     = document.createElement('img');
      img.className = 'photo-thumb';
      img.alt       = `Photo ${pi + 1}`;
      img.src       = src;
      img.addEventListener('click', () => openLightbox(src));
      container.insertBefore(img, addBtn);
    });
  });
}

function confirmDeleteRucher(idx) {
  const r = RUCHERS[idx];
  showConfirm(`Supprimer le rucher ${r.id} — ${r.lieu} ?`, () => deleteRucher(idx));
}

async function deleteRucher(idx) {
  const r = RUCHERS[idx];
  await deleteRucherFromFirestore(r.id);
  await deleteAllPhotosOfRucher(r.id); // nettoyage photos Firestore
  RUCHERS.splice(idx, 1);
  saveRuchers();
  renderRuchers(); renderAllSelects(); updateDashboard();
  if (typeof mapInstance !== 'undefined' && mapInstance) initMap();
  toast(`🗑 Rucher ${r.id} supprimé`);
}

async function saveNewRucher() {
  const id   = document.getElementById('nr-id').value.trim().toUpperCase();
  const lieu = document.getElementById('nr-lieu').value.trim();
  if (!id || !lieu)                   { toast('⚠️ ID et lieu-dit obligatoires'); return; }
  if (RUCHERS.find(r => r.id === id)) { toast('⚠️ Cet ID existe déjà');          return; }
  const newRucher = buildRucherFromForm('nr');
  await saveRucherToFirestore(newRucher);
  RUCHERS.push(newRucher);
  saveRuchers();
  closeModal('modal-rucher');
  clearRucherForm('nr');
  renderRuchers(); renderAllSelects(); updateDashboard();
  if (typeof mapInstance !== 'undefined' && mapInstance) initMap();
  toast(`✅ Rucher ${id} ajouté !`);
}

function openEditRucher(idx) {
  editingRucherIdx = idx;
  const r = RUCHERS[idx];
  document.getElementById('er-id').value          = r.id;
  document.getElementById('er-lieu').value         = r.lieu;
  document.getElementById('er-cp').value           = r.cp   || '';
  document.getElementById('er-alt').value          = r.alt  || '';
  document.getElementById('er-zone').value         = r.zone || 'Bas';
  document.getElementById('er-nb').value           = r.nb   !== null && r.nb !== undefined ? r.nb : '';
  document.getElementById('er-nb-ruchettes').value = r.nbRuchettes || '';
  document.getElementById('er-lat').value          = r.lat  || '';
  document.getElementById('er-lng').value          = r.lng  || '';
  // Réinitialiser le bouton GPS et le hint
  const btn  = document.getElementById('btn-gps-er');
  const hint = document.getElementById('gps-hint-er');
  if (btn)  { btn.innerHTML = '📍 Ma position GPS actuelle'; btn.disabled = false; }
  if (hint) {
    hint.style.display = (r.lat && r.lng) ? 'block' : 'none';
    if (r.lat && r.lng) hint.textContent = `📍 Coordonnées enregistrées : ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;
  }
  openModal('modal-edit-rucher');
}

async function saveEditRucher() {
  if (editingRucherIdx === null) return;
  const oldId = RUCHERS[editingRucherIdx].id;
  const lieu  = document.getElementById('er-lieu').value.trim();
  if (!lieu) { toast('⚠️ Le lieu-dit est obligatoire'); return; }
  const updated = buildRucherFromForm('er');
  updated.id = oldId;
  await saveRucherToFirestore(updated);
  RUCHERS[editingRucherIdx] = updated;
  saveRuchers();
  closeModal('modal-edit-rucher');
  editingRucherIdx = null;
  renderRuchers(); renderAllSelects(); updateDashboard();
  if (typeof mapInstance !== 'undefined' && mapInstance) initMap();
  toast(`✅ Rucher ${oldId} mis à jour !`);
}

function buildRucherFromForm(prefix) {
  return {
    id:           document.getElementById(prefix + '-id').value.trim().toUpperCase(),
    lieu:         document.getElementById(prefix + '-lieu').value.trim(),
    cp:           document.getElementById(prefix + '-cp').value   || '974xx',
    alt:          parseInt(document.getElementById(prefix + '-alt').value) || 0,
    zone:         document.getElementById(prefix + '-zone').value,
    nb:           parseInt(document.getElementById(prefix + '-nb').value)  || null,
    nbRuchettes:  parseInt(document.getElementById(prefix + '-nb-ruchettes').value) || 0,
    lat:          parseFloat(document.getElementById(prefix + '-lat').value) || null,
    lng:          parseFloat(document.getElementById(prefix + '-lng').value) || null,
  };
}

function clearRucherForm(prefix) {
  ['id','lieu','cp','alt','nb','nb-ruchettes','lat','lng'].forEach(f => {
    document.getElementById(prefix + '-' + f).value = '';
  });
}

function toggleSign(inputId) {
  const el  = document.getElementById(inputId);
  const val = el.value.trim();
  if (!val || isNaN(parseFloat(val))) return;
  el.value  = val.startsWith('-') ? val.slice(1) : '-' + val;
}

/**
 * Capture la position GPS actuelle et remplit les champs lat/lng
 * du formulaire rucher identifié par le préfixe (nr ou er).
 */
function grabGPSForRucher(prefix) {
  const btn = document.getElementById(`btn-gps-${prefix}`);
  const hint = document.getElementById(`gps-hint-${prefix}`);
  if (!navigator.geolocation) {
    toast('⚠️ Géolocalisation non disponible sur cet appareil');
    return;
  }
  if (btn) { btn.innerHTML = '⏳ Localisation…'; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const acc = Math.round(pos.coords.accuracy);
      document.getElementById(`${prefix}-lat`).value = lat;
      document.getElementById(`${prefix}-lng`).value = lng;
      if (hint) {
        hint.textContent = `📍 Position enregistrée — précision ±${acc}m`;
        hint.style.color = acc <= 20 ? 'var(--green, #4CAF50)' : 'var(--soft)';
        hint.style.display = 'block';
      }
      if (btn) { btn.innerHTML = '✅ Position enregistrée'; btn.disabled = false; }
      toast(`📍 GPS capturé — précision ±${acc}m`);
    },
    (err) => {
      console.warn('GPS error:', err);
      const msg = err.code === 1 ? 'Accès GPS refusé' : 'Position GPS indisponible';
      toast(`⚠️ ${msg}`);
      if (btn) { btn.innerHTML = '📍 Ma position GPS'; btn.disabled = false; }
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

function renderAllSelects() {
  const opts    = RUCHERS.map(r => `<option value="${r.id}">${r.id} — ${r.lieu}</option>`).join('');
  const optsAll = `<option value="">—</option>` + opts;
  document.getElementById('j-rucher').innerHTML    = optsAll;
  document.getElementById('s-rucher').innerHTML    = optsAll + '<option value="Tous">Tous</option>';
  document.getElementById('flt-rucher').innerHTML  = `<option value="">Tous ruchers</option>` + opts;
}

/* ---- PHOTOS — Firestore base64 ---- */
async function addPhoto(rid, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  toast('📸 Compression en cours…');
  if (!rucherPhotos[rid]) rucherPhotos[rid] = [];
  let processed = 0;
  for (const file of files) {
    try {
      const blob     = await compressImage(file);
      const filename = `${Date.now()}_${Math.random().toString(36).substr(2,6)}.jpg`;
      const dataUrl  = await uploadPhotoToFirestore(rid, blob, filename);
      rucherPhotos[rid].push(dataUrl);
      processed++;
    } catch (err) {
      console.error('Erreur upload photo:', err);
      toast(`⚠️ Erreur photo : ${err.message}`);
    }
  }
  if (processed > 0) {
    renderRuchers();
    toast(`✅ ${processed} photo(s) ajoutée(s) !`);
  }
  input.value = '';
}

// ============================================================
// CALENDRIER UNIFIÉ — Référence + Perso + Semaines
// ============================================================

let customPlantes   = JSON.parse(localStorage.getItem('customPlantes')     || '[]');
let deletedRefNames = JSON.parse(localStorage.getItem('deletedRefPlantes') || '[]');
let expandedMonths  = new Set();

function _zoneFromHeader(h) {
  const l = h.toLowerCase();
  if (l.includes('pente') || l.includes('400')) return 'Mi-pente';
  if (l.includes('haut')  || l.includes('800')) return 'Haut';
  return 'Bas';
}

function _buildUnifiedPlantes() {
  const list = [];
  let zone = 'Bas';
  CAL.forEach(row => {
    if (row.zone) { zone = _zoneFromHeader(row.zone); return; }
    if (deletedRefNames.includes(row.p)) return;
    list.push({ p: row.p, zone, refM: row.m, isRef: true });
  });
  customPlantes.forEach(cp => list.push({ ...cp, isRef: false }));
  return list;
}

function toggleCalMonth(idx) {
  expandedMonths.has(idx) ? expandedMonths.delete(idx) : expandedMonths.add(idx);
  renderCalendrier();
}

function toggleWeekCell(pi, wi) {
  const list = _buildUnifiedPlantes();
  const plant = list[pi];
  if (plant.isRef) return;
  const cp = customPlantes.find(c => c.p === plant.p);
  if (!cp) return;
  if (!cp.weeks) cp.weeks = new Array(48).fill(0);
  cp.weeks[wi] = cp.weeks[wi] ? 0 : 1;
  saveCustomPlantes();
  renderCalendrier();
}

function deletePlanteFromCal(pi) {
  const list = _buildUnifiedPlantes();
  const plant = list[pi];
  showConfirm(`Supprimer "${plant.p}" ?`, () => {
    if (plant.isRef) {
      deletedRefNames.push(plant.p);
      localStorage.setItem('deletedRefPlantes', JSON.stringify(deletedRefNames));
      if (currentUser && typeof saveDeletedRefToFirestore === 'function') saveDeletedRefToFirestore();
    } else {
      const i = customPlantes.findIndex(c => c.p === plant.p);
      if (i > -1) customPlantes.splice(i, 1);
      saveCustomPlantes();
    }
    renderCalendrier();
  });
}

function addNewPlanteInline() {
  const nomEl  = document.getElementById('np-nom');
  const zoneEl = document.getElementById('np-zone');
  const nom    = nomEl ? nomEl.value.trim() : '';
  if (!nom) { toast('⚠️ Entrez un nom de plante'); return; }
  customPlantes.push({ p: nom, zone: zoneEl ? zoneEl.value : 'Bas', weeks: new Array(48).fill(0) });
  saveCustomPlantes();
  if (nomEl) nomEl.value = '';
  renderCalendrier();
  toast('✅ Plante ajoutée');
}

function saveCustomPlantes() {
  localStorage.setItem('customPlantes', JSON.stringify(customPlantes));
  if (currentUser && typeof saveCustomPlantesToFirestore === 'function') saveCustomPlantesToFirestore();
}

function renderCalendrier() {
  const container = document.getElementById('cal-container');
  if (!container) return;

  const list   = _buildUnifiedPlantes();
  const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  /* En-tête */
  let thead = '<tr><th class="col-p">Plante</th><th style="font-size:.65rem;padding:4px 2px;white-space:nowrap;">Zone</th>';
  MONTHS.forEach((m, i) => {
    if (expandedMonths.has(i)) {
      thead += `<th colspan="4" onclick="toggleCalMonth(${i})" style="cursor:pointer;background:var(--honey-pale);color:var(--honey);text-align:center;padding:4px 1px;font-size:.7rem;">${m}▲<br><span style="font-size:.55rem;color:var(--mid)">S1·S2·S3·S4</span></th>`;
    } else {
      thead += `<th onclick="toggleCalMonth(${i})" style="cursor:pointer;" title="Tap pour les semaines">${m}</th>`;
    }
  });
  thead += '<th></th></tr>';

  /* Corps */
  let tbody = '';
  list.forEach((plant, pi) => {
    let cells = '';
    MONTHS.forEach((m, mi) => {
      if (expandedMonths.has(mi)) {
        for (let w = 0; w < 4; w++) {
          const wi = mi * 4 + w;
          if (plant.isRef) {
            const v = plant.refM[mi];
            cells += `<td style="text-align:center;opacity:.4;font-size:.7rem;">${v === '+' ? '<span class="cm">+</span>' : v === '/' ? '<span class="ca">/</span>' : '·'}</td>`;
          } else {
            const on = plant.weeks && plant.weeks[wi];
            cells += `<td onclick="toggleWeekCell(${pi},${wi})" style="cursor:pointer;text-align:center;padding:6px 1px;min-width:18px;background:${on ? 'rgba(212,130,10,.15)' : 'transparent'};border-radius:3px;">${on ? '<span class="cm">·</span>' : '<span style="color:var(--border)">·</span>'}</td>`;
          }
        }
      } else {
        if (plant.isRef) {
          const v = plant.refM[mi];
          cells += `<td style="text-align:center">${v === '+' ? '<span class="cm">+</span>' : v === '/' ? '<span class="ca">/</span>' : '<span style="color:var(--border)">·</span>'}</td>`;
        } else {
          const any = plant.weeks && plant.weeks.slice(mi*4, mi*4+4).some(Boolean);
          cells += `<td style="text-align:center">${any ? '<span class="cm">·</span>' : '<span style="color:var(--border)">·</span>'}</td>`;
        }
      }
    });
    const zoneShort = { 'Mi-pente': 'Mi', 'Haut': 'Ht', 'Bas': 'Bs' }[plant.zone] || '';
    tbody += `<tr>
      <td class="col-p">${plant.p}</td>
      <td style="text-align:center;font-size:.65rem;color:var(--mid);">${zoneShort}</td>
      ${cells}
      <td><button onclick="deletePlanteFromCal(${pi})" style="background:none;border:none;cursor:pointer;color:var(--soft);font-size:.75rem;">🗑</button></td>
    </tr>`;
  });

  /* Ligne ajout inline */
  const addRow = `<tr style="border-top:1.5px solid var(--honey-pale);">
    <td colspan="2" style="padding:6px 4px;">
      <input id="np-nom" type="text" placeholder="+ Nouvelle plante…"
        style="border:none;background:transparent;font-size:.82rem;width:100%;outline:none;color:var(--ink);font-family:'DM Sans',sans-serif;"
        onkeypress="if(event.key==='Enter') addNewPlanteInline()">
    </td>
    <td colspan="12" style="padding:4px;text-align:right;">
      <select id="np-zone" style="border:1px solid var(--border);border-radius:6px;font-size:.72rem;padding:3px 5px;background:var(--cream);color:var(--ink);">
        <option value="Bas">🏖 Bas</option>
        <option value="Mi-pente">⛰ Mi-pente</option>
        <option value="Haut">🏔 Haut</option>
      </select>
      <button onclick="addNewPlanteInline()" style="background:var(--honey);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:.75rem;cursor:pointer;margin-left:4px;">✓</button>
    </td>
    <td></td>
  </tr>`;

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="cal-table" style="min-width:100%;">
        <thead>${thead}</thead>
        <tbody>${tbody}${addRow}</tbody>
      </table>
    </div>
    <div style="margin-top:8px;font-size:0.7rem;color:var(--mid);padding:0 4px;">
      <span class="cm">+</span> Miellée principale &nbsp;·&nbsp;
      <span class="ca">/</span> Appoint &nbsp;·&nbsp;
      Tap sur un mois pour voir les semaines
    </div>`;
}

function renderTranshumance() {
  const types = [
    { key:'A', label:'🔺 Arrivée' },
    { key:'D', label:'🔻 Départ'  },
    { key:'R', label:'🍯 Récolte' },
  ];
  document.getElementById('trans-list').innerHTML = RUCHERS.map(r => `
    <div class="trans-rucher">
      <div class="trans-rid-header">
        <span>${r.id} — ${r.lieu}</span>
        <span style="font-size:0.72rem;color:var(--soft);">${r.nb || '?'} ruches</span>
      </div>
      <div class="trans-grid">
        ${types.map(t => `
          <div class="trans-type-row">
            <div class="trans-type-label">${t.label}</div>
            <div class="months-row">
              ${MONTHS.map((m, mi) => {
                const key = String(r.id) + '_' + t.key + '_' + mi;
                const on  = transData[key];
                return '<button class="month-cell ' + (on ? 'on-' + t.key : '') + '" onclick="toggleTrans(\'' + key + '\',\'' + t.key + '\',this)"><span class="m-label">' + m.substring(0, 1) + '</span><span>' + (on ? t.key : '') + '</span></button>';
              }).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function toggleTrans(key, type, btn) {
  if (transData[key]) {
    delete transData[key];
    btn.className = 'month-cell';
    btn.children[1].textContent = '';
  } else {
    transData[key] = true;
    btn.className  = `month-cell on-${type}`;
    btn.children[1].textContent = type;
  }
  localStorage.setItem('transData', JSON.stringify(transData));
  if (currentUser) saveTransToFirestore();
}
