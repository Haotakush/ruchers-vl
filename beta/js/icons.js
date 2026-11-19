/* ============================================================
   icons.js — Icônes Apicarnet (style duo) et dates lisibles
   Trait propolis (couleur du texte) + aplat miel ou couleur
   de l'intervention. Grille 24 px, trait 2 px arrondi.
   Usage HTML : <span data-icon="cheptel"></span>
   Usage JS   : icon('cheptel', 20)
   Aplat personnalisé : style="--ico-fill: var(--int-traitement)"
   ============================================================ */

const ICONS_DUO = {
  /* --- Navigation / rubriques --- */
  cheptel: {
    label: 'Mon cheptel', group: 'navigation',
    fill: '<path d="M5 10h14v4H5z"/>',
    stroke: '<path d="M3 10l9-6 9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-4h4v4"/>'
  },
  ruchers: {
    label: 'Ruchers', group: 'navigation',
    fill: '<circle cx="12" cy="10" r="3"/>',
    stroke: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="3"/>'
  },
  visite: {
    label: '+ Visite', group: 'navigation',
    fill: '<rect x="3" y="3" width="18" height="18" rx="5"/>',
    stroke: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>'
  },
  carnet: {
    label: 'Carnet', group: 'navigation',
    fill: '<path d="M9 3h9a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 18 21H9z"/>',
    stroke: '<rect x="5" y="3" width="14.5" height="18" rx="1.5"/><path d="M9 3v18"/><path d="M12.5 8h4M12.5 12h4"/>'
  },
  menu: {
    label: 'Menu', group: 'ui',
    stroke: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  },

  /* --- Types d'intervention --- */
  inspection: {
    label: 'Visite', group: 'intervention',
    fill: '<path d="M6 8h12v9H6z"/>',
    stroke: '<path d="M3 5h18"/><path d="M6 5v13h12V5"/><path d="M9 10h6M9 13.5h6"/>'
  },
  traitement: {
    label: 'Traitement', group: 'intervention',
    fill: '<path d="M7.6 14h8.8l2.3 4.3a1.3 1.3 0 0 1-1.1 1.9H6.4a1.3 1.3 0 0 1-1.1-1.9z"/>',
    stroke: '<path d="M9 3h6"/><path d="M10 3v6l-5 9.2A2 2 0 0 0 6.8 21h10.4a2 2 0 0 0 1.8-2.8L14 9V3"/>'
  },
  nourrissement: {
    label: 'Nourrissement', group: 'intervention',
    fill: '<path d="M5.7 13h12.6l-.8 6.5a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z"/>',
    stroke: '<path d="M4 9h16l-1.5 11a1 1 0 0 1-1 .9h-11a1 1 0 0 1-1-.9z"/><path d="M8 9a4 4 0 0 1 8 0"/>'
  },
  recolte: {
    label: 'Récolte', group: 'intervention',
    fill: '<path d="M6 12h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>',
    stroke: '<path d="M7 4h10"/><path d="M8 4v3M16 4v3"/><path d="M6 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>'
  },
  division: {
    label: 'Division', group: 'intervention',
    fill: '<path d="M14 11h7v9h-7z"/>',
    stroke: '<path d="M3 11h7v9H3z"/><path d="M14 11h7v9h-7z"/><path d="M6.5 11V7.5h11V11"/>'
  },
  transhumance: {
    label: 'Transhumance', group: 'intervention',
    fill: '<path d="M2 6h11v7H2z"/>',
    stroke: '<path d="M2 6h11v11H2z"/><path d="M13 10h4l3 3.5V17h-7"/><circle cx="6" cy="18" r="2"/><circle cx="16.5" cy="18" r="2"/>'
  },
  note: {
    label: 'Note pour la prochaine visite', group: 'intervention',
    fill: '<path d="M14.5 6.5l3 3L19 8l-3-3z"/>',
    stroke: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5l3 3"/>'
  },

  /* --- États de ruche --- */
  ras: {
    label: 'RAS', group: 'etat',
    fill: '<circle cx="12" cy="12" r="9"/>',
    stroke: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.5"/>'
  },
  surveiller: {
    label: 'À surveiller', group: 'etat',
    fill: '<circle cx="12" cy="12" r="3"/>',
    stroke: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
  },
  alerte: {
    label: 'Alerte', group: 'etat',
    fill: '<path d="M10.3 4.2L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>',
    stroke: '<path d="M10.3 4.2L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.2v.1"/>'
  },
  en_traitement: {
    label: 'En traitement (délai de retrait)', group: 'etat',
    fill: '<path d="M8.5 19.5c.8-2.6 6.2-2.6 7 0z"/>',
    stroke: '<path d="M6 3h12M6 21h12"/><path d="M7.5 3c0 5 9 5 9 9s-9 4-9 9"/><path d="M16.5 3c0 5-9 5-9 9s9 4 9 9"/>'
  },

  /* --- Administratif (Menu) --- */
  registre: {
    label: "Registre d'élevage", group: 'admin',
    fill: '<path d="M4 4h4v16H4z"/>',
    stroke: '<path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M8 4v16"/><path d="M11.5 9h5M11.5 13h5"/>'
  },
  reglementation: {
    label: 'Réglementation', group: 'admin',
    fill: '<path d="M7 11h10v3H7z"/>',
    stroke: '<path d="M9.5 3h5v5l2.5 3v3H7v-3l2.5-3z"/><path d="M4 17h16v3.5H4z"/>'
  },
  documents: {
    label: 'Documents réglementaires', group: 'admin',
    fill: '<path d="M14 3v5h5z"/>',
    stroke: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h5"/>'
  },
  calendrier: {
    label: 'Calendrier mellifère', group: 'admin',
    fill: '<circle cx="12" cy="12" r="2.6"/>',
    stroke: '<circle cx="12" cy="6.2" r="3"/><circle cx="17.5" cy="10.2" r="3"/><circle cx="15.4" cy="16.7" r="3"/><circle cx="8.6" cy="16.7" r="3"/><circle cx="6.5" cy="10.2" r="3"/><circle cx="12" cy="12" r="2.6"/>'
  },
  parametres: {
    label: 'Paramètres', group: 'admin',
    fill: '<circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>',
    stroke: '<path d="M3 7h9.7M17.3 7H21M3 17h3.7M11.3 17H21"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>'
  },

  /* --- Synchronisation --- */
  hors_ligne: {
    label: 'Hors connexion', group: 'sync',
    fill: '<path d="M7 18h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 11 3.6 3.6 0 0 0 7 18z"/>',
    stroke: '<path d="M7 18h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 11 3.6 3.6 0 0 0 7 18z"/><path d="M3 3l18 18"/>'
  },
  envoye: {
    label: 'Tout est envoyé', group: 'sync',
    fill: '<path d="M7 18h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 11 3.6 3.6 0 0 0 7 18z"/>',
    stroke: '<path d="M7 18h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 11 3.6 3.6 0 0 0 7 18z"/><path d="M9.3 13.3l2 2 3.6-3.8"/>'
  },

  /* --- Matériel apicole --- */
  cadre: {
    label: 'Cadre', group: 'materiel',
    fill: '<path d="M6 8h12v10H6z"/>',
    stroke: '<path d="M2 5h20"/><path d="M5 5v14h14V5"/><path d="M8 10.5h8M8 14h8"/>'
  },
  hausse: {
    label: 'Hausse', group: 'materiel',
    fill: '<path d="M3 7h18v5H3z"/>',
    stroke: '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M9.5 14h5"/>'
  },
  enfumoir: {
    label: 'Enfumoir', group: 'materiel',
    fill: '<path d="M5 11h10v8.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 19.5z"/>',
    stroke: '<path d="M5 11h10v8.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 19.5z"/><path d="M5 11l2.5-4h5L15 11"/><path d="M11 7l2-3.5"/><path d="M17 12.5h3v6h-3"/>'
  },
  reine: {
    label: 'Reine', group: 'materiel',
    fill: '<path d="M5.2 15.5h13.6L18 19H6z"/>',
    stroke: '<path d="M3 8l4 4.5L12 6l5 6.5L21 8l-2.6 11H5.6z"/><path d="M5.2 15.5h13.6"/>'
  },

  /* --- Interface (sans aplat) --- */
  ajouter:   { label: 'Ajouter',   group: 'ui', stroke: '<path d="M12 5v14M5 12h14"/>' },
  fermer:    { label: 'Fermer',    group: 'ui', stroke: '<path d="M6 6l12 12M18 6L6 18"/>' },
  retour:    { label: 'Retour',    group: 'ui', stroke: '<path d="M15 5l-7 7 7 7"/>' },
  chevron:   { label: 'Ouvrir',    group: 'ui', stroke: '<path d="M9 5l7 7-7 7"/>' },
  modifier:  { label: 'Modifier',  group: 'ui', stroke: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/>' },
  supprimer: { label: 'Supprimer', group: 'ui', stroke: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/>' },
  gps:       { label: 'Ma position', group: 'ui', stroke: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/><circle cx="12" cy="12" r="1.5"/>' },
  exporter:  { label: 'Exporter PDF', group: 'ui', stroke: '<path d="M12 3v12"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 17v3h16v-3"/>' }
};

/* Icônes d'interface sans équivalent duo (trait seul) */
const ICONS_TRAIT = {
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  nav: 'M3 11 22 2l-9 19-2-8Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  sync: 'M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  check: 'M20 6 9 17l-5-5',
};

/* Anciens noms → icônes Apicarnet */
const ICON_ALIASES = {
  home: 'cheptel', visits: 'carnet', pin: 'ruchers', plus: 'ajouter',
  alert: 'alerte', book: 'registre', file: 'documents', settings: 'parametres',
  trash: 'supprimer', edit: 'modifier', flask: 'traitement', sante: 'traitement',
  truck: 'transhumance', flower: 'calendrier', download: 'exporter', back: 'retour',
  shield: 'reglementation'
};

/* Aplat par défaut selon l'icône (sinon miel vif) */
const ICON_FILLS = {
  traitement: 'var(--int-traitement)', en_traitement: 'var(--etat-traitement)',
  nourrissement: 'var(--int-nourrissement)', division: 'var(--int-division)',
  transhumance: 'var(--int-transhumance)', inspection: 'var(--kraft)',
  ras: 'var(--etat-ras)', surveiller: 'var(--etat-surveiller)', alerte: 'var(--etat-alerte)',
  hors_ligne: 'var(--kraft)'
};

function icon(name, size = 20, extraClass = '') {
  const key = ICON_ALIASES[name] || name;
  const duo = ICONS_DUO[key];
  const open = `<svg class="ico ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">`;
  if (duo) {
    const fill = duo.fill
      ? `<g class="ico-fill" style="fill:var(--ico-fill, ${ICON_FILLS[key] || 'var(--miel-vif)'})" stroke="none">${duo.fill}</g>`
      : '';
    return open + fill + `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${duo.stroke}</g></svg>`;
  }
  const d = ICONS_TRAIT[name];
  if (!d) return '';
  return open + `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}

/* Marque Apicarnet : le « a » et son alvéole (icône d'appli) */
function brandMark(size = 40) {
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#F7F2E8"/><path d="M12.65 30.41Q10.99 30.41 9.71 29.75Q8.43 29.09 7.71 27.85Q7.0 26.61 7.0 24.76Q7.0 23.14 7.62 22.05Q8.24 20.96 9.44 20.28Q10.65 19.60 12.42 19.15Q14.19 18.70 16.45 18.36Q17.66 18.17 18.43 18.00Q19.20 17.83 19.58 17.43Q19.96 17.04 19.96 16.28Q19.96 15.23 19.20 14.48Q18.45 13.72 16.83 13.72Q15.74 13.72 14.81 14.10Q13.89 14.48 13.23 15.23Q12.57 15.98 12.27 17.15L7.48 15.68Q7.94 14.14 8.78 13.01Q9.63 11.88 10.84 11.10Q12.04 10.33 13.59 9.95Q15.13 9.58 16.94 9.58Q19.84 9.58 21.67 10.50Q23.50 11.42 24.40 13.36Q25.30 15.30 25.30 18.36V21.75Q25.30 23.07 25.36 24.42Q25.42 25.78 25.51 27.15Q25.61 28.53 25.72 29.88H20.93Q20.78 28.94 20.65 27.72Q20.52 26.49 20.44 25.25H19.77Q19.24 26.68 18.26 27.85Q17.28 29.02 15.87 29.72Q14.45 30.41 12.65 30.41ZM14.94 26.49Q15.66 26.49 16.39 26.23Q17.13 25.97 17.83 25.50Q18.52 25.02 19.11 24.31Q19.69 23.59 20.07 22.69L19.99 20.20Q19.65 20.35 19.28 20.47Q18.37 20.77 17.41 20.92Q16.45 21.07 15.51 21.26Q14.57 21.45 13.83 21.75Q13.10 22.05 12.67 22.56Q12.23 23.07 12.23 23.97Q12.23 25.14 12.99 25.82Q13.74 26.49 14.94 26.49Z" fill="#2B2118"/><polygon points="30.12,29.89 32.99,28.23 32.99,24.92 30.12,23.26 27.24,24.92 27.24,28.23" fill="#F2A916"/></svg>`;
}

/* Remplit tous les <span data-icon="…"> de la page */
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone) return;
    el.innerHTML = icon(el.dataset.icon, +(el.dataset.size || 22));
    el.dataset.iconDone = '1';
  });
  root.querySelectorAll('[data-brand]').forEach(el => {
    if (!el.dataset.iconDone) { el.innerHTML = brandMark(+(el.dataset.size || 40)); el.dataset.iconDone = '1'; }
  });
}

