/* ============================================================
   firebase-db.js — Couche Firestore
   v1.3 — Sync indicator, edit sanitaire, photos Firestore base64
   ============================================================ */

function userRef() {
  return db.collection('users').doc(currentUser.uid);
}

/* ---- Indicateur de sync ---- */
function setLastSyncNow() {
  lastSyncTime = new Date();
  updateSyncIndicator();
}

/* ---- Chargement initial ---- */
async function loadAllDataFromFirestore() {
  const uid = currentUser.uid;
  console.log('📥 Chargement Firestore pour', uid);
  try {
    const paramsDoc = await userRef().collection('config').doc('params').get();
    if (paramsDoc.exists) PARAMS = paramsDoc.data();

    const ruchersSnap = await userRef().collection('ruchers').orderBy('id').get();
    if (!ruchersSnap.empty) {
      RUCHERS.length = 0;
      ruchersSnap.forEach(doc => RUCHERS.push({ ...doc.data(), _docId: doc.id }));
    }

    const journalSnap = await userRef().collection('journal').orderBy('date', 'desc').get();
    journalData = [];
    journalSnap.forEach(doc => journalData.push({ ...doc.data(), _docId: doc.id }));

    const sanitaireSnap = await userRef().collection('sanitaire').orderBy('date', 'desc').get();
    sanitaireData = [];
    sanitaireSnap.forEach(doc => sanitaireData.push({ ...doc.data(), _docId: doc.id }));

    const transDoc = await userRef().collection('config').doc('transhumance').get();
    if (transDoc.exists) transData = transDoc.data();

    // Photos ruchers + médias visites + documents + mouvements
    await loadPhotosFromFirestore();
    await loadVisitPhotos();
    await loadVisitAudio();
    await loadDocumentsFromFirestore();
    await loadMouvementsFromFirestore();

    setLastSyncNow();
    console.log(`✅ Données chargées : ${RUCHERS.length} ruchers, ${journalData.length} visites`);

  } catch (err) {
    console.error('❌ Erreur chargement Firestore:', err);
    toast('⚠️ Erreur de chargement — mode hors ligne');
  }
}

/* ---- Sync manuelle ---- */
async function forceSyncFromFirestore() {
  if (!currentUser) return;
  toast('🔄 Synchronisation en cours…');
  try {
    const paramsDoc = await userRef().collection('config').doc('params').get();
    if (paramsDoc.exists) PARAMS = paramsDoc.data();

    const ruchersSnap = await userRef().collection('ruchers').orderBy('id').get();
    RUCHERS.length = 0;
    ruchersSnap.forEach(doc => RUCHERS.push({ ...doc.data(), _docId: doc.id }));

    const journalSnap = await userRef().collection('journal').orderBy('date', 'desc').get();
    journalData = [];
    journalSnap.forEach(doc => journalData.push({ ...doc.data(), _docId: doc.id }));

    const sanitaireSnap = await userRef().collection('sanitaire').orderBy('date', 'desc').get();
    sanitaireData = [];
    sanitaireSnap.forEach(doc => sanitaireData.push({ ...doc.data(), _docId: doc.id }));

    await loadDocumentsFromFirestore();
    await loadMouvementsFromFirestore();
    renderJournal(); renderSanitaire(); renderRuchers();
    renderAllSelects(); updateDashboard(); drawChartVisites();
    if (typeof renderDocuments  === 'function') renderDocuments();
    if (typeof renderMouvements === 'function') renderMouvements();
    setLastSyncNow();
    toast('✅ Synchronisé !');
  } catch (err) {
    console.error('Erreur sync:', err);
    toast('⚠️ Erreur de synchronisation');
  }
}

/* ---- RUCHERS ---- */
async function saveParamsToFirestore() {
  try { await userRef().collection('config').doc('params').set(PARAMS); }
  catch (err) { console.error('Erreur save params:', err); }
}

async function saveRucherToFirestore(rucher) {
  try {
    const docRef = userRef().collection('ruchers').doc(rucher.id);
    const data = { ...rucher }; delete data._docId;
    await docRef.set(data);
    return docRef;
  } catch (err) { console.error('Erreur save rucher:', err); }
}

