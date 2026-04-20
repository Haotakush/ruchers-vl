/* ============================================================
   mouvements.js — Journal des mouvements de colonies
   v2.0 — Conforme arrêté du 5 juin 2000, section 5
   Champs obligatoires : date, rucher_origine, destination,
   nb_colonies, motif
   Nouveauté v2.0 : mini-carte Leaflet + GPS destination
   ============================================================ */

let editingMouvIdx  = null;
let mouvMapInstance = null;
let _isSavingMouv   = false;
let _mouvMarkers    = [];
let _mouvLines      = [];

/* ============================================================
   CARTE DES MOUVEMENTS
   ============================================================ */

/**
 * Parse une chaîne de type "lat, lng" ou "-21.123,55.456"
 * Retourne { lat, lng } ou null.
 */
function parseDestCoords(str) {
  if (!str) return null;
  const m = str.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Initialise (ou réinitialise) la mini-carte des mouvements. */
function initMouvMap() {
  const container = document.getElementById('mouv-map-container');
  const el = document.getElementById('mouv-map');
  if (!el) return;

  // Destroy si déjà initialisée
  if (mouvMapInstance) {
    mouvMapInstance.remove();
    mouvMapInstance = null;
  }
  _mouvMarkers = [];
  _mouvLines   = [];

  mouvMapInstance = L.map('mouv-map', {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([-21.115, 55.536], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(mouvMapInstance);

  renderMouvMap();

  setTimeout(() => {
    if (mouvMapInstance) mouvMapInstance.invalidateSize();
  }, 250);
}

/** Met à jour les marqueurs et flèches sur la carte des mouvements. */
function renderMouvMap() {
  if (!mouvMapInstance) return;

  // Nettoyer les anciens éléments
  _mouvMarkers.forEach(m => mouvMapInstance.removeLayer(m));
  _mouvLines.forEach(l => mouvMapInstance.removeLayer(l));
  _mouvMarkers = [];
  _mouvLines   = [];

  const container = document.getElementById('mouv-map-container');

  // Construire la map rucher id -> rucher
  const rucherMap = {};
  (RUCHERS || []).forEach(r => { rucherMap[r.id] = r; });

  let hasPoints = false;
  const bounds  = [];

  mouvementsData.forEach((m, i) => {
    const r = rucherMap[m.origine];
    if (!r || !r.lat || !r.lng) return;

    hasPoints = true;
    bounds.push([r.lat, r.lng]);

    // Marqueur rucher origine — icône amber
    const origIcon = L.divIcon({
      className: '',
      html: `<div style="
        background:#D4820A;color:white;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        width:28px;height:28px;
        display:flex;align-items:center;justify-content:center;
        border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        font-size:0.55rem;font-weight:800;font-family:monospace;">
          <span style="transform:rotate(45deg)">${r.id}</span>
      </div>`,
      iconSize:    [28, 28],
      iconAnchor:  [14, 28],
      popupAnchor: [0, -30],
    });

    const nbTxt = m.nbColonies ? `${m.nbColonies} col.` : '?';
    const destTxt = m.destination !== '—' ? m.destination : '—';
    const origMarker = L.marker([r.lat, r.lng], { icon: origIcon })
      .addTo(mouvMapInstance)
      .bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:160px;">
          <div style="font-weight:700;font-size:0.9rem;">${r.id} — ${r.lieu}</div>
          <div style="font-size:0.75rem;color:#666;margin:3px 0;">${m.date} · ${nbTxt}</div>
          <div style="font-size:0.78rem;">🚛 → ${destTxt}</div>
          <div style="font-size:0.75rem;color:#888;margin-top:2px;">${m.motif}</div>
        </div>`);
    _mouvMarkers.push(origMarker);

    // Flèche vers destination si coordonnées parsables
    const destCoords = parseDestCoords(m.destination);
    if (destCoords) {
      bounds.push([destCoords.lat, destCoords.lng]);

      // Ligne pointillée origine → destination
      const line = L.polyline(
        [[r.lat, r.lng], [destCoords.lat, destCoords.lng]],
        { color: '#D4820A', weight: 2.5, dashArray: '8, 5', opacity: 0.85 }
      ).addTo(mouvMapInstance);
      _mouvLines.push(line);

      // Marqueur destination (cercle)
      const destMarker = L.circleMarker([destCoords.lat, destCoords.lng], {
        radius: 7,
        color: '#D4820A',
        fillColor: '#FFF8E7',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(mouvMapInstance)
        .bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;">
            <div style="font-weight:700;font-size:0.85rem;">📍 Destination</div>
            <div style="font-size:0.78rem;color:#666;">${destTxt}</div>
          </div>`);
      _mouvMarkers.push(destMarker);
    }
  });

  // Afficher/masquer le container carte
  if (container) {
    container.style.display = hasPoints ? 'block' : 'none';
  }

  // Ajuster le zoom sur les points
  if (bounds.length > 0) {
    if (bounds.length === 1) {
      mouvMapInstance.setView(bounds[0], 12);
    } else {
      mouvMapInstance.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
    }
  }
}

/* ============================================================
   GPS DESTINATION (formulaire)
   ============================================================ */

/** Remplit le champ destination avec les coordonnées GPS actuelles. */
function grabGPSForDestination() {
  const btn  = document.getElementById('btn-gps-dest');
  const hint = document.getElementById('gps-dest-hint');
  if (!navigator.geolocation) {
    toast('⚠️ Géolocalisation non disponible sur cet appareil');
    return;
  }
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const destEl = document.getElementById('mouv-destination');
      if (destEl) destEl.value = `${lat}, ${lng}`;
      if (hint) hint.style.display = 'block';
      if (btn) { btn.textContent = '✅'; btn.disabled = false; }
      toast('📍 Position GPS enregistrée');
    },
    (err) => {
      console.warn('GPS error:', err);
      toast('⚠️ Impossible d\'obtenir la position GPS');
      if (btn) { btn.textContent = '📍 GPS'; btn.disabled = false; }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ============================================================
   PEUPLEMENT DES SELECTS
   ============================================================ */

function populateMouvRucherSelect() {
  const sel = document.getElementById('mouv-origine');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Sélectionner un rucher —</option>'
    + RUCHERS.map(r => `<option value="${r.id}">${r.id} — ${r.lieu}</option>`).join('');
}

/* ============================================================
   SAUVEGARDE
   ============================================================ */

async function saveMouvement() {
  if (_isSavingMouv) return; // empêche le double-tap
  _isSavingMouv = true;

  const saveBtn = document.querySelector('#modal-mouvement .btn-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Enregistrement…'; }

  try {
    await _doSaveMouvement();
  } finally {
    _isSavingMouv = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✓ Enregistrer'; }
  }
}

async function _doSaveMouvement() {
  const date    = document.getElementById('mouv-date').value;
  const origine = document.getElementById('mouv-origine').value;
  if (!date)    { toast('⚠️ Date obligatoire');              return; }
  if (!origine) { toast('⚠️ Sélectionne un rucher d\'origine'); return; }

  const entry = {
    date,
    origine,
    destination: document.getElementById('mouv-destination').value || '—',
    nbColonies:  parseInt(document.getElementById('mouv-nb').value) || 0,
    motif:       document.getElementById('mouv-motif').value       || '—',
    obs:         document.getElementById('mouv-obs').value         || '',
  };

  if (editingMouvIdx !== null) {
    const existing = mouvementsData[editingMouvIdx];
    entry._docId = existing._docId;
    if (entry._docId) await updateMouvementInFirestore(entry._docId, entry);
    mouvementsData[editingMouvIdx] = entry;
    editingMouvIdx = null;
    toast('✅ Mouvement mis à jour !');
  } else {
    const docRef = await addMouvementToFirestore(entry);
    if (docRef) entry._docId = docRef.id;
    mouvementsData.unshift(entry);
    toast('✅ Mouvement enregistré !');
  }

  localStorage.setItem('mouvements', JSON.stringify(mouvementsData));
  closeModal('modal-mouvement');
  resetMouvementForm();
  renderMouvements();
}

/* ============================================================
   RESET FORMULAIRE
   ============================================================ */

function resetMouvementForm() {
  ['mouv-destination', 'mouv-nb', 'mouv-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const origine = document.getElementById('mouv-origine');
  if (origine) origine.value = '';
  const motif = document.getElementById('mouv-motif');
  if (motif) motif.value = '';
  // Date = aujourd'hui par défaut (date locale, pas UTC)
  const dateEl = document.getElementById('mouv-date');
  if (dateEl) {
    const d = new Date();
    dateEl.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // Reset bouton GPS et hint
  const btn  = document.getElementById('btn-gps-dest');
  const hint = document.getElementById('gps-dest-hint');
  if (btn)  { btn.textContent = '📍 GPS'; btn.disabled = false; }
  if (hint) hint.style.display = 'none';

  editingMouvIdx = null;
}

/* ============================================================
   ÉDITION
   ============================================================ */

function openEditMouvement(idx) {
  const m = mouvementsData[idx];
  if (!m) return;
  editingMouvIdx = idx;

  const modalTitle = document.querySelector('#modal-mouvement .modal-title');
  if (modalTitle) modalTitle.textContent = '✏️ Modifier le mouvement';

  populateMouvRucherSelect();
  document.getElementById('mouv-date').value        = m.date;
  document.getElementById('mouv-origine').value     = m.origine;
  document.getElementById('mouv-destination').value = m.destination !== '—' ? m.destination : '';
  document.getElementById('mouv-nb').value          = m.nbColonies || '';
  document.getElementById('mouv-motif').value       = m.motif !== '—' ? m.motif : '';
  document.getElementById('mouv-obs').value         = m.obs || '';

  // Hint GPS si coordonnées détectées dans destination
  const hint = document.getElementById('gps-dest-hint');
  if (hint) hint.style.display = parseDestCoords(m.destination) ? 'block' : 'none';

  openModal('modal-mouvement');
}

/* ============================================================
   OUVERTURE DU FORMULAIRE (nouveau)
   ============================================================ */

function openNewMouvement() {
  editingMouvIdx = null;
  const modalTitle = document.querySelector('#modal-mouvement .modal-title');
  if (modalTitle) modalTitle.textContent = '🚛 Nouveau mouvement de colonies';
  populateMouvRucherSelect();
  resetMouvementForm();
  openModal('modal-mouvement');
}

/* ============================================================
   SUPPRESSION
   ============================================================ */

function confirmDelMouvement(docId, i) {
  showConfirm('Supprimer ce mouvement ?', () => delMouvement(docId, i));
}

async function delMouvement(docId, i) {
  if (docId) await deleteMouvementFromFirestore(docId);
  mouvementsData.splice(i, 1);
  localStorage.setItem('mouvements', JSON.stringify(mouvementsData));
  renderMouvements();
  toast('🗑 Supprimé');
}

/* ============================================================
   RENDU LISTE + CARTE
   ============================================================ */

function renderMouvements() {
  const list = document.getElementById('mouvements-list');
  if (!list) return;

  if (!mouvementsData.length) {
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">🚛</div>
      <p>Aucun mouvement enregistré.<br>
      <small>Ajoutez vos transhumances pour les retrouver dans le registre légal (Section 5).</small></p>
    </div>`;
    // Masquer la carte si vide
    const container = document.getElementById('mouv-map-container');
    if (container) container.style.display = 'none';
    return;
  }

  list.innerHTML = mouvementsData.map((m, i) => {
    const deleteAction = m._docId
      ? `confirmDelMouvement('${m._docId}', ${i})`
      : `confirmDelMouvement(null, ${i})`;
    const rucherLabel = getRucherLabel(m.origine);
    const nbTxt = m.nbColonies ? `${m.nbColonies} colonie${m.nbColonies > 1 ? 's' : ''}` : '—';
    const hasGPS = parseDestCoords(m.destination) !== null;
    const gpsBadge = hasGPS
      ? `<span class="badge" style="background:rgba(212,130,10,0.15);color:#D4820A;border:1px solid rgba(212,130,10,0.3);">📍 GPS</span>`
      : '';

    return `
    <div class="entry-card" onclick="openEditMouvement(${i})" style="cursor:pointer;">
      <button class="btn-delete" onclick="event.stopPropagation();${deleteAction}">🗑</button>
      <div class="entry-top">
        <span class="entry-date">${m.date}</span>
        <span class="entry-id">${rucherLabel}</span>
      </div>
      <div class="entry-main" style="font-size:.9rem;">🚛 ${nbTxt} → ${m.destination !== '—' ? m.destination : '?'}</div>
      <div class="entry-sub">${m.motif}</div>
      <div class="entry-tags">
        ${gpsBadge}
        ${m.obs ? `<span class="badge badge-couvain">${m.obs}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  // Mettre à jour la carte
  if (mouvMapInstance) {
    renderMouvMap();
  } else {
    initMouvMap();
  }
}
