/* ============================================================
   carte.js — Carte interactive Leaflet
   
   Ce fichier gère :
   - Initialisation de la carte OpenStreetMap
   - Marqueurs avec couleur d'alerte selon dernière visite
   - Cercles de rayon mellifère (1km)
   - Popups d'info sur chaque rucher
   ============================================================ */

let mapInstance = null;

/**
 * Initialiser ou réinitialiser la carte
 * Appelé quand on clique sur l'onglet Carte
 */
function initMap() {
  // Détruire l'instance précédente si elle existe
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const el = document.getElementById('map');
  if (!el) return;

  // Centrer sur La Réunion
  mapInstance = L.map('map', { zoomControl: true }).setView([-21.115, 55.536], 10);

  // Fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18,
  }).addTo(mapInstance);

  // Dernière visite par rucher (pour les couleurs d'alerte)
  const lastVisitMap = buildLastVisitMap();

  // Couleurs de zone (si pas d'alerte)
  const zoneColors = {
    'Bas':       '#4CAF50',
    'Mi-pentes': '#FFB300',
    'Hauts':     '#1E88E5',
  };

  // Ajouter chaque rucher sur la carte
  RUCHERS.forEach(r => {
    if (!r.lat || !r.lng) return;

    const days = daysSince(lastVisitMap[r.id]);

    // Déterminer la couleur et le label d'alerte
    let alertColor, alertLabel;

    if (days === null) {
      alertColor = '#EF5350';
      alertLabel = '🔴 Jamais visité';
    } else if (days > 30) {
      alertColor = '#EF5350';
      alertLabel = `🔴 ${days}j sans visite`;
    } else if (days > 14) {
      alertColor = '#FF9800';
      alertLabel = `🟡 ${days}j sans visite`;
    } else {
      alertColor = zoneColors[r.zone] || '#D4820A';
      alertLabel = `🟢 ${days}j`;
    }

    // Cercle rayon mellifère 1km
    L.circle([r.lat, r.lng], {
      radius:      1000,
      color:       alertColor,
      fillColor:   alertColor,
      fillOpacity: 0.08,
      weight:      2,
      dashArray:   '5, 5',
    }).addTo(mapInstance);

    // Marqueur personnalisé en forme de goutte
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background:${alertColor};
          color:white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          width:32px; height:32px;
          display:flex; align-items:center; justify-content:center;
          border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          font-size:0.6rem; font-weight:800; font-family:monospace;
        ">
          <span style="transform:rotate(45deg)">${r.id}</span>
        </div>`,
      iconSize:    [32, 32],
      iconAnchor:  [16, 32],
      popupAnchor: [0, -34],
    });

    // Popup d'information
    L.marker([r.lat, r.lng], { icon })
      .addTo(mapInstance)
      .bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:180px;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${r.id} — ${r.lieu}</div>
          <div style="font-size:0.78rem;color:#666;margin-bottom:6px;">⛰ ${r.alt}m · ${r.cp}</div>
          <div style="font-size:0.78rem;">🐝 <strong>${r.nb || '?'}</strong> ruches</div>
          <div style="font-size:0.78rem;font-weight:600;color:${alertColor};margin-top:4px;">${alertLabel}</div>
        </div>`);
  });

  // Forcer le recalcul de la taille (fix bug affichage mobile)
  setTimeout(() => mapInstance.invalidateSize(), 200);
}