async function deleteRucherFromFirestore(rucherId) {
  try { await userRef().collection('ruchers').doc(rucherId).delete(); }
  catch (err) { console.error('Erreur delete rucher:', err); }
}

/* ---- JOURNAL ---- */
async function addJournalToFirestore(entry) {
  try {
    const data = { ...entry }; delete data._docId;
    return await userRef().collection('journal').add(data);
  } catch (err) { console.error('Erreur add journal:', err); }
}

async function updateJournalInFirestore(docId, entry) {
  try {
    const data = { ...entry }; delete data._docId;
    await userRef().collection('journal').doc(docId).set(data);
  } catch (err) { console.error('Erreur update journal:', err); }
}

async function deleteJournalFromFirestore(docId) {
  try { await userRef().collection('journal').doc(docId).delete(); }
  catch (err) { console.error('Erreur delete journal:', err); }
}

/* ---- SANITAIRE ---- */
async function addSanitaireToFirestore(entry) {
  try {
    const data = { ...entry }; delete data._docId;
    return await userRef().collection('sanitaire').add(data);
  } catch (err) { console.error('Erreur add sanitaire:', err); }
}

async function updateSanitaireInFirestore(docId, entry) {
  try {
    const data = { ...entry }; delete data._docId;
    await userRef().collection('sanitaire').doc(docId).set(data);
  } catch (err) { console.error('Erreur update sanitaire:', err); }
}

async function deleteSanitaireFromFirestore(docId) {
  try { await userRef().collection('sanitaire').doc(docId).delete(); }
  catch (err) { console.error('Erreur delete sanitaire:', err); }
}

/* ---- TRANSHUMANCE ---- */
async function saveTransToFirestore() {
  try { await userRef().collection('config').doc('transhumance').set(transData); }
  catch (err) { console.error('Erreur save trans:', err); }
}

/* ---- PHOTOS — Firebase Storage ---- */

/**
 * Compresser une image File à max 800 Ko via Canvas
 */
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Réduire à 1280px max pour limiter le poids
        const maxPx = 1920;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        // Cible : 800 Ko max (Storage peut stocker de vraies photos, pas besoin de sur-compresser)
        const maxBytes = 800 * 1024;
        let quality = 0.82;
        const tryCompress = () => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Compression échouée')); return; }
            if (blob.size <= maxBytes || quality <= 0.25) resolve(blob);
            else { quality -= 0.08; tryCompress(); }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convertir un Blob en data URL base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ============================================================
   PHOTOS RUCHERS — Firebase Storage
   Les photos sont stockées dans Storage (pas en base64 dans Firestore).
   Firestore conserve uniquement les métadonnées (url, storagePath, etc.)
   Rétrocompatibilité : les anciens docs avec champ "data" (base64) sont lus
   ============================================================ */

/**
 * Uploader une photo rucher vers Firebase Storage
 * @returns {Promise<string>} URL de téléchargement publique
 */
async function uploadPhotoToFirestore(rucherId, blob, filename) {
  const storagePath = `users/${currentUser.uid}/ruchers/${rucherId}/${filename}`;
  const ref = storage.ref(storagePath);
  await ref.put(blob, { contentType: 'image/jpeg' });
  const url = await ref.getDownloadURL();
  await userRef().collection('photos').add({
    rucherId, filename, url, storagePath, timestamp: Date.now()
  });
  return url;
}

/**
 * Supprimer une photo rucher (Storage + Firestore)
 */
async function deletePhotoFromFirestore(rucherId, photoUrl) {
  try {
    // Cherche d'abord par url (nouveau format Storage)
    let snap = await userRef().collection('photos')
      .where('rucherId', '==', rucherId).where('url', '==', photoUrl).get();
    // Fallback : anciens docs base64 stockés dans champ "data"
    if (snap.empty) {
      snap = await userRef().collection('photos')
        .where('rucherId', '==', rucherId).where('data', '==', photoUrl).get();
    }
    for (const doc of snap.docs) {
      const { storagePath } = doc.data();
      if (storagePath) await storage.ref(storagePath).delete().catch(() => {});
      await doc.ref.delete();
    }
  } catch (err) {
    console.warn('Erreur suppression photo:', err);
  }
}

/**
 * Supprimer toutes les photos d'un rucher (Storage + Firestore)
 */
