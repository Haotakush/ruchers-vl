/* ============================================================
   data.js — Données de l'application
   
   Ce fichier gère :
   - Les données par défaut (ruchers, calendrier, paramètres)
   - La lecture/écriture dans le localStorage
   - Les fonctions utilitaires liées aux données
   
   ⚠️  Pour ajouter un nouveau rucher par défaut : modifier RUCHERS_DEFAULT
   ⚠️  Pour modifier les infos de l'apiculteur : modifier PARAMS_DEFAULT
   ============================================================ */


/* ------------------------------------------------------------
   RUCHERS PAR DÉFAUT
   Structure d'un rucher :
   {
     id    : string  — identifiant unique ex. "R01"
     cp    : string  — code postal
     lieu  : string  — nom du lieu-dit
     zone  : string  — "Bas" | "Mi-pentes" | "Hauts"
     alt   : number  — altitude en mètres
     nb    : number|null — nombre de ruches (null si inconnu)
     lat   : number|null — latitude GPS
     lng   : number|null — longitude GPS
   }
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


/* ------------------------------------------------------------
   PARAMÈTRES PAR DÉFAUT (informations de l'apiculteur)
   Modifiables dans l'app via ⚙️ Paramètres
   ------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   CALENDRIER MELLIFÈRE — La Réunion Sud & Ouest
   Structure : { p: "Plante", m: [jan..déc] }
     '+' = miellée principale
     '/' = miellée d'appoint
      0  = pas de floraison
   ------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   CONSTANTES GLOBALES
   ------------------------------------------------------------ */
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];


/* ------------------------------------------------------------
   ÉTAT DE L'APPLICATION (variables globales)
   Initialisées depuis le localStorage au démarrage
   ------------------------------------------------------------ */
let PARAMS        = JSON.parse(localStorage.getItem('params')      || JSON.stringify(PARAMS_DEFAULT));
let RUCHERS       = JSON.parse(localStorage.getItem('ruchers')     || JSON.stringify(RUCHERS_DEFAULT));
let journalData   = JSON.parse(localStorage.getItem('journal')     || '[]');
let sanitaireData = JSON.parse(localStorage.getItem('sanitaire')   || '[]');
let rucherPhotos  = JSON.parse(localStorage.getItem('rucherPhotos')|| '{}');
let transData     = JSON.parse(localStorage.getItem('transData')   || '{}');

// État UI (non persisté)
let currentTab   = 'dashboard';
let ruchesMethod = 'numerique'; // 'numerique' | 'marquage'


/* ------------------------------------------------------------
   FONCTIONS — Persistance
   ------------------------------------------------------------ */

/** Sauvegarder la liste des ruchers dans le localStorage */
function saveRuchers() {
  localStorage.setItem('ruchers', JSON.stringify(RUCHERS));
}

/** Sauvegarder les paramètres de l'apiculteur */
function saveParamsToStorage() {
  localStorage.setItem('params', JSON.stringify(PARAMS));
}


/* ------------------------------------------------------------
   FONCTIONS — Accès aux données
   ------------------------------------------------------------ */

/** Trouver un rucher par son ID */
function getRucherById(id) {
  return RUCHERS.find(r => r.id === id);
}

/** Obtenir le label affiché d'un rucher : "R01 — Gol les Hauts" */
function getRucherLabel(id) {
  const r = getRucherById(id);
  return r ? `${r.id} — ${r.lieu}` : id;
}

/**
 * Calculer le nombre de jours depuis une date ISO (YYYY-MM-DD)
 * Retourne null si la date est absente
 */
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

/** Calculer le total de ruches actives sur tous les ruchers */
function getTotalRuches() {
  return RUCHERS.reduce((acc, r) => acc + (r.nb || 0), 0);
}

/**
 * Construire une map { rucherId: dernière date de visite }
 * Utilisée par le dashboard et la carte
 */
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
