/* ============================================================
   app.js — Point d'entrée v1.3
   Suppression export/import JSON (Firebase gère tout)
   ============================================================ */

function initApp() {
  console.log('🐝 Initialisation Ruchers VL v1.3…');
  renderAllSelects();
  renderJournal();
  renderSanitaire();
  renderRuchers();
  renderCalendrier();
  renderTranshumance();
  updateDashboard();
  drawChartVisites();
  updateTopbar();

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('j-date').value = today;
  document.getElementById('s-date').value = today;

  showInstallBanner();
  updateLogoutButton();
  startRealtimeListeners();
  updateSyncIndicator();

  console.log('✅ App v1.3 initialisée !');
}

function updateLogoutButton() {
  const logoutWrap = document.getElementById('logout-wrap');
  if (logoutWrap && currentUser) {
    logoutWrap.innerHTML = `
      <button class="menu-item" onclick="doLogout()" style="color:#C62828;">
        🚪 Déconnexion <span style="font-size:0.72rem;color:var(--soft);margin-left:6px;">(${currentUser.email})</span>
      </button>`;
  }
}
