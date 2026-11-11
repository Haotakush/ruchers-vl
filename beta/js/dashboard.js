/* ============================================================
   dashboard.js — Tableau de bord
   ============================================================ */

function updateDashboard() {
  updateStats();
  updateFreqVisites();
  updateRappels();
  updateRecommandations();
  updateTimeline();
  updateZoneBars();
  updateTopbar();
}

/* ---- RAPPELS J+ → bloc « À faire » ---- */
function updateRappels() {
  const card     = document.getElementById('card-rappels');
  const list     = document.getElementById('rappels-list');
  const btnNotif = document.getElementById('btn-notif');
  const countEl  = document.getElementById('rappels-count');
  if (!card || !list) return;

  // Collecter rappels actifs (non faits, toutes visites)
  const rappels = journalData
    .filter(v => v.rappel && !v.rappel.fait && v.rappel.echeance)
    .map(v => ({ ...v.rappel, rucher: v.rucher, visitDate: v.date, _docId: v._docId, _idx: journalData.indexOf(v) }))
    .sort((a, b) => a.echeance.localeCompare(b.echeance));

  if (!rappels.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  if (countEl) countEl.textContent = rappels.length;

  // Bouton notif si pas encore accordé
  if (btnNotif) {
    const perm = ('Notification' in window) ? Notification.permission : 'denied';
    btnNotif.style.display = (perm === 'default') ? 'inline-flex' : 'none';
  }

  list.innerHTML = rappels.map(r => {
    const e = fmtEcheance(r.echeance);
    const rucher = getRucherById(r.rucher);
    return `
      <div class="list-row">
        <div class="list-main">
          <div class="list-title">${esc(r.texte)}</div>
          <div class="list-meta">${esc(rucher ? rucher.lieu : r.rucher)} · ${fmtDate(r.echeance)}</div>
          <span class="pill pill-${e.tone}">${e.label}</span>
        </div>
        <button class="icon-btn" onclick="exportRappelByIdx(${r._idx})" title="Ajouter au calendrier" aria-label="Ajouter au calendrier">${icon('calendar', 18)}</button>
        <button class="done-btn" onclick="marquerRappelFait(${r._idx})" title="Marquer comme fait" aria-label="Marquer comme fait">${icon('check', 20)}</button>
      </div>`;
  }).join('');
}

function marquerRappelFait(idx) {
  const v = journalData[idx];
  if (!v?.rappel) return;
  const save = () => {
    localStorage.setItem('journal', JSON.stringify(journalData));
    if (v._docId) updateJournalInFirestore(v._docId, v).catch(() => {});
    updateRappels();
  };
  v.rappel.fait = true;
  save();
  toast(`Fait : ${v.rappel.texte}`, () => { v.rappel.fait = false; save(); });
}

function requestNotifPermission() {
  if (!('Notification' in window)) { toast('⚠️ Notifications non supportées'); return; }
  Notification.requestPermission().then(p => {
    if (p === 'granted') { toast('🔔 Notifications activées !'); updateRappels(); }
    else toast('⚠️ Permission refusée');
  });
}

function checkRappelsNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().split('T')[0];
  journalData
    .filter(v => v.rappel && !v.rappel.fait && v.rappel.echeance <= today)
    .forEach(v => {
      new Notification('🍯 Ruchers VL — Rappel', {
        body: `${v.rappel.texte} (${getRucherLabel(v.rucher)})`,
        icon: '/ruchers-vl/icons/icon-192.png',
      });
    });
}

function updateStats() {
  const nbRuches    = getTotalRuches();
  const nbRuchettes = getTotalRuchettes();
  document.getElementById('s-ruches').textContent    = nbRuches;
  document.getElementById('s-ruchettes').textContent = nbRuchettes;
  document.getElementById('s-total').textContent     = nbRuches + nbRuchettes;
  const bar = document.getElementById('herd-bar-ruches');
  if (bar) bar.style.width = (nbRuches + nbRuchettes ? (nbRuches / (nbRuches + nbRuchettes)) * 100 : 50) + '%';
  document.getElementById('s-visites').textContent = journalData.length;
  document.getElementById('s-traits').textContent  = sanitaireData.length;
  document.getElementById('s-sites').textContent   = RUCHERS.length;
}

/* ---- RUCHERS À VISITER (fréquence + recommandations fusionnées) ---- */
function updateFreqVisites() {
  const el = document.getElementById('visite-freq');
  if (!el) return;
  const lastVisitMap = buildLastVisitMap();
  // Tri par urgence : jamais visité → plus de jours → moins de jours
  const sorted = [...RUCHERS].sort((a, b) => {
    const dA = daysSince(lastVisitMap[a.id]);
    const dB = daysSince(lastVisitMap[b.id]);
    if (dA === null && dB === null) return 0;
    if (dA === null) return -1;
    if (dB === null) return 1;
    return dB - dA;
  });

  el.innerHTML = sorted.map(r => {
    const last = lastVisitMap[r.id];
    const days = daysSince(last);
    const tone = days === null || days > 30 ? 'late' : days > 14 ? 'soon' : 'ok';
    const pct  = days === null ? 100 : Math.min(100, Math.max(4, Math.round(days / 30 * 100)));
    const right = days === null ? 'Jamais visité' : days === 0 ? "Aujourd'hui" : `il y a ${days} j`;
    const meta = [r.nb ? `${r.nb} ruches` : '', r.cp ? String(r.cp).replace(/^\d{5}\s*/, '') : '', r.alt ? `${r.alt} m` : '']
      .filter(Boolean).join(' · ');
    return `
      <button class="list-row list-row-link" onclick="showRuchersView('ruchers')">
        <div class="list-main">
          <div class="list-line">
            <span class="list-title">${esc(r.lieu)}</span>
            <span class="days days-${tone}">${right}</span>
          </div>
          <div class="meter"><span class="meter-${tone}" style="width:${pct}%"></span></div>
          <div class="list-meta">${esc(meta)}</div>
        </div>
        <span class="list-chev">${icon('chevron', 18)}</span>
      </button>`;
  }).join('') || `<div class="list-empty">Ajoutez votre premier rucher pour suivre vos visites.</div>`;
}

