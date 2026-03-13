/* ============================================================
   firebase-db.js — Couche Firestore + Storage
   v1.3 — Sync indicator, edit sanitaire, photos Storage
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

    // Photos : Storage Firebase (URLs) + fallback localStorage
    rucherPhotos = JSON.parse(localStorage.getItem('rucherPhotos') || '{}');

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

/* ---- PHOTOS — Firebase Storage ---- */
/**
 * Compresser une image File à max maxSizeMB Mo via Canvas
 * @param {File} file - Fichier image original
 * @param {number} maxSizeMB - Taille max en Mo (défaut 2)
 * @returns {Promise<Blob>} Blob JPEG compressé
 */
async function compressImage(file, maxSizeMB = 2) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxPx = 1920;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else                { width  = Math.round(width * maxPx / height); height = maxPx; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        const tryCompress = () => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Compression échouée')); return; }
            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
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
 * Uploader une photo dans Firebase Storage
 * @param {string} rucherId - ID du rucher
 * @param {Blob} blob - Image compressée
 * @param {string} filename - Nom du fichier
 * @returns {Promise<string>} URL de téléchargement
 */
async function uploadPhotoToStorage(rucherId, blob, filename) {
  const path = `users/${currentUser.uid}/ruchers/${rucherId}/${filename}`;
  const ref  = storage.ref(path);
  await ref.put(blob);
  return await ref.getDownloadURL();
}

/**
 * Supprimer une photo de Firebase Storage à partir de son URL
 */
async function deletePhotoFromStorage(url) {
  try {
    await storage.refFromURL(url).delete();
  } catch (err) {
    console.warn('Erreur suppression photo Storage:', err);
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
