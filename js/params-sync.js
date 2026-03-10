/* ============================================================
   params.js — Paramètres de l'apiculteur
   
   Ce fichier gère :
   - Chargement des paramètres dans le formulaire
   - Sauvegarde des paramètres
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
   sync.js — Synchronisation Google Sheets
   
   Ce fichier gère :
   - Envoi des données vers Google Apps Script
   - File d'attente offline (syncQueue)
   - Barre de statut de synchronisation
   - Sauvegarde/chargement de l'URL du webhook
   ============================================================ */

// File d'attente pour les envois qui ont échoué (hors ligne)
let syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');

/** Persister la queue dans le localStorage */
function saveSyncQueue() {
  localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
}

/**
 * Mettre à jour la barre de statut sync sur le dashboard
 * @param {string} state - 'ok' | 'pending' | 'off'
 * @param {string} msg   - Message à afficher
 */
function updateSyncBar(state, msg) {
  const bar = document.getElementById('sync-status-bar');
  if (!bar) return;

  // Ne pas afficher si pas d'URL configurée
  const url = localStorage.getItem('sheetsUrl') || '';
  if (!url) { bar.innerHTML = ''; return; }

  const dotClass = state === 'ok' ? 'green' : state === 'pending' ? 'orange' : 'grey';

  bar.innerHTML = `
    <div class="sync-bar">
      <div class="sync-dot ${dotClass}"></div>
      <span style="color:var(--mid);flex:1;">${msg}</span>
    </div>`;
}

/**
 * Envoyer une entrée vers Google Sheets
 * Si hors ligne, la mettre en queue pour un envoi ultérieur
 * @param {string} type  - 'visite' | 'sanitaire'
 * @param {object} data  - Données à envoyer
 */
async function sendToSheets(type, data) {
  const url = localStorage.getItem('sheetsUrl') || '';
  if (!url) return; // Pas configuré → on ne fait rien

  const payload = { type, data, timestamp: new Date().toISOString() };

  if (!navigator.onLine) {
    // Stocker pour envoi ultérieur
    syncQueue.push(payload);
    saveSyncQueue();
    updateSyncBar('pending', `${syncQueue.length} en attente (hors ligne)`);
    return;
  }

  try {
    // mode:'no-cors' car Google Apps Script ne renvoie pas les headers CORS
    await fetch(url, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    // Vider la queue si des envois étaient en attente
    await flushQueue();
    updateSyncBar('ok', 'Synchronisé avec Google Sheets ✅');

    // Revenir au message normal après 3 secondes
    setTimeout(() => updateSyncBar('ok', 'Sync Google Sheets actif'), 3000);

  } catch (err) {
    // Erreur réseau → mettre en queue
    syncQueue.push(payload);
    saveSyncQueue();
    updateSyncBar('pending', `Erreur réseau — ${syncQueue.length} en attente`);
  }
}

/**
 * Vider la file d'attente et renvoyer les entrées en échec
 * Appelé automatiquement après un envoi réussi
 */
async function flushQueue() {
  const url = localStorage.getItem('sheetsUrl') || '';
  if (!url || !navigator.onLine || !syncQueue.length) return;

  const toSend  = [...syncQueue];
  syncQueue = [];
  saveSyncQueue();

  for (const payload of toSend) {
    try {
      await fetch(url, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch {
      // Remettre dans la queue si ça échoue encore
      syncQueue.push(payload);
      saveSyncQueue();
    }
  }
}

/** Sauvegarder l'URL Google Apps Script et mettre à jour la barre */
function saveSheetsUrl() {
  const url = document.getElementById('sheets-url').value.trim();
  localStorage.setItem('sheetsUrl', url);

  if (url) {
    updateSyncBar('ok', 'Sync Google Sheets actif');
    toast('✅ URL sauvegardée !');
  } else {
    updateSyncBar('off', '');
    toast('🔗 URL supprimée');
  }
}
