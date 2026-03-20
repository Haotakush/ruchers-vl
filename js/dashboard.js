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

/* ---- RAPPELS J+ ---- */
function updateRappels() {
  const today      = new Date().toISOString().split('T')[0];
  const card       = document.getElementById('card-rappels');
  const list       = document.getElementById('rappels-list');
  const btnNotif   = document.getElementById('btn-notif');
  if (!card || !list) return;

  // Collecter rappels actifs (non faits, toutes visites)
  const rappels = journalData
    .filter(v => v.rappel && !v.rappel.fait && v.rappel.echeance)
    .map(v => ({ ...v.rappel, rucher: v.rucher, visitDate: v.date, _docId: v._docId, _idx: journalData.indexOf(v) }))
    .sort((a, b) => a.echeance.localeCompare(b.echeance));

  if (!rappels.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  // Bouton notif si pas encore accordé
  if (btnNotif) {
    const perm = ('Notification' in window) ? Notification.permission : 'denied';
    btnNotif.style.display = (perm === 'default') ? 'inline-block' : 'none';
  }

  list.innerHTML = rappels.map(r => {
    const echeance = new Date(r.echeance + 'T00:00:00');
    const todayD   = new Date(today + 'T00:00:00');
    const diff     = Math.round((echeance - todayD) / 86400000);
    let statut, statutCls;
    if (diff < 0)      { statut = `En retard de ${Math.abs(diff)}j`; statutCls = 'rappel-retard'; }
    else if (diff === 0) { statut = "Aujourd'hui !"; statutCls = 'rappel-today'; }
    else if (diff <= 3)  { statut = `Dans ${diff}j`; statutCls = 'rappel-proche'; }
    else                 { statut = `Dans ${diff}j`; statutCls = 'rappel-ok'; }

    return `
      <div class="rappel-item ${statutCls}">
        <div class="rappel-info">
          <div class="rappel-texte">${r.texte}</div>
          <div class="rappel-meta">
            📍 ${getRucherLabel(r.rucher)} · 🗓 ${r.echeance}
          </div>
        </div>
        <div class="rappel-actions">
          <span class="rappel-statut">${statut}</span>
          <button class="rappel-cal-btn" onclick="exportRappelICS(${JSON.stringify(r).replace(/"/g, '&quot;')}, '${getRucherLabel(r.rucher).replace(/'/g, "\\'")}')" title="Ajouter au calendrier">📅</button>
          <button class="rappel-done-btn" onclick="marquerRappelFait(${r._idx})" title="Marquer fait">✓</button>
        </div>
      </div>`;
  }).join('');
}

function marquerRappelFait(idx) {
  const v = journalData[idx];
  if (!v?.rappel) return;
  v.rappel.fait = true;
  localStorage.setItem('journal', JSON.stringify(journalData));
  if (v._docId) updateJournalInFirestore(v._docId, v).catch(() => {});
  updateRappels();
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
  document.getElementById('s-ruches').textContent  = getTotalRuches();
  document.getElementById('s-visites').textContent = journalData.length;
  document.getElementById('s-traits').textContent  = sanitaireData.length;
  document.getElementById('s-sites').textContent   = RUCHERS.length;
}

function updateFreqVisites() {
  const lastVisitMap = buildLastVisitMap();
  const freqMap = {};
  RUCHERS.forEach(r => { freqMap[r.id] = 0; });
  journalData.forEach(v => {
    if (freqMap[v.rucher] !== undefined) freqMap[v.rucher]++;
  });
  const maxVisits = Math.max(...Object.values(freqMap), 1);
  // Tri par urgence : jamais visité → plus de jours → moins de jours
  const sorted = [...RUCHERS].sort((a, b) => {
    const dA = daysSince(lastVisitMap[a.id]);
    const dB = daysSince(lastVisitMap[b.id]);
    if (dA === null && dB === null) return 0;
    if (dA === null) return -1; // jamais visité passe devant
    if (dB === null) return 1;
    return dB - dA; // plus de jours = plus urgent = en premier
  });

  document.getElementById('visite-freq').innerHTML = sorted.map(r => {
    const nb    = freqMap[r.id] || 0;
    const last  = lastVisitMap[r.id];
    const days  = daysSince(last);
    const pct   = Math.round((nb / maxVisits) * 100);
    const barColor = nb === 0 ? '#EF5350' : nb === maxVisits ? '#4CAF50' : '#FFB300';
    const dot      = days === null ? '🔴' : days > 30 ? '🔴' : days > 14 ? '🟡' : '🟢';
    const lastLabel= last
      ? `Dernière visite il y a <strong>${days}j</strong> (${last})`
      : `<span style="color:var(--danger);font-weight:600;">Jamais visité</span>`;

    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="font-weight:600;font-size:0.85rem;">${dot} ${r.id} — ${r.lieu}</span>
          <span style="font-family:'DM Mono',monospace;font-size:0.78rem;font-weight:700;color:${barColor};">
            ${nb} visite${nb > 1 ? 's' : ''}
          </span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:7px;margin-bottom:4px;">
          <div style="background:${barColor};height:7px;border-radius:4px;width:${pct || 2}%;transition:width 0.5s;"></div>
        </div>
        <div style="font-size:0.72rem;color:var(--mid);">${lastLabel}</div>
      </div>`;
  }).join('') || `<div class="empty"><div class="empty-icon">📋</div><p>Aucune visite encore.</p></div>`;
}

function updateRecommandations() {
  const lastVisitMap = buildLastVisitMap();
  const nonVisites  = RUCHERS.filter(r => !lastVisitMap[r.id]);
  const urgents     = RUCHERS
    .filter(r => { const d = daysSince(lastVisitMap[r.id]); return d !== null && d > 30; })
    .sort((a, b) => daysSince(lastVisitMap[b.id]) - daysSince(lastVisitMap[a.id]));
  const attentions  = RUCHERS.filter(r => {
    const d = daysSince(lastVisitMap[r.id]);
    return d !== null && d > 14 && d <= 30;
  });

  let html = '';
  if (!journalData.length) {
    html = `<div style="font-size:0.84rem;color:var(--mid);padding:8px 0;">
      Commencez à enregistrer des visites pour obtenir des recommandations.
    </div>`;
  } else {
    if (nonVisites.length) {
      html += `
        <div class="reco-card reco-red">
          <div class="reco-icon">🔴</div>
          <div>
            <div class="reco-title">Jamais visités (${nonVisites.length})</div>
            <div class="reco-sites">${nonVisites.map(r => `<span class="reco-badge">${r.id}</span>`).join('')}</div>
            <div class="reco-tip">Ces ruchers n'ont aucune visite enregistrée. À prioriser.</div>
          </div>
        </div>`;
    }
    if (urgents.length) {
      html += `
        <div class="reco-card reco-orange">
          <div class="reco-icon">🟠</div>
          <div>
            <div class="reco-title">Visite urgente &gt; 30 jours (${urgents.length})</div>
            <div class="reco-sites">
              ${urgents.map(r => `
                <span class="reco-badge">${r.id}
                  <span style="opacity:0.7;font-size:0.65rem;">${daysSince(lastVisitMap[r.id])}j</span>
                </span>`).join('')}
            </div>
            <div class="reco-tip">Risque d'essaimage ou problème sanitaire.</div>
          </div>
        </div>`;
    }
    if (attentions.length) {
      html += `
        <div class="reco-card reco-yellow">
          <div class="reco-icon">🟡</div>
          <div>
            <div class="reco-title">À surveiller 14–30 jours (${attentions.length})</div>
            <div class="reco-sites">
              ${attentions.map(r => `
                <span class="reco-badge">${r.id}
                  <span style="opacity:0.7;font-size:0.65rem;">${daysSince(lastVisitMap[r.id])}j</span>
                </span>`).join('')}
            </div>
            <div class="reco-tip">Planifiez une visite dans la semaine.</div>
          </div>
        </div>`;
    }
    if (!nonVisites.length && !urgents.length && !attentions.length) {
      html = `
        <div class="reco-card reco-green">
          <div class="reco-icon">✅</div>
          <div>
            <div class="reco-title">Tous les ruchers sont à jour !</div>
            <div class="reco-tip">Toutes les visites ont été effectuées dans les 14 derniers jours.</div>
          </div>
        </div>`;
    }
  }
  document.getElementById('recommandations').innerHTML = html;
}

function updateTimeline() {
  const all = [
    ...journalData.map(v  => ({ date: v.date, text: `Visite ${v.rucher} — ${v.intervention}` })),
    ...sanitaireData.map(s => ({ date: s.date, text: `Sanitaire ${s.rucher} — ${s.type}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  document.getElementById('timeline').innerHTML = all.length
    ? all.map(e => `
        <div class="tl-item">
          <div class="tl-date">${e.date}</div>
          <div class="tl-text">${e.text}</div>
        </div>`).join('')
    : `<div class="empty"><div class="empty-icon">📭</div><p>Aucune activité encore.</p></div>`;
}

function updateZoneBars() {
  const zones = { Bas: 0, 'Mi-pentes': 0, Hauts: 0 };
  RUCHERS.forEach(r => { if (r.nb) zones[r.zone] = (zones[r.zone] || 0) + r.nb; });
  const total = Object.values(zones).reduce((a, b) => a + b, 0) || 1;

  document.getElementById('zone-bars').innerHTML = [
    { z:'Bas',       label:'🟢 Bas (0–400m)',       color:'#4CAF50' },
    { z:'Mi-pentes', label:'🟡 Mi-pentes (400–800m)', color:'#FFB300' },
    { z:'Hauts',     label:'🔵 Hauts (800m+)',        color:'#1E88E5' },
  ].map(({ z, label, color }) => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
        <span>${label}</span>
        <span style="font-family:'DM Mono',monospace;font-weight:600;">${zones[z] || 0} ruches</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:7px;">
        <div style="background:${color};height:7px;border-radius:4px;
          width:${Math.round((zones[z] || 0) / total * 100)}%;transition:width 0.5s;">
        </div>
      </div>
    </div>`).join('');
}

function drawChartVisites() {
  const canvas = document.getElementById('chart-visites');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = 140;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
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
    counts.push(journalData.filter(v => v.date.startsWith(ym)).length);
  }
  const maxVal = Math.max(...counts, 1);
  const padL = 30, padR = 10, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.floor(chartW / 6 * 0.6);
  const barGap = chartW / 6;

  ctx.strokeStyle = '#E8DCC8';
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
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, '#F5A623');
    grad.addColorStop(1, '#D4820A');
    ctx.fillStyle = grad;
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
      ctx.fillStyle  = '#2C1F0E';
      ctx.font       = `bold 10px DM Sans, sans-serif`;
      ctx.textAlign  = 'center';
      ctx.fillText(v, x + barW / 2, y - 4);
    }
    ctx.fillStyle  = '#A8916A';
    ctx.font       = `10px DM Sans, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}
