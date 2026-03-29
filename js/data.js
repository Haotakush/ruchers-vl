/* ============================================================
   data.js — Données de l'application
   v1.3 — Données vierges, nouveau modèle rucher (nbRuchettes)
   ============================================================ */

/* Données par défaut — VIERGES pour la V1.3 */
const RUCHERS_DEFAULT = [];

const PARAMS_DEFAULT = {
  nom:      '',
  napi:     '',
  siret:    '',
  adresse:  '',
  email:    '',
  dateDecl: '',
  refDecl:  '',
  colonies: '',
};

const CAL = [
  { zone:'⬇ BAS (0–400m)' },
  { p:'Letchi',              m:[0,0,0,0,0,0,'+','+','+',0,0,0] },
  { p:'Liane corail',        m:[0,0,0,0,'/','/','/','/','/',0,0,0] },
  { p:"Cocotier / Palmiers", m:['/','/','/','/','/','/','/','/','/','/','/','/'] },
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
let RUCHERS       = [];
let journalData   = [];
let sanitaireData = [];
let rucherPhotos  = {};  // rucherId -> [dataUrl]
let visitPhotos   = {};  // visitId  -> [dataUrl]
let visitAudio    = {};  // visitId  -> { data: dataUrl, duration: seconds }
let transData     = {};
let currentTab    = 'dashboard';
let lastSyncTime  = null;

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

/** Obtenir le nombre de ruchettes de la dernière visite d'un rucher */
function getLastNbRuchettes(rucherId) {
  const visits = journalData.filter(v => v.rucher === rucherId && v.nbRuchettes !== undefined);
  if (!visits.length) return null;
  // journalData est trié par date desc, donc la première est la plus récente
  return visits[0].nbRuchettes;
}
