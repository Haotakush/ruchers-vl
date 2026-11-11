/* ============================================================
   icons.js — Icônes au trait (style Lucide) et dates lisibles
   Remplace les emojis de l'interface.
   Usage HTML : <span data-icon="home"></span>
   Usage JS   : icon('home', 20)
   ============================================================ */

const ICON_PATHS = {
  home:      'm3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2Z',
  visits:    'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14l2 2 4-4',
  shield:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM12 8v6M9 11h6',
  pin:       'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  menu:      'M4 6h16M4 12h16M4 18h16',
  plus:      'M12 5v14M5 12h14',
  check:     'M20 6 9 17l-5-5',
  sync:      'M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5',
  calendar:  'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  clock:     'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  alert:     'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  book:      'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2ZM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z',
  file:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6',
  settings:  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  help:      'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  trash:     'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  edit:      'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  chevron:   'm9 18 6-6-6-6',
  camera:    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  mic:       'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  nav:       'M3 11 22 2l-9 19-2-8Z',
  flask:     'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3',
  truck:     'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4A1 1 0 0 0 17.5 8H14M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  flower:    'M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5m4.5-4.5H15m-3 4.5V15M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  info:      'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  bell:      'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  share:     'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  download:  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  back:      'm15 18-6-6 6-6',
  user:      'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
};

function icon(name, size = 20, extraClass = '') {
  const d = ICON_PATHS[name];
  if (!d) return '';
  return `<svg class="ico ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;
}

/* Marque Ruchers VL : alvéole miel et abeille */
function brandMark(size = 40) {
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2.5 L35.2 11.2 L35.2 28.8 L20 37.5 L4.8 28.8 L4.8 11.2 Z" fill="#F2A916" stroke="#F2A916" stroke-width="3" stroke-linejoin="round"/><ellipse cx="14.5" cy="15" rx="5" ry="3.6" fill="#FFFFFF" transform="rotate(-25 14.5 15)"/><ellipse cx="25.5" cy="15" rx="5" ry="3.6" fill="#FFFFFF" transform="rotate(25 25.5 15)"/><ellipse cx="20" cy="22.5" rx="5.6" ry="7.6" fill="#2B2118"/><rect x="14.4" y="20.2" width="11.2" height="2.2" fill="#F2A916"/><rect x="14.6" y="24.6" width="10.8" height="2.2" fill="#F2A916"/></svg>`;
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
