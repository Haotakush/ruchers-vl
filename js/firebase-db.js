/* ============================================================
   firebase-db.js — Couche d'accès Firestore

   Ce fichier gère :
   - Le chargement initial de toutes les données depuis Firestore
   - La sauvegarde/suppression vers Firestore
   - L'écoute en temps réel (listeners) pour sync multi-appareils
   - La migration automatique des données localStorage → Firestore

   Structure Firestore :
   users/{uid}/
     ├── config/params          → paramètres apiculteur
     ├── config/transhumance    → données transhumance
     ├── ruchers/{rucherId}     → chaque rucher (R01, R02…)
     ├── journal/{autoId}       → chaque visite
     └── sanitaire/{autoId}     → chaque traitement

   ⚠️  Dépend de firebase-init.js (variables auth, db)
   ⚠️  Dépend de data.js (variables globales RUCHERS, journalData, etc.)
   ============================================================ */


/* ------------------------------------------------------------
   HELPERS — Chemin vers les collections de l'utilisateur
   ------------------------------------------------------------ */

/** Obtenir la référence de base pour l'utilisateur connecté */
function userRef() {
  return db.collection('users').doc(currentUser.uid);
}


/* ------------------------------------------------------------
   CHARGEMENT INITIAL — Depuis Firestore
   Appelé une seule fois après la connexion
   ------------------------------------------------------------ */

async function loadAllDataFromFirestore() {
  const uid = currentUser.uid;
  console.log('📥 Chargement Firestore pour', uid);

  try {
    // 1. Paramètres apiculteur
    const paramsDoc = await userRef().collection('config').doc('params').get();
    if (paramsDoc.exists) {
      PARAMS = paramsDoc.data();
    }

    // 2. Ruchers
    const ruchersSnap = await userRef().collection('ruchers').orderBy('id').get();
    if (!ruchersSnap.empty) {
      RUCHERS.length = 0;
      ruchersSnap.forEach(doc => {
        RUCHERS.push({ ...doc.data(), _docId: doc.id });
      });
    }

    // 3. Journal des visites
    const journalSnap = await userRef().collection('journal').orderBy('date', 'desc').get();
    journalData = [];
    journalSnap.forEach(doc => {
      journalData.push({ ...doc.data(), _docId: doc.id });
    });

    // 4. Sanitaire
    const sanitaireSnap = await userRef().collection('sanitaire').orderBy('date', 'desc').get();
    sanitaireData = [];
    sanitaireSnap.forEach(doc => {
      sanitaireData.push({ ...doc.data(), _docId: doc.id });
    });

    // 5. Transhumance
    const transDoc = await userRef().collection('config').doc('transhumance').get();
    if (transDoc.exists) {
      transData = transDoc.data();
    }

    // 6. Photos (on garde en localStorage car trop lourd pour Firestore)
    //    Les photos en base64 dépassent souvent 1 Mo par document
    rucherPhotos = JSON.parse(localStorage.getItem('rucherPhotos') || '{}');

    console.log(`✅ Données chargées : ${RUCHERS.length} ruchers, ${journalData.length} visites, ${sanitaireData.length} traitements`);

    // Si Firestore est vide, proposer la migration depuis localStorage
    if (ruchersSnap.empty && journalSnap.empty) {
      await migrateFromLocalStorage();
    }

  } catch (err) {
    console.error('❌ Erreur chargement Firestore:', err);
    toast('⚠️ Erreur de chargement — mode hors ligne');
  }
}


/* ------------------------------------------------------------
   MIGRATION — localStorage → Firestore
   Exécutée automatiquement si Firestore est vide
   (premier lancement après migration)
   ------------------------------------------------------------ */

async function migrateFromLocalStorage() {
  const localJournal   = JSON.parse(localStorage.getItem('journal')   || '[]');
  const localSanitaire = JSON.parse(localStorage.getItem('sanitaire') || '[]');
  const localRuchers   = JSON.parse(localStorage.getItem('ruchers')   || 'null');
  const localParams    = JSON.parse(localStorage.getItem('params')    || 'null');
  const localTrans     = JSON.parse(localStorage.getItem('transData') || 'null');

  const hasData = localJournal.length || localSanitaire.length || localRuchers;

  if (!hasData) {
    console.log('ℹ️ Pas de données locales à migrer, utilisation des défauts.');
    // Sauvegarder les données par défaut dans Firestore
    await saveParamsToFirestore();
    for (const r of RUCHERS_DEFAULT) {
      await saveRucherToFirestore(r);
    }
    // Recharger depuis Firestore
    RUCHERS.length = 0;
    RUCHERS_DEFAULT.forEach(r => RUCHERS.push({...r}));
    return;
  }

  console.log('🔄 Migration localStorage → Firestore...');
  toast('🔄 Migration des données en cours…');

  try {
    // Migrer les paramètres
    if (localParams) {
      PARAMS = localParams;
      await saveParamsToFirestore();
    }

    // Migrer les ruchers
    if (localRuchers) {
      RUCHERS.length = 0;
      for (const r of localRuchers) {
        const docRef = await saveRucherToFirestore(r);
        RUCHERS.push({ ...r, _docId: docRef.id });
      }
    }

    // Migrer le journal
    for (const v of localJournal) {
      const docRef = await userRef().collection('journal').add(v);
      journalData.push({ ...v, _docId: docRef.id });
    }

    // Migrer le sanitaire
    for (const s of localSanitaire) {
      const docRef = await userRef().collection('sanitaire').add(s);
      sanitaireData.push({ ...s, _docId: docRef.id });
    }

    // Migrer la transhumance
    if (localTrans) {
      transData = localTrans;
      await saveTransToFirestore();
    }

    console.log('✅ Migration terminée !');
    toast('✅ Données migrées vers Firebase !');

  } catch (err) {
    console.error('❌ Erreur migration:', err);
    toast('⚠️ Erreur de migration');
  }
}


