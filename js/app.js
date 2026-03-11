/* ============================================================
   app.js — Point d'entrée de l'application
   v1.2 — Ajout mode visite rapide/complet

   Ce fichier gère :
   - L'initialisation APRÈS connexion Firebase
   - L'export JSON (sauvegarde complète)
   - L'import JSON (restauration)

   ⚠️  Ce fichier doit être chargé EN DERNIER dans index.html
       car il appelle des fonctions de tous les autres modules.
   ⚠️  L'init n'est plus automatique (IIFE). Elle est appelée
       par firebase-auth.js après connexion réussie.
   ============================================================ */


/* ------------------------------------------------------------
   INITIALISATION — Appelée par firebase-auth.js après login
   ------------------------------------------------------------ */

function initApp() {
  console.log('🐝 Initialisation Ruchers VL…');

  // 1. Peupler tous les selects avec les ruchers
  renderAllSelects();

  // 2. Rendre les listes
  renderJournal();
  renderSanitaire();
  renderRuchers();
  renderCalendrier();
  renderTranshumance();

  // 3. Mettre à jour le dashboard et ses graphiques
  updateDashboard();
  drawChartVisites();

  // 4. Mettre à jour la topbar avec les infos réelles
  updateTopbar();

  // 5. Pré-remplir les dates du jour dans les formulaires
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('j-date').value = today;
  document.getElementById('s-date').value = today;

  // 6. Afficher le banner iOS si nécessaire
  showInstallBanner();

  // 7. Afficher le bouton de déconnexion avec l'email
  updateLogoutButton();

  // 8. Démarrer les listeners temps réel (sync multi-appareils)
  startRealtimeListeners();

  // 9. Initialiser le mode visite par défaut (rapide)
  if (typeof switchVisiteMode === 'function') {
    switchVisiteMode('rapide');
  }

  console.log('✅ App initialisée !');
}


/* ------------------------------------------------------------
   UI — Bouton déconnexion
   ------------------------------------------------------------ */

/** Mettre à jour le bouton déconnexion avec l'email de l'utilisateur */
function updateLogoutButton() {
  const logoutWrap = document.getElementById('logout-wrap');
  if (logoutWrap && currentUser) {
    logoutWrap.innerHTML = `
      <button class="menu-item" onclick="doLogout()" style="color:#C62828;">
        🚪 Déconnexion <span style="font-size:0.72rem;color:var(--soft);margin-left:6px;">(${currentUser.email})</span>
      </button>`;
  }
}


/* ------------------------------------------------------------
   EXPORT / IMPORT JSON
   ------------------------------------------------------------ */

/**
 * Exporter toutes les données en fichier JSON
 */
function exportData() {
  const data = {
    version:     '2.0-firebase',
    exportDate:  new Date().toISOString(),
    params:      PARAMS,
    ruchers:     RUCHERS.map(r => { const d = {...r}; delete d._docId; return d; }),
    journal:     journalData.map(v => { const d = {...v}; delete d._docId; return d; }),
    sanitaire:   sanitaireData.map(s => { const d = {...s}; delete d._docId; return d; }),
    transData,
    rucherPhotos,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isIOS) {
    window.open(url, '_blank');
    toast('💾 Appuyez sur ⎋ Partager pour sauvegarder');
  } else {
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `ruchers_vl_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast('💾 Sauvegarde exportée !');
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Importer une sauvegarde JSON
 * @param {HTMLInputElement} input - Input file déclenché
 */
function importData(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.version) throw new Error('Format invalide');

      const nbEntries = (data.journal?.length || 0) + (data.sanitaire?.length || 0);

      if (!confirm(
        `Importer cette sauvegarde ?\n\n` +
        `📅 Date : ${data.exportDate?.split('T')[0] || '?'}\n` +
        `📋 ${data.journal?.length || 0} visite(s)\n` +
        `💊 ${data.sanitaire?.length || 0} traitement(s)\n\n` +
        `⚠️ Les données actuelles seront remplacées.`
      )) return;

      toast('🔄 Import en cours…');

      // Restaurer les paramètres
      if (data.params) {
        PARAMS = data.params;
        saveParamsToStorage();
      }

      // Restaurer les ruchers
      if (data.ruchers) {
        RUCHERS.length = 0;
        for (const r of data.ruchers) {
          await saveRucherToFirestore(r);
          RUCHERS.push({...r});
        }
        saveRuchers();
      }

      // Restaurer le journal
      if (data.journal) {
        journalData = [];
        for (const v of data.journal) {
          const docRef = await addJournalToFirestore(v);
          journalData.push({ ...v, _docId: docRef?.id });
        }
        localStorage.setItem('journal', JSON.stringify(journalData));
      }

      // Restaurer le sanitaire
      if (data.sanitaire) {
        sanitaireData = [];
        for (const s of data.sanitaire) {
          const docRef = await addSanitaireToFirestore(s);
          sanitaireData.push({ ...s, _docId: docRef?.id });
        }
        localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));
      }

      // Restaurer la transhumance
      if (data.transData) {
        transData = data.transData;
        localStorage.setItem('transData', JSON.stringify(transData));
        if (currentUser) saveTransToFirestore();
      }

      // Restaurer les photos (localStorage uniquement)
      if (data.rucherPhotos) {
        rucherPhotos = data.rucherPhotos;
        localStorage.setItem('rucherPhotos', JSON.stringify(rucherPhotos));
      }

      // Tout rafraîchir
      renderJournal();
      renderSanitaire();
      renderRuchers();
      renderAllSelects();
      renderTranshumance();
      updateDashboard();
      drawChartVisites();

      toast(`✅ ${nbEntries} entrée(s) importée(s) !`);

    } catch (err) {
      console.error('Erreur import:', err);
      alert('❌ Fichier invalide ou corrompu.');
    }

    input.value = '';
  };

  reader.readAsText(file);
}
