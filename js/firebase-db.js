/* ============================================================
   firebase-db.js — Couche d'accès Firestore
   v1.1 — Ajout updateJournalInFirestore
   ============================================================ */

function userRef() {
  return db.collection('users').doc(currentUser.uid);
}

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

    rucherPhotos = JSON.parse(localStorage.getItem('rucherPhotos') || '{}');

    console.log(`✅ Données chargées : ${RUCHERS.length} ruchers, ${journalData.length} visites, ${sanitaireData.length} traitements`);

    if (ruchersSnap.empty && journalSnap.empty) {
      await migrateFromLocalStorage();
    }

  } catch (err) {
    console.error('❌ Erreur chargement Firestore:', err);
    toast('⚠️ Erreur de chargement — mode hors ligne');
  }
}

async function migrateFromLocalStorage() {
  const localJournal   = JSON.parse(localStorage.getItem('journal')   || '[]');
  const localSanitaire = JSON.parse(localStorage.getItem('sanitaire') || '[]');
  const localRuchers   = JSON.parse(localStorage.getItem('ruchers')   || 'null');
  const localParams    = JSON.parse(localStorage.getItem('params')    || 'null');
  const localTrans     = JSON.parse(localStorage.getItem('transData') || 'null');

  const hasData = localJournal.length || localSanitaire.length || localRuchers;

  if (!hasData) {
    console.log('ℹ️ Pas de données locales à migrer, utilisation des défauts.');
    await saveParamsToFirestore();
    for (const r of RUCHERS_DEFAULT) await saveRucherToFirestore(r);
    RUCHERS.length = 0;
    RUCHERS_DEFAULT.forEach(r => RUCHERS.push({...r}));
    return;
  }

  console.log('🔄 Migration localStorage → Firestore...');
  toast('🔄 Migration des données en cours…');

  try {
    if (localParams) { PARAMS = localParams; await saveParamsToFirestore(); }

    if (localRuchers) {
      RUCHERS.length = 0;
      for (const r of localRuchers) {
        const docRef = await saveRucherToFirestore(r);
        RUCHERS.push({ ...r, _docId: docRef.id });
      }
    }

    for (const v of localJournal) {
      const docRef = await userRef().collection('journal').add(v);
      journalData.push({ ...v, _docId: docRef.id });
    }

    for (const s of localSanitaire) {
      const docRef = await userRef().collection('sanitaire').add(s);
      sanitaireData.push({ ...s, _docId: docRef.id });
    }

    if (localTrans) { transData = localTrans; await saveTransToFirestore(); }

    console.log('✅ Migration terminée !');
    toast('✅ Données migrées vers Firebase !');

  } catch (err) {
    console.error('❌ Erreur migration:', err);
    toast('⚠️ Erreur de migration');
  }
}

/* -- Écriture -- */

async function saveParamsToFirestore() {
  try {
    await userRef().collection('config').doc('params').set(PARAMS);
  } catch (err) { console.error('Erreur save params:', err); }
}

async function saveRucherToFirestore(rucher) {
  try {
    const docRef = userRef().collection('ruchers').doc(rucher.id);
    const data = { ...rucher };
    delete data._docId;
    await docRef.set(data);
    return docRef;
  } catch (err) { console.error('Erreur save rucher:', err); }
}

async function deleteRucherFromFirestore(rucherId) {
  try {
    await userRef().collection('ruchers').doc(rucherId).delete();
  } catch (err) { console.error('Erreur delete rucher:', err); }
}

async function addJournalToFirestore(entry) {
  try {
    const data = { ...entry };
    delete data._docId;
    return await userRef().collection('journal').add(data);
  } catch (err) { console.error('Erreur add journal:', err); }
}

/** ✅ NOUVEAU : Mettre à jour une visite existante */
async function updateJournalInFirestore(docId, entry) {
  try {
    const data = { ...entry };
    delete data._docId;
    await userRef().collection('journal').doc(docId).set(data);
  } catch (err) { console.error('Erreur update journal:', err); }
}

async function deleteJournalFromFirestore(docId) {
  try {
    await userRef().collection('journal').doc(docId).delete();
  } catch (err) { console.error('Erreur delete journal:', err); }
}

async function addSanitaireToFirestore(entry) {
  try {
    const data = { ...entry };
    delete data._docId;
    return await userRef().collection('sanitaire').add(data);
  } catch (err) { console.error('Erreur add sanitaire:', err); }
}

async function deleteSanitaireFromFirestore(docId) {
  try {
    await userRef().collection('sanitaire').doc(docId).delete();
  } catch (err) { console.error('Erreur delete sanitaire:', err); }
}

async function saveTransToFirestore() {
  try {
    await userRef().collection('config').doc('transhumance').set(transData);
  } catch (err) { console.error('Erreur save trans:', err); }
}

/* -- Listeners temps réel -- */

function startRealtimeListeners() {
  if (!currentUser) return;

  userRef().collection('journal').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      journalData = [];
      snapshot.forEach(doc => journalData.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderJournal === 'function') {
        renderJournal();
        updateDashboard();
        drawChartVisites();
      }
    }, err => console.error('Listener journal:', err));

  userRef().collection('sanitaire').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      sanitaireData = [];
      snapshot.forEach(doc => sanitaireData.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderSanitaire === 'function') {
        renderSanitaire();
        updateDashboard();
      }
    }, err => console.error('Listener sanitaire:', err));

  userRef().collection('ruchers').orderBy('id')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      RUCHERS.length = 0;
      snapshot.forEach(doc => RUCHERS.push({ ...doc.data(), _docId: doc.id }));
      if (typeof renderRuchers === 'function') {
        renderRuchers();
        renderAllSelects();
        updateDashboard();
        updateTopbar();
      }
    }, err => console.error('Listener ruchers:', err));

  console.log('👂 Listeners temps réel activés');
}