/* ------------------------------------------------------------
   SAUVEGARDE — Fonctions d'écriture dans Firestore
   ------------------------------------------------------------ */

/** Sauvegarder les paramètres apiculteur */
async function saveParamsToFirestore() {
  try {
    await userRef().collection('config').doc('params').set(PARAMS);
  } catch (err) {
    console.error('Erreur save params:', err);
  }
}

/** Sauvegarder un rucher (ajout ou mise à jour) */
async function saveRucherToFirestore(rucher) {
  try {
    // Utiliser l'ID du rucher comme ID de document pour éviter les doublons
    const docRef = userRef().collection('ruchers').doc(rucher.id);
    // Nettoyer le _docId avant de sauvegarder
    const data = { ...rucher };
    delete data._docId;
    await docRef.set(data);
    return docRef;
  } catch (err) {
    console.error('Erreur save rucher:', err);
  }
}

/** Supprimer un rucher */
async function deleteRucherFromFirestore(rucherId) {
  try {
    await userRef().collection('ruchers').doc(rucherId).delete();
  } catch (err) {
    console.error('Erreur delete rucher:', err);
  }
}

/** Ajouter une visite au journal */
async function addJournalToFirestore(entry) {
  try {
    const data = { ...entry };
    delete data._docId;
    const docRef = await userRef().collection('journal').add(data);
    return docRef;
  } catch (err) {
    console.error('Erreur add journal:', err);
  }
}

/** Supprimer une visite du journal */
async function deleteJournalFromFirestore(docId) {
  try {
    await userRef().collection('journal').doc(docId).delete();
  } catch (err) {
    console.error('Erreur delete journal:', err);
  }
}

/** Ajouter un traitement sanitaire */
async function addSanitaireToFirestore(entry) {
  try {
    const data = { ...entry };
    delete data._docId;
    const docRef = await userRef().collection('sanitaire').add(data);
    return docRef;
  } catch (err) {
    console.error('Erreur add sanitaire:', err);
  }
}

/** Supprimer un traitement sanitaire */
async function deleteSanitaireFromFirestore(docId) {
  try {
    await userRef().collection('sanitaire').doc(docId).delete();
  } catch (err) {
    console.error('Erreur delete sanitaire:', err);
  }
}

/** Sauvegarder les données de transhumance */
async function saveTransToFirestore() {
  try {
    await userRef().collection('config').doc('transhumance').set(transData);
  } catch (err) {
    console.error('Erreur save trans:', err);
  }
}


/* ------------------------------------------------------------
   LISTENERS TEMPS RÉEL — Sync multi-appareils
   Écoute les changements dans Firestore et met à jour l'UI
   ------------------------------------------------------------ */

function startRealtimeListeners() {
  if (!currentUser) return;

  // Listener sur le journal
  userRef().collection('journal').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      // Ne pas mettre à jour si c'est le chargement initial
      if (snapshot.metadata.hasPendingWrites) return;

      journalData = [];
      snapshot.forEach(doc => {
        journalData.push({ ...doc.data(), _docId: doc.id });
      });
      // Rafraîchir l'UI si l'app est initialisée
      if (typeof renderJournal === 'function') {
        renderJournal();
        updateDashboard();
        drawChartVisites();
      }
    }, err => console.error('Listener journal:', err));

  // Listener sur le sanitaire
  userRef().collection('sanitaire').orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;

      sanitaireData = [];
      snapshot.forEach(doc => {
        sanitaireData.push({ ...doc.data(), _docId: doc.id });
      });
      if (typeof renderSanitaire === 'function') {
        renderSanitaire();
        updateDashboard();
      }
    }, err => console.error('Listener sanitaire:', err));

  // Listener sur les ruchers
  userRef().collection('ruchers').orderBy('id')
    .onSnapshot(snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;

      RUCHERS.length = 0;
      snapshot.forEach(doc => {
        RUCHERS.push({ ...doc.data(), _docId: doc.id });
      });
      if (typeof renderRuchers === 'function') {
        renderRuchers();
        renderAllSelects();
        updateDashboard();
        updateTopbar();
      }
    }, err => console.error('Listener ruchers:', err));

  console.log('👂 Listeners temps réel activés');
}
