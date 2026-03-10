/* ============================================================
   app.js — Point d'entrée de l'application
   
   Ce fichier gère :
   - L'initialisation au démarrage
   - L'export JSON (sauvegarde complète)
   - L'import JSON (restauration)
   
   ⚠️  Ce fichier doit être chargé EN DERNIER dans index.html
       car il appelle des fonctions de tous les autres modules.
   ============================================================ */


/* ------------------------------------------------------------
   EXPORT / IMPORT JSON
   ------------------------------------------------------------ */

/**
 * Exporter toutes les données en fichier JSON
 * Sur iOS : ouvre dans le navigateur pour partager
 * Sur Android/desktop : téléchargement direct
 */
function exportData() {
  const data = {
    version:     '2.0',
    exportDate:  new Date().toISOString(),
    params:      PARAMS,
    ruchers:     RUCHERS,
    journal:     journalData,
    sanitaire:   sanitaireData,
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

  // Libérer la mémoire après 10 secondes
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

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // Vérification basique du format
      if (!data.version) throw new Error('Format invalide');

      const nbEntries = (data.journal?.length || 0) + (data.sanitaire?.length || 0);

      if (!confirm(
        `Importer cette sauvegarde ?\n\n` +
        `📅 Date : ${data.exportDate?.split('T')[0] || '?'}\n` +
        `📋 ${data.journal?.length || 0} visite(s)\n` +
        `💊 ${data.sanitaire?.length || 0} traitement(s)\n\n` +
        `⚠️ Les données actuelles seront remplacées.`
      )) return;

      // Restaurer chaque bloc de données
      if (data.params) {
        PARAMS = data.params;
        saveParamsToStorage();
      }
      if (data.ruchers) {
        RUCHERS.length = 0;
        data.ruchers.forEach(r => RUCHERS.push(r));
        saveRuchers();
      }
      if (data.journal) {
        journalData = data.journal;
        localStorage.setItem('journal', JSON.stringify(journalData));
      }
      if (data.sanitaire) {
        sanitaireData = data.sanitaire;
        localStorage.setItem('sanitaire', JSON.stringify(sanitaireData));
      }
      if (data.transData) {
        transData = data.transData;
        localStorage.setItem('transData', JSON.stringify(transData));
      }
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
      alert('❌ Fichier invalide ou corrompu.');
    }

    input.value = ''; // Reset l'input pour permettre de réimporter le même fichier
  };

  reader.readAsText(file);
}


/* ------------------------------------------------------------
   INITIALISATION
   Ordre important : les données doivent être prêtes avant
   de rendre l'interface.
   ------------------------------------------------------------ */
(function init() {
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

  // 5. Initialiser la barre de sync si une URL est configurée
  const sheetsUrl = localStorage.getItem('sheetsUrl') || '';
  if (sheetsUrl) updateSyncBar('ok', 'Sync Google Sheets actif');

  // 6. Pré-remplir les dates du jour dans les formulaires
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('j-date').value = today;
  document.getElementById('s-date').value = today;

  // 7. Afficher le banner iOS si nécessaire
  showInstallBanner();

})();
