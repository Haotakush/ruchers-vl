/* ============================================================
   data.js — Données de l'application

   Ce fichier gère :
   - Les données par défaut (ruchers, calendrier, paramètres)
   - Les fonctions de persistance (Firestore + localStorage fallback)
   - Les fonctions utilitaires liées aux données

   ⚠️  Pour ajouter un nouveau rucher par défaut : modifier RUCHERS_DEFAULT
   ⚠️  Pour modifier les infos de l'apiculteur : modifier PARAMS_DEFAULT
   ============================================================ */


/* ------------------------------------------------------------
   RUCHERS PAR DÉFAUT
   ------------------------------------------------------------ */
const RUCHERS_DEFAULT = [
  { id:'R01', cp:'97421', lieu:'Gol les Hauts',       zone:'Bas',       alt:350,  nb:24,   lat:-21.3520, lng:55.3980 },
  { id:'R02', cp:'97421', lieu:'Canot / Tapage',       zone:'Bas',       alt:400,  nb:24,   lat:-21.3620, lng:55.3850 },
  { id:'R03', cp:'97450', lieu:'Le Gol',               zone:'Bas',       alt:200,  nb:37,   lat:-21.3450, lng:55.4020 },
  { id:'R04', cp:'97427', lieu:"L'Étang-Salé — Arda", zone:'Bas',       alt:7,    nb:30,   lat:-21.2640, lng:55.3340 },
  { id:'R05', cp:'97430', lieu:'Dassy',                zone:'Mi-pentes', alt:550,  nb:35,   lat:-21.2800, lng:55.5200 },
  { id:'R06', cp:'97410', lieu:'Bassin Martin',        zone:'Mi-pentes', alt:550,  nb:24,   lat:-21.3200, lng:55.4760 },
  { id:'R07', cp:'97413', lieu:'Cilaos — Bras sec',    zone:'Hauts',     alt:1000, nb:null, lat:-21.1360, lng:55.4730 },
  { id:'R08', cp:'97432', lieu:"Bois d'Olive",         zone:'Bas',       alt:200,  nb:16,   lat:-21.3380, lng:55.4650 },
  { id:'R09', cp:'97470', lieu:'Chemin ceinture',      zone:'Mi-pentes', alt:450,  nb:null, lat:-21.0200, lng:55.6350 },
];

const PARAMS_DEFAULT = {
  nom:      'VALENCOURT LUDOVIC',
  napi:     'A5134145',
  siret:    '94897101500011',
  adresse:  '17 Chemin des Alamandas — 97421 Saint-Louis',
  email:    'valencourt.pro [at] gmail.com',
  dateDecl: '07/12/2025',
  refDecl:  '2025-00140066',
  colonies: '180',
};

const CAL = [
  { zone:'⬇ BAS (0–400m)' },
  { p:'Letchi',              m:[0,0,0,0,0,0,'+','+','+',0,0,0] },
  { p:'Liane corail',        m:[0,0,0,0,'/','/','/','/','/',0,0,0] },
  { p:'Cocotier / Palmiers', m:['/','/','/','/','/','/','/','/','/','/','/','/'] },
  { p:"Tamarin d'Inde",      m:['+',0,0,0,0,0,0,0,0,'+','+','+'] },
  { p:'Liane papillon',      m:['/','/','/',0,0,0,0,0,0,0,'/','/'] },
  { p:'Baie rose',           m:[0,'+','+','+','+',0,0,0,0,0,0,0] },
  { zone:'⬇ MI-PENTES (400–800m)' },
  { p:'Grévillaire',         m:['+',0,0,0,0,0,0,0,0,'+','+','+'] },
  { p:'Jamerose',            m:['+','+',0,0,0,0,0,0,0,'+','+','+'] },
  { p:'Eucalyptus',          m:['+',0,0,0,0,0,0,0,0,0,0,0] },
  { p:"Teck d'Arabie",       m:[0,0,0,0,'/','/','/',0,0,0,0,0] },
  { p:'Café Bourbon',        m:[0,0,0,0,0,0,0,0,'/','/','/',0] },
  { zone:'⬇ HAUTS — CILAOS (800m+)' },
  { p:'Fleur de Jouvence',   m:[0,0,0,0,0,0,0,0,0,0,'+','+'] },
  { p:'Fleur jaune',         m:['+','+','+',0,0,0,0,0,0,0,0,'+'] },
  { p:'Longose',             m:['+','+','+',0,0,0,0,0,0,0,0,'+'] },
  { p:'Tan rouge',           m:[0,0,'+','+','+','+',0,0,0,0,0,0] },
  { p:'Mahot',               m:[0,0,0,'+','+','+',0,0,0,0,0,0] },
];

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

let PARAMS        = { ...PARAMS_DEFAULT };
let RUCHERS       = [...RUCHERS_DEFAULT];
let journalData   = [];
let sanitaireData = [];
let rucherPhotos  = {};
let transData     = {};
let currentTab   = 'dashboard';
let ruchesMethod = 'numerique';

function saveRuchers() {
  localStorage.setItem('ruchers', JSON.stringify(RUCHERS));
}

function saveParamsToStorage() {
  localStorage.setItem('params', JSON.stringify(PARAMS));
  if (currentUser) saveParamsToFirestore();
}

function getRucherById(id) {
  return RUCHERS.find(r => r.id === id);
}

function getRucherLabel(id) {
  const r = getRucherById(id);
  return r ? `${r.id} — ${r.lieu}` : id;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

function getTotalRuches() {
  return RUCHERS.reduce((acc, r) => acc + (r.nb || 0), 0);
}

function buildLastVisitMap() {
  const lastVisitMap = {};
  RUCHERS.forEach(r => { lastVisitMap[r.id] = null; });
  journalData.forEach(v => {
    if (lastVisitMap[v.rucher] !== undefined) {
      if (!lastVisitMap[v.rucher] || v.date > lastVisitMap[v.rucher]) {
        lastVisitMap[v.rucher] = v.date;
      }
    }
  });
  return lastVisitMap;
}