async function deleteAllPhotosOfRucher(rucherId) {
  try {
    const snap = await userRef().collection('photos')
      .where('rucherId', '==', rucherId).get();
    const batch = db.batch();
    for (const doc of snap.docs) {
      const { storagePath } = doc.data();
      if (storagePath) await storage.ref(storagePath).delete().catch(() => {});
      batch.delete(doc.ref);
    }
    await batch.commit();
    delete rucherPhotos[rucherId];
  } catch (err) {
    console.warn('Erreur suppression photos rucher:', err);
  }
}

/**
 * Charger toutes les photos ruchers (supporte anciens docs base64 et nouveaux Storage)
 */
async function loadPhotosFromFirestore() {
  try {
    const snap = await userRef().collection('photos').orderBy('timestamp').get();
    rucherPhotos = {};
    snap.forEach(doc => {
      const { rucherId, url, data } = doc.data();
      if (!rucherPhotos[rucherId]) rucherPhotos[rucherId] = [];
      rucherPhotos[rucherId].push(url || data); // url = Storage, data = ancien base64
    });
  } catch (err) {
    console.warn('Erreur chargement photos:', err);
    rucherPhotos = {};
  }
}

/* ============================================================
   PHOTOS DE VISITE — Firebase Storage
   ============================================================ */

/**
 * Uploader une photo de visite vers Firebase Storage
 */
async function uploadVisitPhotoToFirestore(visitId, blob, filename) {
  const storagePath = `users/${currentUser.uid}/visits/${visitId}/${filename}`;
  const ref = storage.ref(storagePath);
  await ref.put(blob, { contentType: 'image/jpeg' });
  const url = await ref.getDownloadURL();
  await userRef().collection('visitPhotos').add({
    visitId, filename, url, storagePath, timestamp: Date.now()
  });
  return url;
}

/**
 * Ré-enregistrer une photo déjà dans Storage dans les métadonnées Firestore.
 * Utilisé lors de l'édition d'une visite pour conserver les photos inchangées.
 */
async function reRegisterVisitPhoto(visitId, url) {
  await userRef().collection('visitPhotos').add({
    visitId, filename: '', url, storagePath: null, timestamp: Date.now()
  });
}

/**
 * Supprimer toutes les photos d'une visite (Storage + Firestore).
 * Utilisé lors de la suppression complète d'une visite.
 */
async function deleteAllVisitPhotos(visitId) {
  try {
    const snap = await userRef().collection('visitPhotos')
      .where('visitId', '==', visitId).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) {
      const { storagePath } = doc.data();
      if (storagePath) await storage.ref(storagePath).delete().catch(() => {});
      batch.delete(doc.ref);
    }
    await batch.commit();
    delete visitPhotos[visitId];
  } catch (err) { console.warn('Erreur suppression photos visite:', err); }
}

/**
 * Supprimer uniquement les métadonnées Firestore (garde les fichiers Storage).
 * Utilisé lors de l'édition d'une visite pour re-écrire les métadonnées proprement.
 */
async function deleteAllVisitPhotosMetadata(visitId) {
  try {
    const snap = await userRef().collection('visitPhotos')
      .where('visitId', '==', visitId).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (err) { console.warn('Erreur suppression métadonnées photos:', err); }
}

/**
 * Charger toutes les photos de visites (supporte anciens base64 et nouveaux Storage)
 */
async function loadVisitPhotos() {
  try {
    visitPhotos = {};
    const snap = await userRef().collection('visitPhotos').orderBy('timestamp').get();
    snap.forEach(doc => {
      const { visitId, url, data } = doc.data();
      if (!visitPhotos[visitId]) visitPhotos[visitId] = [];
      visitPhotos[visitId].push(url || data);
    });
  } catch (err) {
    console.warn('Erreur chargement photos visites:', err);
    visitPhotos = {};
  }
}

/* ============================================================
   AUDIO DE VISITE — Firebase Storage
   ============================================================ */

/**
 * Uploader un mémo audio vers Firebase Storage
 */
async function uploadVisitAudioToFirestore(visitId, audioBlob, duration) {
  const ext = audioBlob.type?.includes('mp4') ? 'mp4' : 'webm';
  const filename = `audio_${Date.now()}.${ext}`;
  const storagePath = `users/${currentUser.uid}/visits/${visitId}/${filename}`;
  const ref = storage.ref(storagePath);
  await ref.put(audioBlob, { contentType: audioBlob.type || 'audio/webm' });
  const url = await ref.getDownloadURL();
  await userRef().collection('visitAudio').add({
    visitId, url, storagePath, duration, timestamp: Date.now()
  });
  return url;
}

/**
 * Supprimer l'audio d'une visite (Storage + Firestore).
 */
async function deleteVisitAudio(visitId) {
  try {
    const snap = await userRef().collection('visitAudio')
      .where('visitId', '==', visitId).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) {
      const { storagePath } = doc.data();
      if (storagePath) await storage.ref(storagePath).delete().catch(() => {});
      batch.delete(doc.ref);
    }
    await batch.commit();
    delete visitAudio[visitId];
  } catch (err) { console.warn('Erreur suppression audio visite:', err); }
}

