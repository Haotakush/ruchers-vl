/* ============================================================
   ruchers.js — Gestion des ruchers

   Ce fichier gère :
   - Affichage de la liste des ruchers avec photos
   - Ajout d'un nouveau rucher
   - Suppression d'un rucher
   - Mise à jour des selects (filtres, formulaires)
   - Gestion des photos par rucher
   - Calendrier mellifère
   - Transhumance

   🔥 Persistance : Firestore (via firebase-db.js)
   ============================================================ */


/* ------------------------------------------------------------
   AFFICHAGE
   ------------------------------------------------------------ */

/** Rendre la liste de tous les ruchers avec leurs photos */
function renderRuchers() {
  const list = document.getElementById('ruchers-list');

  list.innerHTML = RUCHERS.map((r, idx) => {
    const photos   = rucherPhotos[r.id] || [];
    const zoneCls  = r.zone === 'Bas' ? 'badge-zone-bas' : r.zone === 'Mi-pentes' ? 'badge-zone-mi' : 'badge-zone-hauts';
    const zoneLabel= r.zone === 'Bas' ? 'Bas 0–400m' : r.zone === 'Mi-pentes' ? 'Mi-pentes 400–800m' : 'Hauts 800m+';
    const coords   = r.lat ? `<span style="font-size:0.68rem;color:var(--soft);font-family:'DM Mono',monospace;">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</span>` : '';

    return `
      <div class="rucher-card">
        <div class="rucher-head">
          <span class="rucher-rid">${r.id} — ${r.lieu}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="rucher-nb">🐝 ${r.nb !== null ? r.nb : '—'}</span>
            <button onclick="deleteRucher(${idx})"
              style="background:none;border:none;color:rgba(255,100,100,0.6);font-size:1rem;cursor:pointer;padding:2px 4px;">
              🗑
            </button>
          </div>
        </div>
        <div class="rucher-body">
          <div class="rucher-meta">
            <span class="rucher-alt">⛰ ${r.alt}m · ${r.cp}</span>
            <span class="badge ${zoneCls}">${zoneLabel}</span>
            ${coords}
          </div>
          <div style="font-size:0.7rem;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Photos</div>
          <div class="photo-scroll">
            ${photos.map(p => `<img class="photo-thumb" src="${p}" onclick="openLightbox('${p}')" alt="">`).join('')}
            <label class="photo-add">
              ＋
              <input type="file" accept="image/*" multiple style="display:none" onchange="addPhoto('${r.id}', this)">
            </label>
          </div>
        </div>
      </div>`;
  }).join('');
}


/* ------------------------------------------------------------
   SUPPRESSION
   ------------------------------------------------------------ */

async function deleteRucher(idx) {
  const r = RUCHERS[idx];
  if (!confirm(`Supprimer le rucher ${r.id} — ${r.lieu} ?\n\nLes visites associées ne seront pas supprimées.`)) return;

  // Supprimer de Firestore
  await deleteRucherFromFirestore(r.id);

  RUCHERS.splice(idx, 1);
  saveRuchers();
  renderRuchers();
  renderAllSelects();
  updateDashboard();
  if (mapInstance) initMap();
  toast(`🗑 Rucher ${r.id} supprimé`);
}


/* ------------------------------------------------------------
   AJOUT
   ------------------------------------------------------------ */

async function saveNewRucher() {
  const id   = document.getElementById('nr-id').value.trim().toUpperCase();
  const lieu = document.getElementById('nr-lieu').value.trim();

  if (!id || !lieu)              { toast('⚠️ ID et lieu-dit obligatoires'); return; }
  if (RUCHERS.find(r => r.id === id)) { toast('⚠️ Cet ID existe déjà');    return; }

  const newRucher = {
    id, lieu,
    cp:   document.getElementById('nr-cp').value  || '974xx',
    alt:  parseInt(document.getElementById('nr-alt').value) || 0,
    zone: document.getElementById('nr-zone').value,
    nb:   parseInt(document.getElementById('nr-nb').value)  || null,
    lat:  parseFloat(document.getElementById('nr-lat').value) || null,
    lng:  parseFloat(document.getElementById('nr-lng').value) || null,
  };

  // Sauvegarder dans Firestore
  await saveRucherToFirestore(newRucher);

  RUCHERS.push(newRucher);
  saveRuchers();
  closeModal('modal-rucher');

  ['nr-id', 'nr-lieu', 'nr-cp', 'nr-alt', 'nr-nb', 'nr-lat', 'nr-lng'].forEach(i => {
    document.getElementById(i).value = '';
  });

  renderRuchers();
  renderAllSelects();
  updateDashboard();
  if (mapInstance) initMap();
  toast(`✅ Rucher ${id} ajouté !`);
}


/* ------------------------------------------------------------
   SELECTS
   ------------------------------------------------------------ */

function renderAllSelects() {
  const opts    = RUCHERS.map(r => `<option value="${r.id}">${r.id} — ${r.lieu}</option>`).join('');
  const optsAll = `<option value="">—</option>` + opts;

  document.getElementById('j-rucher').innerHTML = optsAll;
  document.getElementById('s-rucher').innerHTML = optsAll + '<option value="Tous">Tous</option>';
  document.getElementById('flt-rucher').innerHTML = `<option value="">Tous ruchers</option>` + opts;
}


/* ------------------------------------------------------------
   PHOTOS (restent en localStorage — trop lourd pour Firestore)
   ------------------------------------------------------------ */

function addPhoto(rid, input) {
  const files = Array.from(input.files);
  if (!files.length) return;

  if (!rucherPhotos[rid]) rucherPhotos[rid] = [];
  let loaded = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      rucherPhotos[rid].push(e.target.result);
      loaded++;
      if (loaded === files.length) {
        localStorage.setItem('rucherPhotos', JSON.stringify(rucherPhotos));
        renderRuchers();
        toast(`📸 ${loaded} photo(s) ajoutée(s) !`);
      }
    };
    reader.readAsDataURL(file);
  });
}


/* ------------------------------------------------------------
   CALENDRIER MELLIFÈRE
   ------------------------------------------------------------ */

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


/* ------------------------------------------------------------
   TRANSHUMANCE
   ------------------------------------------------------------ */

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
    btn.className           = 'month-cell';
    btn.children[1].textContent = '';
  } else {
    transData[key]              = true;
    btn.className           = `month-cell on-${type}`;
    btn.children[1].textContent = type;
  }
  localStorage.setItem('transData', JSON.stringify(transData));

  // Sauvegarder dans Firestore
  if (currentUser) saveTransToFirestore();
}
