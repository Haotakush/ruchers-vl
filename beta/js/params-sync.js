/* ============================================================
   params-sync.js — Paramètres de l'apiculteur

   Ce fichier gère :
   - Chargement des paramètres dans le formulaire
   - Sauvegarde des paramètres (Firestore + localStorage)

   Note : La sync Google Sheets a été remplacée par Firebase.
   Les anciennes fonctions de sync sont conservées mais désactivées.
   ============================================================ */


/** Charger les paramètres actuels dans les champs du formulaire */
function loadParamsUI() {
  document.getElementById('p-nom').value     = PARAMS.nom      || '';
  document.getElementById('p-napi').value    = PARAMS.napi     || '';
  document.getElementById('p-siret').value   = PARAMS.siret    || '';
  document.getElementById('p-adresse').value = PARAMS.adresse  || '';
  document.getElementById('p-email').value   = PARAMS.email    || '';
  document.getElementById('p-datedecl').value= PARAMS.dateDecl || '';
  document.getElementById('p-refdecl').value = PARAMS.refDecl  || '';
  document.getElementById('p-colonies').value= PARAMS.colonies || '';
}

/** Sauvegarder les paramètres depuis le formulaire */
function saveParams() {
  PARAMS = {
    nom:      document.getElementById('p-nom').value.trim(),
    napi:     document.getElementById('p-napi').value.trim(),
    siret:    document.getElementById('p-siret').value.trim(),
    adresse:  document.getElementById('p-adresse').value.trim(),
    email:    document.getElementById('p-email').value.trim(),
    dateDecl: document.getElementById('p-datedecl').value.trim(),
    refDecl:  document.getElementById('p-refdecl').value.trim(),
    colonies: document.getElementById('p-colonies').value.trim(),
  };
  saveParamsToStorage();
  updateTopbar();
  updateDashboard();
  toast('✅ Paramètres sauvegardés !');
}


/* ============================================================
   Anciennes fonctions Google Sheets — désactivées
   (Firebase gère maintenant la synchronisation)
   ============================================================ */

// Placeholder pour compatibilité si appelé quelque part
let syncQueue = [];
function saveSyncQueue() {}
function updateSyncBar() {}
function sendToSheets() {}
function flushQueue() {}
function saveSheetsUrl() {
  toast('ℹ️ La sync Google Sheets a été remplacée par Firebase.');
}
