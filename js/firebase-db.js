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

    // Photos : chargement depuis Firestore (base64)
    await loadPhotosFromFirestore();

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

    renderJournal(); renderSanitaire(); renderRuchers();
    renderAllSelects(); updateDashboard(); drawChartVisites();
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

/* ---- PHOTOS — Firestore base64 ---- */

/**
 * Compresser une image File à max 600 Ko via Canvas
 * (Firestore limite les docs à 1 Mo, base64 ajoute ~33%)
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
        const maxPx = 1280;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        // Cible : 600 Ko max (→ ~800 Ko en base64, sous la limite 1 Mo Firestore)
        const maxBytes = 600 * 1024;
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

/**
 * Sauvegarder une photo dans Firestore (base64)
 * Stocke dans users/{uid}/photos/{autoId}
 * @returns {Promise<string>} La data URL base64 (utilisée comme "URL" de la photo)
 */
async function uploadPhotoToFirestore(rucherId, blob, filename) {
  const dataUrl = await blobToBase64(blob);
  const docData = {
    rucherId,
    filename,
    data: dataUrl,
    timestamp: Date.now()
  };
  await userRef().collection('photos').add(docData);
  return dataUrl; // on retourne la dataUrl, compatible avec img src
}

/**
 * Supprimer une photo Firestore à partir de sa dataUrl
 */
async function deletePhotoFromFirestore(rucherId, dataUrl) {
  try {
    const snap = await userRef().collection('photos')
      .where('rucherId', '==', rucherId)
      .where('data', '==', dataUrl)
      .get();
    snap.forEach(doc => doc.ref.delete());
  } catch (err) {
    console.warn('Erreur suppression photo Firestore:', err);
  }
}

/**
 * Supprimer toutes les photos d'un rucher (lors de la suppression du rucher)
 */
async function deleteAllPhotosOfRucher(rucherId) {
  try {
    const snap = await userRef().collection('photos')
      .where('rucherId', '==', rucherId).get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    delete rucherPhotos[rucherId];
  } catch (err) {
    console.warn('Erreur suppression photos rucher:', err);
  }
}

/**
 * Charger toutes les photos depuis Firestore dans rucherPhotos
 */
async function loadPhotosFromFirestore() {
  try {
    const snap = await userRef().collection('photos').orderBy('timestamp').get();
    rucherPhotos = {};
    snap.forEach(doc => {
      const { rucherId, data } = doc.data();
      if (!rucherPhotos[rucherId]) rucherPhotos[rucherId] = [];
      rucherPhotos[rucherId].push(data);
    });
  } catch (err) {
    console.warn('Erreur chargement photos:', err);
    rucherPhotos = {};
  }
}

/* ---- Listeners temps réel ---- */
function startRealtimeListeners() {
  if (!currentUser) return;

  userRef().collection('journal').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      journalData = [];
      snapshot.forEach(doc => journalData.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderJournal === 'function') {
        renderJournal(); updateDashboard(); drawChartVisites();
      }
      setLastSyncNow();
    }, err => console.error('Listener journal:', err));

  userRef().collection('sanitaire').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      sanitaireData = [];
      snapshot.forEach(doc => sanitaireData.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderSanitaire === 'function') {
        renderSanitaire(); updateDashboard();
      }
      setLastSyncNow();
    }, err => console.error('Listener sanitaire:', err));

  userRef().collection('ruchers').orderBy('id')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      RUCHERS.length = 0;
      snapshot.forEach(doc => RUCHERS.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderRuchers === 'function') {
        renderRuchers(); renderAllSelects(); updateDashboard(); updateTopbar();
      }
      setLastSyncNow();
    }, err => console.error('Listener ruchers:', err));

  console.log('👂 Listeners temps réel activés');
}
