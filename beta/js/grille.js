/* ============================================================
   grille.js — Grille des ruches (charte Apicarnet, lot 6)
   Une case par ruche du rucher : on tapote pour « poser un
   caillou » (à surveiller, nourrie, à traiter, RAS).
   La saisie est enregistrée comme une visite du carnet :
   - marquage      : résumé lisible (« À surveiller : ruches 4, 7 »)
   - ruchesMarques : détail par ruche { "4": "surveiller", … }
   ============================================================ */

const GRILLE_MARQUES = {
  surveiller: { label: 'À surveiller', icon: 'surveiller',    color: 'var(--etat-surveiller)' },
  nourrie:    { label: 'Nourrie',      icon: 'nourrissement', color: 'var(--int-nourrissement)' },
  traiter:    { label: 'À traiter',    icon: 'traitement',    color: 'var(--int-traitement)' },
  ras:        { label: 'RAS',          icon: 'ras',           color: 'var(--etat-ras)' },
};
const GRILLE_ORDRE = ['surveiller', 'nourrie', 'traiter', 'ras'];

let _grille = { marque: 'surveiller', marques: {}, nb: 0, down: false };

function openGrilleRuches() {
  const sel = document.getElementById('g-rucher');
  sel.innerHTML = '<option value="">Choisir un rucher</option>' +
    RUCHERS.map(r => `<option value="${esc(r.id)}">${esc(getRucherLabel(r.id))}</option>`).join('');
  if (RUCHERS.length === 1) sel.value = RUCHERS[0].id;
  document.getElementById('g-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('g-obs').value = '';
  _grille.marques = {};
  setGrilleMarque('surveiller');
  renderGrille();
  hydrateIcons(document.getElementById('modal-grille'));
  openModal('modal-grille');
}

function setGrilleMarque(m) {
  _grille.marque = m;
  document.querySelectorAll('#g-marques .g-mk').forEach(b => b.classList.toggle('on', b.dataset.m === m));
}

function onGrilleRucherChange() {
  _grille.marques = {};
  renderGrille();
}

function renderGrille() {
  const id = document.getElementById('g-rucher').value;
  const grid = document.getElementById('g-grid');
  const info = document.getElementById('g-info');
  const r = RUCHERS.find(x => x.id === id);
  const nbInput = document.getElementById('g-nb');
  if (!r) {
    grid.innerHTML = '';
    info.textContent = 'Choisissez le rucher pour afficher ses ruches.';
    nbInput.closest('.g-nb-row').hidden = true;
    return;
  }
  _grille.nb = parseInt(nbInput.dataset.rucher === id ? nbInput.value : r.nb) || 0;
  nbInput.dataset.rucher = id;
  nbInput.value = _grille.nb || '';
  nbInput.closest('.g-nb-row').hidden = false;
  if (!_grille.nb) {
    grid.innerHTML = '';
    info.textContent = 'Indiquez le nombre de ruches de ce rucher.';
    return;
  }
  info.textContent = 'Tapotez une ruche pour la marquer. Glissez le doigt pour en marquer plusieurs.';
  let html = '';
  for (let n = 1; n <= _grille.nb; n++) {
    const m = _grille.marques[n];
    const def = m && GRILLE_MARQUES[m];
    html += `<button type="button" class="g-cell${m ? ' set' : ''}" data-n="${n}"${def ? ` style="--c:${def.color}"` : ''} aria-label="Ruche ${n}${def ? ' : ' + def.label : ''}">${n}${def ? `<span class="g-badge">${icon(def.icon, 16)}</span>` : ''}</button>`;
  }
  grid.innerHTML = html;
  updateGrilleResume();
}

function onGrilleNbChange() {
  const v = parseInt(document.getElementById('g-nb').value) || 0;
  _grille.nb = Math.max(0, Math.min(400, v));
  Object.keys(_grille.marques).forEach(k => { if (+k > _grille.nb) delete _grille.marques[k]; });
  document.getElementById('g-nb').value = _grille.nb || '';
  renderGrille();
}

function _markCell(cell, toggle) {
  const n = +cell.dataset.n;
  const cur = _grille.marques[n];
  const m = (toggle && cur === _grille.marque) ? null : _grille.marque;
  if (m) _grille.marques[n] = m; else delete _grille.marques[n];
  const def = m && GRILLE_MARQUES[m];
  cell.classList.toggle('set', !!m);
  cell.style.setProperty('--c', def ? def.color : '');
  cell.setAttribute('aria-label', `Ruche ${n}${def ? ' : ' + def.label : ''}`);
  cell.innerHTML = `${n}${def ? `<span class="g-badge">${icon(def.icon, 16)}</span>` : ''}`;
  cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop');
  updateGrilleResume();
}

/* Tapotement et glissement sur plusieurs cases */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('g-grid');
  if (!grid) return;
  grid.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.g-cell');
    if (!cell) return;
    e.preventDefault();
    _grille.down = true;
    _grille.last = cell;
    _markCell(cell, true);
  });
  grid.addEventListener('pointermove', e => {
    if (!_grille.down) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest && el.closest('.g-cell');
    if (cell && cell !== _grille.last) { _grille.last = cell; _markCell(cell, false); }
  });
  const stop = () => { _grille.down = false; _grille.last = null; };
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
});

