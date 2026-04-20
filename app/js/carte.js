/* ============================================================
   carte.js — Carte interactive Leaflet

   Ce fichier gère :
   - Initialisation de la carte OpenStreetMap
   - Marqueurs avec couleur d'alerte selon dernière visite
   - Cercles de rayon mellifère (1km)
   - Popups d'info sur chaque rucher
   - Mesure de distance entre 2 ruchers sélectionnés
   ============================================================ */

let mapInstance   = null;
let _markers      = {};   // rucherId -> { marker, alertColor, r }
let _selectedIds  = [];   // max 2 ids sélectionnés
let _distLine     = null;

/* ---- Icône marqueur ---- */
function _makeIcon(r, alertColor, selected) {
  const ring = selected
    ? `box-shadow:0 0 0 3px white, 0 0 0 5px ${alertColor}, 0 2px 10px rgba(0,0,0,0.4);`
    : `box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${alertColor};color:white;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;${ring}
      font-size:0.6rem;font-weight:800;font-family:monospace;">
        <span style="transform:rotate(45deg)">${r.id}</span>
    </div>`,
    iconSize:    [32, 32],
    iconAnchor:  [16, 32],
    popupAnchor: [0, -34],
  });
}

/* ---- Mettre à jour la ligne de distance ---- */
function _updateDistance() {
  // Effacer l'ancienne ligne
  if (_distLine) { mapInstance.removeLayer(_distLine); _distLine = null; }
  const panel = document.getElementById('map-dist-panel');
  if (panel) panel.remove();

  // Mettre à jour l'apparence de tous les marqueurs
  Object.values(_markers).forEach(({ marker, alertColor, r }) => {
    marker.setIcon(_makeIcon(r, alertColor, _selectedIds.includes(r.id)));
  });

  if (_selectedIds.length !== 2) return;

  const a = _markers[_selectedIds[0]];
  const b = _markers[_selectedIds[1]];
  if (!a || !b) return;

  // Distance en mètres via Leaflet
  const metres  = L.latLng(a.r.lat, a.r.lng).distanceTo(L.latLng(b.r.lat, b.r.lng));
  const conforme = metres >= 1000;
  const lineColor = conforme ? '#4CAF50' : '#EF5350';

  // Ligne entre les deux (verte si ok, rouge si trop proches)
  _distLine = L.polyline(
    [[a.r.lat, a.r.lng], [b.r.lat, b.r.lng]],
    { color: lineColor, weight: 2.5, dashArray: '8, 6', opacity: 0.9 }
  ).addTo(mapInstance);

  const distLabel = metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
  const badge = conforme
    ? `<span style="color:#4CAF50;font-weight:700;">✅ Conforme</span>`
    : `<span style="color:#EF5350;font-weight:700;">⚠️ Trop proches !</span>`;

  // Panneau flottant au-dessus de la carte
  const div = document.createElement('div');
  div.id = 'map-dist-panel';
  div.innerHTML = `
    <span style="font-size:0.75rem;color:var(--soft);">${a.r.id} → ${b.r.id}</span>
    <span style="font-size:1.05rem;font-weight:700;margin-left:8px;">📏 ${distLabel}</span>
    <span style="font-size:0.82rem;margin-left:8px;">${badge}</span>
    <button onclick="_clearDistSelection()" style="margin-left:10px;background:none;border:none;color:var(--soft);font-size:1rem;cursor:pointer;line-height:1;">✕</button>`;
  div.style.cssText = `
    position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
    background:var(--card);border:1px solid ${lineColor};border-radius:12px;
    padding:8px 14px;display:flex;align-items:center;gap:4px;
    box-shadow:0 4px 16px rgba(0,0,0,0.25);z-index:1000;white-space:nowrap;`;
  document.getElementById('map').appendChild(div);
}

function _clearDistSelection() {
  _selectedIds = [];
  _updateDistance();
}

/* ---- Initialiser ou réinitialiser la carte ---- */
function initMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  _markers     = {};
  _selectedIds = [];
  _distLine    = null;

  const el = document.getElementById('map');
  if (!el) return;

  mapInstance = L.map('map', { zoomControl: true }).setView([-21.115, 55.536], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(mapInstance);

  const lastVisitMap = buildLastVisitMap();

  const zoneColors = {
    'Bas':       '#4CAF50',
    'Mi-pentes': '#FFB300',
    'Hauts':     '#1E88E5',
  };

  RUCHERS.forEach(r => {
    if (!r.lat || !r.lng) return;

    const days = daysSince(lastVisitMap[r.id]);
    let alertColor, alertLabel;

    if (days === null) {
      alertColor = '#EF5350'; alertLabel = '🔴 Jamais visité';
    } else if (days > 30) {
      alertColor = '#EF5350'; alertLabel = `🔴 ${days}j sans visite`;
    } else if (days > 14) {
      alertColor = '#FF9800'; alertLabel = `🟡 ${days}j sans visite`;
    } else {
      alertColor = zoneColors[r.zone] || '#D4820A'; alertLabel = `🟢 ${days}j`;
    }

    // Cercle rayon mellifère 1km
    L.circle([r.lat, r.lng], {
      radius: 1000, color: alertColor, fillColor: alertColor,
      fillOpacity: 0.08, weight: 2, dashArray: '5, 5',
    }).addTo(mapInstance);

    const marker = L.marker([r.lat, r.lng], { icon: _makeIcon(r, alertColor, false) })
      .addTo(mapInstance)
      .bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:180px;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${r.id} — ${r.lieu}</div>
          <div style="font-size:0.78rem;color:#666;margin-bottom:6px;">⛰ ${r.alt || 0}m · ${r.cp || ''}</div>
          <div style="font-size:0.78rem;">🐝 <strong>${r.nb || '?'}</strong> ruches</div>
          <div style="font-size:0.78rem;font-weight:600;color:${alertColor};margin-top:4px;">${alertLabel}</div>
        </div>`);

    // Clic : sélection pour distance
    marker.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      marker.closePopup();
      const idx = _selectedIds.indexOf(r.id);
      if (idx !== -1) {
        _selectedIds.splice(idx, 1);
      } else {
        if (_selectedIds.length >= 2) _selectedIds.shift(); // glissant : remplace le plus ancien
        _selectedIds.push(r.id);
      }
      _updateDistance();
    });

    _markers[r.id] = { marker, alertColor, r };
  });

  // Clic sur la carte = désélectionner
  mapInstance.on('click', _clearDistSelection);

  // Hint si 2+ ruchers avec GPS
  const avecGPS = RUCHERS.filter(r => r.lat && r.lng).length;
  if (avecGPS >= 2) {
    const hint = L.control({ position: 'topright' });
    hint.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.innerHTML = `<div style="
        background:rgba(26,18,8,0.75);color:#ccc;font-size:0.68rem;
        padding:5px 9px;border-radius:8px;backdrop-filter:blur(4px);
        font-family:'DM Sans',sans-serif;line-height:1.4;">
        📏 Sélectionne 2 ruchers<br>pour mesurer la distance
      </div>`;
      return d;
    };
    hint.addTo(mapInstance);
  }

  setTimeout(() => mapInstance.invalidateSize(), 200);
}
