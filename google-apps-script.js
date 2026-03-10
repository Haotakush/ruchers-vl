/**
 * google-apps-script.js
 * 
 * À coller dans Google Apps Script (Extensions → Apps Script)
 * Déployer comme "Application Web" avec accès "Tout le monde"
 * 
 * Ce script reçoit les données de l'app Ruchers VL
 * et les ajoute dans les onglets correspondants du Google Sheet.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'visite') {
      const sheet = ss.getSheetByName('Visites');

      // Créer les en-têtes si la feuille est vide
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Date', 'Rucher', 'Ruches', 'Météo',
          'Force', 'Reine', 'Couvain', 'Réserve', 'Vide',
          'Nb ruchettes', 'État ruchettes', 'Interventions', 'Observations'
        ]);
        // Mettre en gras la première ligne
        sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
      }

      const v = data.data;
      sheet.appendRow([
        v.date,
        v.rucher,
        v.ruches        || '—',
        v.meteo         || '—',
        v.force         || '—',
        v.reine         || '—',
        v.cadreCouvain  || 0,
        v.cadreReserve  || 0,
        v.cadreVide     || 0,
        v.nbRuchettes   || 0,
        v.etatRuchettes || '—',
        v.intervention  || '—',
        v.obs           || '',
      ]);
    }

    if (data.type === 'sanitaire') {
      const sheet = ss.getSheetByName('Sanitaire');

      // Créer les en-têtes si la feuille est vide
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Date', 'Rucher', 'Type', 'Produit',
          'Dose', 'Durée', 'GDSA', 'Motif', 'Observations'
        ]);
        sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      }

      const s = data.data;
      sheet.appendRow([
        s.date,
        s.rucher,
        s.type    || '—',
        s.produit || '—',
        s.dose    || '—',
        s.duree   || '—',
        s.gdsa    || 'Non',
        s.motif   || '—',
        s.obs     || '',
      ]);
    }

    return ContentService.createTextOutput('OK');

  } catch (err) {
    // En cas d'erreur, retourner le message (visible dans les logs Apps Script)
    return ContentService.createTextOutput('Erreur: ' + err.message);
  }
}