/* Fusionné dans « Ruchers à visiter » (conservé pour les appels existants) */
function updateRecommandations() {
  const el = document.getElementById('recommandations');
  if (!el) return;
}

function updateTimeline() {
  const el = document.getElementById('timeline');
  if (!el) return;
  const lieu = id => { const r = getRucherById(id); return r ? r.lieu : id; };
  const all = [
    ...journalData.map(v => {
      // Les visites récentes stockent une liste `interventions` ; les anciennes un champ `intervention`
      const actions = (v.interventions && v.interventions.length)
        ? v.interventions.join(', ')
        : (v.intervention || '');
      const meta = [actions, v.force && v.force !== '—' ? `colonie ${v.force.toLowerCase()}` : ''].filter(Boolean).join(' · ');
      return { date: v.date || '', kind: 'visit', title: `Visite · ${lieu(v.rucher)}`, meta };
    }),
    ...sanitaireData.map(s => ({
      date: s.date || '', kind: 'sani',
      title: `${s.type || 'Traitement'} · ${lieu(s.rucher)}`,
      meta: [s.produit, s.duree].filter(x => x && x !== '—').join(' · '),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  el.innerHTML = all.length
    ? all.map(e => `
        <div class="list-row">
          <span class="row-ico ${e.kind === 'visit' ? 'ico-honey' : 'ico-blue'}">${icon(e.kind === 'visit' ? 'visits' : 'shield', 18)}</span>
          <div class="list-main">
            <div class="list-title">${esc(e.title)}</div>
            ${e.meta ? `<div class="list-meta">${esc(e.meta)}</div>` : ''}
          </div>
          <span class="row-when">${fmtDate(e.date)}</span>
        </div>`).join('')
    : `<div class="list-empty">Aucune activité pour l'instant.</div>`;
}

function updateZoneBars() {
  const el = document.getElementById('zone-bars');
  if (!el) return;
  const zones = { Bas: 0, 'Mi-pentes': 0, Hauts: 0 };
  RUCHERS.forEach(r => { if (r.nb) zones[r.zone] = (zones[r.zone] || 0) + r.nb; });
  const total = Object.values(zones).reduce((a, b) => a + b, 0);
  const totalEl = document.getElementById('zone-total');
  if (totalEl) totalEl.textContent = total ? `${total} ruches` : '';
  const defs = [
    { z: 'Bas',       label: 'Bas · 0–400 m',       color: '#3D7A4F' },
    { z: 'Mi-pentes', label: 'Mi-pentes · 400–800 m', color: '#C98A12' },
    { z: 'Hauts',     label: 'Hauts · 800 m et +',   color: '#2F6DB5' },
  ];
  if (!total) { el.innerHTML = `<div class="list-empty" style="padding:4px 0;">Aucune ruche enregistrée.</div>`; return; }
  el.innerHTML = `
    <div class="stack-bar">${defs.filter(d => zones[d.z]).map(d => `<span style="width:${zones[d.z] / total * 100}%;background:${d.color}"></span>`).join('')}</div>
    <div class="zone-legend">
      ${defs.map(d => zones[d.z]
        ? `<div class="zone-row"><span class="zone-key"><span class="zone-dot" style="background:${d.color}"></span>${d.label}</span><b>${zones[d.z]}</b></div>`
        : `<div class="zone-row zone-empty"><span class="zone-key"><span class="zone-dot zone-dot-empty"></span>${d.label}</span><span>aucune ruche</span></div>`).join('')}
    </div>`;
}

function drawChartVisites() {
  const canvas = document.getElementById('chart-visites');
  if (!canvas) return;
  // Redessine quand la largeur du graphique change (rotation, ouverture de l'onglet…)
  if (!canvas._resizeObserver && 'ResizeObserver' in window) {
    let lastW = 0;
    canvas._resizeObserver = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w && w !== lastW) { lastW = w; drawChartVisites(); }
    });
    canvas._resizeObserver.observe(canvas);
  }
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = 140;
  // L'appli est encore masquée pendant le chargement : largeur nulle, on attend
  // que le graphique soit visible (le ResizeObserver relancera le dessin).
  if (!W) return;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = '100%';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const now    = new Date();
  const labels = [];
  const counts = [];
  for (let i = 5; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(MONTHS[d.getMonth()]);
    counts.push(journalData.filter(v => (v.date || '').startsWith(ym)).length);
  }
  const maxVal = Math.max(...counts, 1);
  const padL = 30, padR = 10, padT = 20, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.floor(chartW / 6 * 0.6);
  const barGap = chartW / 6;

  ctx.strokeStyle = '#ECE8DF';
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = padT + chartH - (t * chartH);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
  });

  counts.forEach((v, i) => {
    const x  = padL + i * barGap + (barGap - barW) / 2;
    const bh = (v / maxVal) * chartH;
    const y  = padT + chartH - bh;
    const r  = 4;
    ctx.fillStyle = '#F2A916';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + bh);
    ctx.lineTo(x, y + bh);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
    if (v > 0) {
      ctx.fillStyle  = '#2B2118';
      ctx.font       = `bold 11px Lexend, sans-serif`;
      ctx.textAlign  = 'center';
      ctx.fillText(v, x + barW / 2, y - 4);
    }
    ctx.fillStyle  = '#6A5D4F';
    ctx.font       = `11px Lexend, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}