/* « Valider les autres ruches » : les ruches non marquées passent en RAS, en cascade */
function validerAutresRuches() {
  const cells = [...document.querySelectorAll('#g-grid .g-cell')].filter(c => !_grille.marques[+c.dataset.n]);
  if (!cells.length) return;
  const prev = _grille.marque;
  _grille.marque = 'ras';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = reduce ? 0 : 400 / cells.length;
  cells.forEach((c, i) => setTimeout(() => _markCell(c, false), i * step));
  setTimeout(() => { _grille.marque = prev; }, reduce ? 0 : 420);
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
}

function _grilleGroupes() {
  const g = {};
  Object.entries(_grille.marques).forEach(([n, m]) => { (g[m] = g[m] || []).push(+n); });
  Object.values(g).forEach(a => a.sort((x, y) => x - y));
  return g;
}

function _grilleResumeLignes() {
  const g = _grilleGroupes();
  return GRILLE_ORDRE.filter(m => g[m]).map(m => {
    const list = g[m];
    if (m === 'ras') return `RAS : ${list.length} ruche${list.length > 1 ? 's' : ''}`;
    return `${GRILLE_MARQUES[m].label} : ruche${list.length > 1 ? 's' : ''} ${list.join(', ')}`;
  });
}

function updateGrilleResume() {
  const el = document.getElementById('g-resume');
  const nbMarquees = Object.keys(_grille.marques).length;
  const lignes = _grilleResumeLignes();
  el.innerHTML = lignes.length
    ? `<b>${nbMarquees}/${_grille.nb} ruches marquées</b>` + lignes.map(l => `<span>${esc(l)}</span>`).join('')
    : '';
}

async function saveGrilleRuches() {
  const date = document.getElementById('g-date').value;
  const rucher = document.getElementById('g-rucher').value;
  if (!date || !rucher) { toast('Ces champs manquent : la date et le rucher.'); return; }
  if (!Object.keys(_grille.marques).length) { toast('Aucune ruche marquée pour l\'instant.'); return; }
  const r = RUCHERS.find(x => x.id === rucher) || {};
  const groupes = _grilleGroupes();
  const interventions = groupes.nourrie ? ['Nourrissement'] : [];
  const entry = {
    date,
    rucher,
    force: '—',
    marquage: _grilleResumeLignes(),
    nbRuches: _grille.nb || r.nb || 0,
    nbRuchettes: r.nbRuchettes || 0,
    interventions,
    intervention: interventions.length ? interventions.join(', ') : 'Visite contrôle',
    obs: document.getElementById('g-obs').value.trim(),
    duree: null,
    rappel: null,
    ruchesMarques: Object.fromEntries(Object.entries(_grille.marques).map(([n, m]) => [String(n), m])),
    saisie: 'grille',
  };
  const btn = document.getElementById('g-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }
  try {
    await addJournalToFirestore(entry);
    closeModal('modal-grille');
    renderJournal();
    updateDashboard();
    if (typeof drawChartVisites === 'function') drawChartVisites();
    toast('Visite enregistrée.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer la visite'; }
  }
}