/* ---- Dates lisibles ---- */
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONGS  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function parseISODate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/* « 8 nov. » (l'année n'est ajoutée que si elle diffère de l'année en cours) */
function fmtDate(iso, withWeekday = false) {
  const d = parseISODate(iso);
  if (!d) return iso || '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${withWeekday ? JOURS_COURTS[d.getDay()] + ' ' : ''}${d.getDate()} ${MOIS_COURTS[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

/* « Novembre 2026 » */
function fmtMonth(iso) {
  const d = parseISODate(iso);
  if (!d) return '';
  const m = MOIS_LONGS[d.getMonth()];
  return m.charAt(0).toUpperCase() + m.slice(1) + ' ' + d.getFullYear();
}

/* Nombre de jours entre aujourd'hui et une date ISO (négatif = passé) */
function daysFromToday(iso) {
  const d = parseISODate(iso);
  if (!d) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

/* « Aujourd'hui », « Demain », « Dans 4 j », « En retard de 2 j » */
function fmtEcheance(iso) {
  const n = daysFromToday(iso);
  if (n === null) return { label: '—', tone: 'neutral' };
  if (n < 0)   return { label: `En retard de ${-n} j`, tone: 'late' };
  if (n === 0) return { label: "Aujourd'hui", tone: 'soon' };
  if (n === 1) return { label: 'Demain', tone: 'soon' };
  if (n <= 3)  return { label: `Dans ${n} j`, tone: 'soon' };
  return { label: `Dans ${n} j`, tone: 'neutral' };
}

/* Échappe le texte saisi par l'utilisateur avant de l'insérer en HTML */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => hydrateIcons());
