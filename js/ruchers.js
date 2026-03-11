/* ============================================================
   ruchers.js — Gestion des ruchers
   v1.1 — Fix photos + modal édition rucher
   ============================================================ */

let editingRucherIdx = null;

function renderRuchers() {
  const list = document.getElementById('ruchers-list');
  if (!RUCHERS.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📍</div>
        <p>Aucun rucher.<br>Appuyez sur + pour en ajouter.</p>
      </div>`;
    return;
  }

  list.innerHTML = RUCHERS.map((r, idx) => {
    const photos   = rucherPhotos[r.id] || [];
    const zoneCls  = r.zone === 'Bas' ? 'badge-zone-bas'
                   : r.zone === 'Mi-pentes' ? 'badge-zone-mi'
                   : 'badge-zone-hauts';
    const zoneLabel= r.zone === 'Bas' ? 'Bas 0–400m'
                   : r.zone === 'Mi-pentes' ? 'Mi-pentes 400–800m'
                   : 'Hauts 800m+';
    const coords   = r.lat
      ? `<span style="font-size:0.68rem;color:var(--soft);font-family:'DM Mono',monospace;">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</span>`
      : '';
    const photosId = `photos-${r.id}`;

    return `
      <div class="rucher-card">
        <div class="rucher-head">
          <span class="rucher-rid">${r.id} — ${r.lieu}</span>
          <div class="rucher-head-actions">
            <span class="rucher-nb">🐝 ${r.nb !== null ? r.nb : '—'}</span>
            <button class="btn-rucher-action" title="Modifier"
              onclick="openEditRucher(${idx})">✏️</button>
            <button class="btn-rucher-action" title="Supprimer"
              onclick="deleteRucher(${idx})">🗑️</button>
          </div>
        </div>
        <div class="rucher-body">
          <div class="rucher-meta">
            <span class="rucher-alt">⛰ ${r.alt}m · ${r.cp}</span>
            <span class="badge ${zoneCls}">${zoneLabel}</span>
            ${coords}
          </div>
          <div style="font-size:0.7rem;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Photos</div>
          <div class="photo-scroll" id="${photosId}">
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

  RUCHERS.forEach(r => {
    const photos    = rucherPhotos[r.id] || [];
    const container = document.getElementById(`photos-${r.id}`);
    if (!container) return;
    const addBtn = container.querySelector('label');
    photos.forEach((src, pi) => {
      const img       = document.createElement('img');
      img.className   = 'photo-thumb';
      img.alt         = `Photo ${pi + 1}`;
      img.src         = src;
      img.addEventListener('click', () => openLightbox(src));
      container.insertBefore(img, addBtn);
    });
  });
}

async function deleteRucher(idx) {
  const r = RUCHERS[idx];
  if (!confirm(`Supprimer le rucher ${r.id} — ${r.lieu} ?\n\nLes visites associées ne seront pas supprimées.`)) return;
  await deleteRucherFromFirestore(r.id);
  RUCHERS.splice(idx, 1);
  saveRuchers();
  renderRuchers();
  renderAllSelects();
  updateDashboard();
  if (mapInstance) initMap();
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
  renderRuchers();
  renderAllSelects();
  updateDashboard();
  if (mapInstance) initMap();
  toast(`✅ Rucher ${id} ajouté !`);
}

function openEditRucher(idx) {
  editingRucherIdx = idx;
  const r = RUCHERS[idx];
  document.getElementById('er-id').value   = r.id;
  document.getElementById('er-lieu').value = r.lieu;
  document.getElementById('er-cp').value   = r.cp   || '';
  document.getElementById('er-alt').value  = r.alt  || '';
  document.getElementById('er-zone').value = r.zone || 'Bas';
  document.getElementById('er-nb').value   = r.nb   !== null ? r.nb : '';
  document.getElementById('er-lat').value  = r.lat  || '';
  document.getElementById('er-lng').value  = r.lng  || '';
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
  renderRuchers();
  renderAllSelects();
  updateDashboard();
  if (mapInstance) initMap();
  toast(`✅ Rucher ${oldId} mis à jour !`);
}

function buildRucherFromForm(prefix) {
  return {
    id:   document.getElementById(prefix + '-id').value.trim().toUpperCase(),
    lieu: document.getElementById(prefix + '-lieu').value.trim(),
    cp:   document.getElementById(prefix + '-cp').value  || '974xx',
    alt:  parseInt(document.getElementById(prefix + '-alt').value) || 0,
    zone: document.getElementById(prefix + '-zone').value,
    nb:   parseInt(document.getElementById(prefix + '-nb').value)  || null,
    lat:  parseFloat(document.getElementById(prefix + '-lat').value) || null,
    lng:  parseFloat(document.getElementById(prefix + '-lng').value) || null,
  };
}

function clearRucherForm(prefix) {
  ['id', 'lieu', 'cp', 'alt', 'nb', 'lat', 'lng'].forEach(f => {
    document.getElementById(prefix + '-' + f).value = '';
  });
}

function renderAllSelects() {
  const opts    = RUCHERS.map(r => `<option value="${r.id}">${r.id} — ${r.lieu}</option>`).join('');
  const optsAll = `<option value="">—</option>` + opts;
  document.getElementById('j-rucher').innerHTML = optsAll;
  document.getElementById('s-rucher').innerHTML = optsAll + '<option value="Tous">Tous</option>';
  document.getElementById('flt-rucher').innerHTML = `<option value="">Tous ruchers</option>` + opts;
}

function addPhoto(rid, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  if (!rucherPhotos[rid]) rucherPhotos[rid] = [];
  let loaded = 0;
  files.forEach(file => {
    if (file.size > 2 * 1024 * 1024) {
      toast(`⚠️ Photo trop lourde (max 2 Mo)`);
      loaded++;
      if (loaded === files.length) renderRuchers();
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      rucherPhotos[rid].push(e.target.result);
      loaded++;
      if (loaded === files.length) {
        localStorage.setItem('rucherPhotos', JSON.stringify(rucherPhotos));
        renderRuchers();
        toast(`📸 ${files.length} photo(s) ajoutée(s) !`);
      }
    };
    reader.onerror = () => {
      toast('❌ Erreur lecture photo');
      loaded++;
      if (loaded === files.length) renderRuchers();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderCalendrier() {
  document.getElementById('cal-body').innerHTML = CAL.map(row => {
    if (row.zone) return `<tr class="zone-row"><td colspan="13">${row.zone}</td></tr>`;
    return `<tr>
      <td class="col-p">${row.p}</td>
      ${row.m.map(v =>
        v === '+' ? `<td><span class="cm">+</span></td>` :
        v === '/' ? `<td><span class="ca">/</span></td>` :
                    `<td style="color:var(--border)">·</td>`
      ).join('')}
    </tr>`;
  }).join('');
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
                const key = `${r.id}_${t.key}_${mi}`;
                const on  = transData[key];
                return `
                  <button class="month-cell ${on ? 'on-' + t.key : ''}"
                    onclick="toggleTrans('${key}','${t.key}',this)">
                    <span class="m-label">${m.substring(0, 1)}</span>
                    <span>${on ? t.key : ''}</span>
                  </button>`;
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