/**
 * Supprimer uniquement les métadonnées Firestore de l'audio (garde le fichier Storage).
 */
async function deleteVisitAudioMetadata(visitId) {
  try {
    const snap = await userRef().collection('visitAudio')
      .where('visitId', '==', visitId).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (err) { console.warn('Erreur suppression métadonnées audio:', err); }
}

/**
 * Ré-enregistrer un audio déjà dans Storage dans les métadonnées Firestore.
 */
async function reRegisterVisitAudio(visitId, url, duration) {
  await userRef().collection('visitAudio').add({
    visitId, url, storagePath: null, duration, timestamp: Date.now()
  });
}

/**
 * Charger tous les audios de visites (supporte anciens base64 et nouveaux Storage)
 */
async function loadVisitAudio() {
  try {
    visitAudio = {};
    const snap = await userRef().collection('visitAudio').get();
    snap.forEach(doc => {
      const { visitId, url, data, duration } = doc.data();
      visitAudio[visitId] = { data: url || data, duration };
    });
  } catch (err) {
    console.warn('Erreur chargement audio visites:', err);
    visitAudio = {};
  }
}

/* ============================================================
   MOUVEMENTS DE COLONIES — Firestore
   Collection : users/{uid}/mouvements/
   ============================================================ */

async function addMouvementToFirestore(entry) {
  try {
    const data = { ...entry }; delete data._docId;
    return await userRef().collection('mouvements').add(data);
  } catch (err) { console.error('Erreur add mouvement:', err); }
}

async function updateMouvementInFirestore(docId, entry) {
  try {
    const data = { ...entry }; delete data._docId;
    await userRef().collection('mouvements').doc(docId).set(data);
  } catch (err) { console.error('Erreur update mouvement:', err); }
}

async function deleteMouvementFromFirestore(docId) {
  try { await userRef().collection('mouvements').doc(docId).delete(); }
  catch (err) { console.error('Erreur delete mouvement:', err); }
}

async function loadMouvementsFromFirestore() {
  try {
    const snap = await userRef().collection('mouvements').orderBy('date', 'desc').get();
    mouvementsData = [];
    snap.forEach(doc => mouvementsData.push({ ...doc.data(), _docId: doc.id }));
  } catch (err) {
    console.warn('Erreur chargement mouvements:', err);
    mouvementsData = [];
  }
}

/* ============================================================
   DOCUMENTS RÉGLEMENTAIRES — Firebase Storage + Firestore
   Stockage : users/{uid}/documents/{filename}
   Métadonnées : users/{uid}/documents/{docId}
   ============================================================ */

/**
 * Uploader un document vers Firebase Storage et sauvegarder ses métadonnées
 * @param {File} file — le fichier sélectionné
 * @param {Object} opts — { label, type, rucher?, sanitaireDocId? }
 * @returns {Promise<Object>} — métadonnées avec _docId
 */
async function uploadDocumentToFirestore(file, { label, type, rucher = '', sanitaireDocId = '' }) {
  const ext = file.name.split('.').pop().toLowerCase() || 'bin';
  const filename = `doc_${Date.now()}.${ext}`;
  const storagePath = `users/${currentUser.uid}/documents/${filename}`;
  const ref = storage.ref(storagePath);
  await ref.put(file, { contentType: file.type || 'application/octet-stream' });
  const url = await ref.getDownloadURL();
  const meta = {
    label, type, rucher, sanitaireDocId,
    originalName: file.name,
    filename, url, storagePath,
    timestamp: Date.now()
  };
  const docRef = await userRef().collection('documents').add(meta);
  return { ...meta, _docId: docRef.id };
}

/**
 * Charger tous les documents de l'utilisateur
 */
async function loadDocumentsFromFirestore() {
  try {
    const snap = await userRef().collection('documents').orderBy('timestamp', 'desc').get();
    documentsData = [];
    snap.forEach(doc => documentsData.push({ ...doc.data(), _docId: doc.id }));
  } catch (err) {
    console.warn('Erreur chargement documents:', err);
    documentsData = [];
  }
}

/**
 * Supprimer un document (Storage + Firestore)
 */
async function deleteDocumentFromFirestore(docId) {
  try {
    const snap = await userRef().collection('documents').doc(docId).get();
    if (!snap.exists) return;
    const { storagePath } = snap.data();
    if (storagePath) await storage.ref(storagePath).delete().catch(() => {});
    await snap.ref.delete();
  } catch (err) {
    console.warn('Erreur suppression document:', err);
  }
}

/* ---- Listeners temps réel ---- */
/* ---- Stockage des fonctions unsubscribe pour éviter les listeners en doublon ---- */
let _unsubListeners = [];

function stopRealtimeListeners() {
  _unsubListeners.forEach(unsub => { try { unsub(); } catch(e) {} });
  _unsubListeners = [];
  console.log('🔇 Listeners temps réel arrêtés');
}

function startRealtimeListeners() {
  if (!currentUser) return;

  // Toujours annuler les anciens listeners avant d'en créer de nouveaux.
  // auth.onAuthStateChanged peut se déclencher plusieurs fois (refresh de token,
  // reconnexion réseau) — sans cette protection on accumule des listeners en doublon.
  stopRealtimeListeners();

  const u1 = userRef().collection('journal').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      // Source unique de vérité — on ne filtre plus hasPendingWrites
      journalData = [];
      snapshot.forEach(doc => journalData.push({ ...doc.data(), _docId: doc.id }));
      localStorage.setItem('journal', JSON.stringify(journalData));
      if (typeof renderJournal === 'function') {
        renderJournal(); updateDashboard(); drawChartVisites();
      }
      if (!snapshot.metadata.hasPendingWrites) setLastSyncNow();
    }, err => console.error('Listener journal:', err));

  const u2 = userRef().collection('sanitaire').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      sanitaireData = [];
      snapshot.forEach(doc => sanitaireData.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderSanitaire === 'function') {
        renderSanitaire(); updateDashboard();
      }
      setLastSyncNow();
    }, err => console.error('Listener sanitaire:', err));

  const u3 = userRef().collection('ruchers').orderBy('id')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      RUCHERS.length = 0;
      snapshot.forEach(doc => RUCHERS.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderRuchers === 'function') {
        renderRuchers(); renderAllSelects(); updateDashboard(); updateTopbar();
      }
      setLastSyncNow();
    }, err => console.error('Listener ruchers:', err));

  _unsubListeners = [u1, u2, u3];
  console.log('👂 Listeners temps réel activés (', _unsubListeners.length, ')');
}

/* ---- Suppression complète du compte (RGPD) ---- */
async function deleteAllUserData() {
  if (!currentUser) return;
  stopRealtimeListeners();
  const collections = ['journal', 'sanitaire', 'ruchers', 'photos', 'config'];
  for (const col of collections) {
    try {
      const snap = await userRef().collection(col).get();
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      if (!snap.empty) await batch.commit();
    } catch (e) { console.warn('deleteAllUserData:', col, e); }
  }
  // Supprimer les fichiers Firebase Storage
  try {
    const storageRef = storage.ref(`users/${currentUser.uid}`);
    const list = await storageRef.listAll();
    await Promise.all([
      ...list.items.map(item => item.delete()),
      ...list.prefixes.map(async prefix => {
        const sub = await prefix.listAll();
        return Promise.all(sub.items.map(i => i.delete()));
      }),
    ]);
  } catch (e) { console.warn('deleteAllUserData storage:', e); }
  // Supprimer le document utilisateur racine
  try { await userRef().delete(); } catch (e) {}
  localStorage.clear();
}
