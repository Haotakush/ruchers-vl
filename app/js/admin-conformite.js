/* ============================================================
   admin-conformite.js — Module Admin & Conformité
   v1.3 — Score automatique, alertes, calendrier, registre
   ============================================================ */

let _conformiteData  = null;
let _mouvementsData  = [];
let _mouvDDPPSelect  = true; // état du toggle DDPP dans le formulaire

/* ============================================================
   POINT D'ENTRÉE
   ============================================================ */
async function initAdminConformite() {
  const el = document.getElementById('sub-admin');
  if (!el) return;

  el.innerHTML = `
    <div style="text-align:center;padding:40px 20px;">
      <div style="font-size:2rem;margin-bottom:10px;">⏳</div>
      <p style="color:var(--soft);font-size:0.85rem;">Chargement des données…</p>
    </div>`;

  try {
    await _loadConformiteData();
    _renderAdminDashboard();
  } catch (err) {
    console.error('[Admin] Erreur chargement:', err);
    el.innerHTML = `
      <div style="background:#3a1212;border-left:3px solid var(--danger);border-radius:0 10px 10px 0;
           padding:14px 16px;margin:16px 0;">
        <div style="color:#EF5350;font-weight:600;">⚠️ Erreur de chargement</div>
        <div style="color:var(--soft);font-size:0.8rem;margin-top:4px;">Vérifiez votre connexion et réessayez.</div>
      </div>`;
  }
}

/* ============================================================
   CHARGEMENT FIRESTORE
   ============================================================ */
async function _loadConformiteData() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  /* --- Conformité --- */
  const confRef = db.collection('users').doc(uid).collection('config').doc('conformite');
  const snap    = await confRef.get();

  if (!snap.exists) {
    const defaults = {
      annee:             new Date().getFullYear() - 1,
      coloniesDeclarees: 0,
      dateDeclaration:   null,
      napi:              '',
    };
    await confRef.set(defaults);
    _conformiteData = defaults;
  } else {
    _conformiteData = { ...snap.data() };
  }

  /* --- Mouvements (peut ne pas exister) --- */
  try {
    const mouvSnap = await db.collection('users').doc(uid)
      .collection('mouvements').orderBy('date', 'desc').limit(50).get();
    _mouvementsData = mouvSnap.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch (_) {
    _mouvementsData = [];
  }
}

/* ============================================================
   CALCUL DU SCORE
   ============================================================ */
function _calcScore() {
  let score = 0;
  const d   = {};

  /* 1. Déclaration annuelle (+40) */
  const currentYear = new Date().getFullYear();
  let declTs = _conformiteData?.dateDeclaration;
  let declDate = null;
  if (declTs?.toDate)  declDate = declTs.toDate();
  else if (declTs)     declDate = new Date(declTs);
  d.declaration = !!(declDate && declDate.getFullYear() === currentYear);
  if (d.declaration) score += 40;

  /* 2. Aucun mouvement DDPP non déclaré (+30) */
  const undeclared = _mouvementsData.filter(m => m.ddppDeclaree === false);
  d.ddpp             = undeclared.length === 0;
  d.undeclaredCount  = undeclared.length;
  if (d.ddpp) score += 30;

  /* 3. Registre à jour — dernier traitement < 30 j (+20) */
  const thirtyDays = 30 * 24 * 3600 * 1000;
  d.registre = sanitaireData.some(s => (Date.now() - new Date(s.date).getTime()) < thirtyDays);
  if (d.registre) score += 20;

  /* 4. Pas d'écart de cheptel (+10) */
  d.coloniesActuelles = RUCHERS.reduce((sum, r) => sum + (r.nb || 0), 0);
  d.coloniesDeclarees = _conformiteData?.coloniesDeclarees || 0;
  d.cheptel = d.coloniesDeclarees === 0 || d.coloniesActuelles <= d.coloniesDeclarees;
  if (d.cheptel) score += 10;

  return { score, d };
}

/* ============================================================
   RENDU PRINCIPAL
   ============================================================ */
function _renderAdminDashboard() {
  const el = document.getElementById('sub-admin');
  if (!el) return;

  const { score, d } = _calcScore();
  const lastSanitaire = sanitaireData[0]?.date || null;

  el.innerHTML = `
    <div style="padding-bottom:24px;">

      <!-- En-tête -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1.05rem;font-weight:700;color:var(--ink);">🛡 Admin &amp; Conformité</h2>
        <button onclick="openConformiteForm()"
          style="background:var(--honey);color:#fff;border:none;border-radius:12px;
                 padding:6px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;">
          ✏️ Déclarer
        </button>
      </div>

      ${_renderScoreRing(score)}
      ${_renderMetricCards(d, lastSanitaire)}
      ${_renderAlertes(d)}
      ${_renderMouvements()}
      ${_renderCalendrier(d.coloniesActuelles)}
      ${_renderRegistreConsolide()}
      ${_renderLiensOfficiels()}

    </div>`;
}

/* ============================================================
   COMPOSANTS DE RENDU
   ============================================================ */

/* --- Anneau SVG --- */
function _renderScoreRing(score) {
  const C     = 251.3;
  const dash  = Math.round(score / 100 * C);
  const color = score >= 80 ? '#4A7C59' : score >= 50 ? '#C4813A' : '#C0392B';
  const label = score >= 80 ? 'Conforme' : score >= 50 ? 'Partiel' : 'Non conforme';
  const napi  = _conformiteData?.napi ? `NAPI : ${_conformiteData.napi}` : '';

  return `
    <div class="card" style="text-align:center;padding:20px 16px 16px;margin-bottom:16px;">
      <svg viewBox="0 0 100 100" width="120" height="120"
           style="transform:rotate(-90deg);display:block;margin:0 auto 8px;">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a2a" stroke-width="10"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${dash} ${C}" stroke-linecap="round"/>
      </svg>
      <div style="font-size:2.2rem;font-weight:800;color:${color};">${score}<span style="font-size:1rem;font-weight:400;"> %</span></div>
      <div style="font-size:0.82rem;color:var(--soft);margin-top:2px;">${label}</div>
      ${napi ? `<div style="font-size:0.72rem;color:var(--soft);margin-top:6px;">${napi}</div>` : ''}
    </div>`;
}

/* --- 4 cartes métriques (2×2) --- */
function _renderMetricCards(d, lastSanitaire) {
  const anneeDecl  = _conformiteData?.annee || '—';
  const colDecl    = d.coloniesDeclarees || '—';
  const regStatus  = d.registre ? '✅ À jour' : '⚠️ En retard';
  const regColor   = d.registre ? '#4A7C59'  : '#C4813A';

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div class="card" style="padding:14px 12px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:var(--honey);">${colDecl}</div>
        <div style="font-size:0.7rem;color:var(--soft);margin-top:2px;">Colonies déclarées</div>
        <div style="font-size:0.65rem;color:var(--soft);">Décl. ${anneeDecl}</div>
      </div>
      <div class="card" style="padding:14px 12px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:var(--ink);">${d.coloniesActuelles}</div>
        <div style="font-size:0.7rem;color:var(--soft);margin-top:2px;">Colonies actuelles</div>
        <div style="font-size:0.65rem;color:var(--soft);">${RUCHERS.length} rucher${RUCHERS.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="padding:14px 12px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:var(--ink);">${RUCHERS.length}</div>
        <div style="font-size:0.7rem;color:var(--soft);margin-top:2px;">Ruchers actifs</div>
        <div style="font-size:0.65rem;color:var(--soft);">enregistrés</div>
      </div>
      <div class="card" style="padding:14px 12px;text-align:center;">
        <div style="font-size:0.9rem;font-weight:700;color:${regColor};">${regStatus}</div>
        <div style="font-size:0.7rem;color:var(--soft);margin-top:4px;">Registre</div>
        <div style="font-size:0.65rem;color:var(--soft);">${lastSanitaire ? lastSanitaire : 'Aucun traitement'}</div>
      </div>
    </div>`;
}

/* --- Alertes contextuelles --- */
function _renderAlertes(d) {
  const month   = new Date().getMonth() + 1; // 1-12
  const alertes = [];

  const STYLES = {
    danger:  { bg: '#3a1212', border: '#C0392B', text: '#EF5350' },
    warning: { bg: '#2a1f0a', border: '#C4813A', text: '#F5A623' },
    info:    { bg: '#0e1f30', border: '#42A5F5', text: '#90CAF9' },
    success: { bg: '#0d2016', border: '#4A7C59', text: '#81C784' },
  };

  /* DANGER : Déclaration manquante en période d'obligation */
  if ([9, 10, 11, 12].includes(month) && !d.declaration) {
    alertes.push({
      level: 'danger',
      icon:  '🚨',
      text:  'Déclaration annuelle obligatoire non effectuée',
      sub:   'Délai impératif : 31 décembre',
      url:   'https://mesdemarches.agriculture.gouv.fr',
    });
  }

  /* WARNING : Mouvements DDPP non déclarés */
  if (d.undeclaredCount > 0) {
    alertes.push({
      level: 'warning',
      icon:  '⚠️',
      text:  `${d.undeclaredCount} transhumance${d.undeclaredCount > 1 ? 's' : ''} non déclarée${d.undeclaredCount > 1 ? 's' : ''} à la DDPP`,
      sub:   'Déclaration obligatoire avant tout déplacement interdépartemental',
      url:   'https://agriculture.gouv.fr/ddpp',
    });
  }

  /* WARNING : Écart de cheptel */
  if (!d.cheptel && d.coloniesDeclarees > 0) {
    alertes.push({
      level: 'warning',
      icon:  '📊',
      text:  `Écart de cheptel : ${d.coloniesActuelles} actuelles vs ${d.coloniesDeclarees} déclarées`,
      sub:   'À régulariser lors de la prochaine déclaration annuelle',
      url:   'https://mesdemarches.agriculture.gouv.fr',
    });
  }

  /* SUCCESS : Registre à jour */
  if (d.registre) {
    alertes.push({
      level: 'success',
      icon:  '✅',
      text:  "Registre d'élevage à jour",
      sub:   'Un traitement a été saisi dans les 30 derniers jours',
      url:   null,
    });
  }

  /* INFO : Pas encore en période de déclaration */
  if (![9, 10, 11, 12].includes(month) && !d.declaration) {
    alertes.push({
      level: 'info',
      icon:  '📅',
      text:  'Déclaration annuelle — ouverture le 1er septembre',
      sub:   'En dehors de la période obligatoire',
      url:   null,
    });
  }

  if (!alertes.length) return '';

  return `
    <div style="margin-bottom:16px;">
      <div style="font-size:0.72rem;color:var(--soft);margin-bottom:8px;
           font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Alertes</div>
      ${alertes.map(a => {
        const s = STYLES[a.level];
        return `
          <div onclick="${a.url ? `window.open('${a.url}','_blank')` : 'void(0)'}"
            style="background:${s.bg};border-left:3px solid ${s.border};
                   border-radius:0 10px 10px 0;padding:10px 12px;margin-bottom:8px;
                   ${a.url ? 'cursor:pointer;' : ''}">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:1rem;flex-shrink:0;">${a.icon}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.82rem;font-weight:600;color:${s.text};">${a.text}</div>
                <div style="font-size:0.72rem;color:var(--soft);margin-top:2px;">${a.sub}</div>
              </div>
              ${a.url ? `<span style="color:${s.text};font-size:0.85rem;flex-shrink:0;margin-top:1px;">↗</span>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

/* --- Section mouvements DDPP --- */
function _renderMouvements() {
  return `
    <div class="card" style="padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:0.88rem;font-weight:700;color:var(--ink);">🚛 Mouvements & DDPP</div>
        <button onclick="openAddMouvement()"
          style="background:var(--honey);color:#fff;border:none;border-radius:8px;
                 padding:4px 12px;font-size:0.72rem;font-weight:600;cursor:pointer;">+ Nouveau</button>
      </div>
      ${_mouvementsData.length === 0
        ? `<div style="text-align:center;color:var(--soft);font-size:0.8rem;padding:12px 0;">
             Aucun mouvement enregistré
           </div>`
        : _mouvementsData.slice(0, 6).map(m => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
               border-bottom:1px solid #2a2a2a;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.8rem;color:var(--ink);white-space:nowrap;
                   overflow:hidden;text-overflow:ellipsis;">
                ${m.date} — ${getRucherLabel(m.rucher)}
              </div>
              <div style="font-size:0.7rem;color:var(--soft);">
                Dest : ${m.deptDestination || '—'}
              </div>
            </div>
            ${m.ddppDeclaree === false
              ? `<button onclick="markDDPPDeclare('${m._docId}')"
                   style="background:#4A7C59;color:#fff;border:none;border-radius:8px;
                          padding:5px 10px;font-size:0.7rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                   ✓ Marquer déclaré
                 </button>`
              : `<span style="font-size:0.72rem;color:#81C784;font-weight:600;flex-shrink:0;">✅ Déclaré</span>`
            }
          </div>`).join('')
      }
    </div>`;
}

/* --- Calendrier des échéances --- */
function _renderCalendrier(coloniesActuelles) {
  const now         = new Date();
  const today       = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  const echeances = [
    {
      date:  `${currentYear}-09-01`,
      icon:  '📬',
      label: 'Ouverture déclarations',
      sub:   '1er septembre — début de la période obligatoire',
      done:  now.getMonth() >= 8,
      url:   null,
    },
    {
      date:  `${currentYear}-12-31`,
      icon:  '📋',
      label: 'Déclaration annuelle',
      sub:   '31 décembre — via MesDémarches Agriculture',
      done:  !!(_conformiteData?.dateDeclaration),
      url:   'https://mesdemarches.agriculture.gouv.fr',
    },
    {
      date:  `${currentYear + 1}-01-20`,
      icon:  '💶',
      label: 'Subvention FranceAgriMer',
      sub:   coloniesActuelles >= 50
               ? `20 janvier — Éligible (${coloniesActuelles} colonies ≥ 50)`
               : `20 janvier — Non éligible (${coloniesActuelles} colonies < 50)`,
      done:  false,
      url:   coloniesActuelles >= 50 ? 'https://www.franceagrimer.fr' : null,
      faded: coloniesActuelles < 50,
    },
  ].sort((a, b) => a.date.localeCompare(b.date));

  return `
    <div class="card" style="padding:16px;margin-bottom:16px;">
      <div style="font-size:0.88rem;font-weight:700;color:var(--ink);margin-bottom:14px;">
        📅 Échéances réglementaires
      </div>
      <div style="position:relative;padding-left:28px;">
        <div style="position:absolute;left:8px;top:6px;bottom:6px;width:2px;
             background:#2a2a2a;border-radius:2px;"></div>
        ${echeances.map(e => {
          const isPast  = e.date < today;
          const dotCol  = e.done ? '#4A7C59' : isPast ? '#C0392B' : 'var(--honey)';
          const click   = e.url ? `onclick="window.open('${e.url}','_blank')"` : '';
          const opacity = e.faded ? 'opacity:0.45;' : '';
          return `
            <div ${click}
              style="position:relative;margin-bottom:16px;${e.url ? 'cursor:pointer;' : ''}${opacity}">
              <div style="position:absolute;left:-24px;top:4px;width:10px;height:10px;
                background:${dotCol};border-radius:50%;border:2px solid #1a1a1a;"></div>
              <div style="font-size:0.82rem;font-weight:600;color:${e.done ? '#81C784' : 'var(--ink)'};">
                ${e.icon} ${e.label}
                ${e.done ? '<span style="font-size:0.7rem;color:#81C784;"> ✓</span>' : ''}
              </div>
              <div style="font-size:0.72rem;color:var(--soft);margin-top:2px;">${e.sub}</div>
              ${e.url && !e.faded
                ? `<div style="font-size:0.7rem;color:var(--honey);margin-top:3px;">Ouvrir ↗</div>`
                : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* --- Registre d'élevage consolidé (10 dernières entrées) --- */
function _renderRegistreConsolide() {
  const entries = [];

  sanitaireData.forEach(s => entries.push({
    date:  s.date,
    icon:  '💊',
    label: `${s.produit && s.produit !== '—' ? s.produit : s.type || 'Traitement'} — ${getRucherLabel(s.rucher)}`,
    type:  'traitement',
    color: '#81C784',
  }));

  journalData.slice(0, 30).forEach(v => entries.push({
    date:  v.date,
    icon:  '📋',
    label: `Visite — ${getRucherLabel(v.rucher)}`,
    type:  'visite',
    color: 'var(--honey)',
  }));

  _mouvementsData.forEach(m => entries.push({
    date:  m.date,
    icon:  '🚛',
    label: `Mouvement — ${getRucherLabel(m.rucher)}${m.ddppDeclaree === false ? ' ⚠️' : ''}`,
    type:  'mouvement',
    color: m.ddppDeclaree === false ? '#F5A623' : '#90CAF9',
  }));

  entries.sort((a, b) => b.date.localeCompare(a.date));
  const last10 = entries.slice(0, 10);

  return `
    <div class="card" style="padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:0.88rem;font-weight:700;color:var(--ink);">📖 Registre d'élevage</div>
        <button onclick="alert('Export PDF — à implémenter')"
          style="background:#2a2a2a;color:var(--soft);border:none;border-radius:8px;
                 padding:4px 10px;font-size:0.72rem;cursor:pointer;">📄 PDF</button>
      </div>
      ${last10.length === 0
        ? `<div style="text-align:center;color:var(--soft);font-size:0.8rem;padding:12px 0;">
             Aucune entrée dans le registre
           </div>`
        : last10.map(e => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
               border-bottom:1px solid #2a2a2a;">
            <span style="font-size:1rem;flex-shrink:0;">${e.icon}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.8rem;color:${e.color};
                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.label}</div>
              <div style="font-size:0.7rem;color:var(--soft);">${e.date}</div>
            </div>
            <span style="font-size:0.65rem;background:#2a2a2a;color:var(--soft);
              padding:2px 7px;border-radius:6px;white-space:nowrap;flex-shrink:0;">${e.type}</span>
          </div>`).join('')
      }
    </div>`;
}

/* --- Liens officiels --- */
function _renderLiensOfficiels() {
  const links = [
    { icon: '📋', label: 'Déclaration annuelle',    sub: 'mesdemarches.agriculture.gouv.fr', url: 'https://mesdemarches.agriculture.gouv.fr' },
    { icon: '🏛',  label: 'Trouver ma DDPP',        sub: 'agriculture.gouv.fr/ddpp',         url: 'https://agriculture.gouv.fr/ddpp' },
    { icon: '💶', label: 'Subventions FranceAgriMer', sub: 'franceagrimer.fr',               url: 'https://www.franceagrimer.fr' },
    { icon: '📚', label: 'Réglementation UNAF',     sub: 'unaf-apiculture.info',              url: 'https://www.unaf-apiculture.info/nos-services/informations-reglementaires/' },
  ];

  return `
    <div class="card" style="padding:16px;margin-bottom:8px;">
      <div style="font-size:0.88rem;font-weight:700;color:var(--ink);margin-bottom:12px;">🔗 Liens officiels</div>
      ${links.map((l, i) => `
        <a href="${l.url}" target="_blank" rel="noopener noreferrer"
          style="display:flex;align-items:center;gap:12px;padding:11px 0;
                 ${i < links.length - 1 ? 'border-bottom:1px solid #2a2a2a;' : ''}
                 text-decoration:none;">
          <span style="font-size:1.2rem;flex-shrink:0;">${l.icon}</span>
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--ink);">${l.label}</div>
            <div style="font-size:0.7rem;color:var(--honey);margin-top:1px;">${l.sub} ↗</div>
          </div>
        </a>`).join('')}
    </div>`;
}

/* ============================================================
   FORMULAIRE — MISE À JOUR DÉCLARATION
   ============================================================ */
function openConformiteForm() {
  const napi    = _conformiteData?.napi              || '';
  const colDecl = _conformiteData?.coloniesDeclarees || '';
  const annee   = _conformiteData?.annee             || new Date().getFullYear() - 1;
  const yr      = new Date().getFullYear();

  const overlay = document.createElement('div');
  overlay.id    = 'conformite-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.75);z-index:600;
    display:flex;align-items:flex-end;justify-content:center;`;
  overlay.innerHTML = `
    <div style="background:#1c1c1c;border-radius:20px 20px 0 0;width:100%;max-width:480px;
                padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom));">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="margin:0;font-size:1rem;color:var(--ink);">✏️ Déclaration annuelle</h3>
        <button onclick="document.getElementById('conformite-overlay').remove()"
          style="background:none;border:none;color:var(--soft);font-size:1.3rem;cursor:pointer;
                 line-height:1;padding:2px 6px;">✕</button>
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <label class="form-label">N° NAPI</label>
        <input id="conf-napi" class="form-input" value="${napi}" placeholder="Ex : A5100000"
          style="text-transform:uppercase;">
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <label class="form-label">Colonies déclarées</label>
        <input id="conf-colonies" type="number" class="form-input" value="${colDecl}"
          placeholder="24" min="0" inputmode="numeric">
      </div>

      <div class="form-row" style="margin-bottom:22px;">
        <label class="form-label">Année de déclaration</label>
        <select id="conf-annee" class="form-input">
          <option value="${yr - 1}" ${annee === yr - 1 ? 'selected' : ''}>${yr - 1}</option>
          <option value="${yr}"     ${annee === yr     ? 'selected' : ''}>${yr}</option>
        </select>
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('conformite-overlay').remove()"
          style="flex:1;padding:13px;background:#2a2a2a;border:none;border-radius:12px;
                 color:var(--soft);font-weight:600;cursor:pointer;">Annuler</button>
        <button onclick="saveConformiteData()"
          style="flex:2;padding:13px;background:var(--honey);border:none;border-radius:12px;
                 color:#fff;font-weight:600;cursor:pointer;">✓ Enregistrer</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function saveConformiteData() {
  const napi             = (document.getElementById('conf-napi').value || '').trim().toUpperCase();
  const coloniesDeclarees = parseInt(document.getElementById('conf-colonies').value) || 0;
  const annee            = parseInt(document.getElementById('conf-annee').value);

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const data = {
    napi,
    coloniesDeclarees,
    annee,
    dateDeclaration: firebase.firestore.Timestamp.now(),
  };

  await db.collection('users').doc(uid).collection('config').doc('conformite').set(data);
  _conformiteData = data;

  document.getElementById('conformite-overlay')?.remove();
  if (typeof toast === 'function') toast('✅ Déclaration enregistrée');
  _renderAdminDashboard();
}

/* ============================================================
   FORMULAIRE — NOUVEAU MOUVEMENT
   ============================================================ */
function openAddMouvement() {
  _mouvDDPPSelect = true;
  const rucherOpts = RUCHERS.map(r =>
    `<option value="${r.id}">${getRucherLabel(r.id)}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id    = 'mouvement-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.75);z-index:600;
    display:flex;align-items:flex-end;justify-content:center;`;
  overlay.innerHTML = `
    <div style="background:#1c1c1c;border-radius:20px 20px 0 0;width:100%;max-width:480px;
                padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom));">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="margin:0;font-size:1rem;color:var(--ink);">🚛 Nouveau mouvement</h3>
        <button onclick="document.getElementById('mouvement-overlay').remove()"
          style="background:none;border:none;color:var(--soft);font-size:1.3rem;cursor:pointer;
                 line-height:1;padding:2px 6px;">✕</button>
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <label class="form-label">Date</label>
        <input id="mouv-date" type="date" class="form-input"
          value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <label class="form-label">Rucher concerné</label>
        <select id="mouv-rucher" class="form-input">
          <option value="">— Sélectionner —</option>
          ${rucherOpts}
        </select>
      </div>

      <div class="form-row" style="margin-bottom:14px;">
        <label class="form-label">Département destination</label>
        <input id="mouv-dept" class="form-input" placeholder="ex : 74, 13, 976…" inputmode="text">
      </div>

      <div class="form-row" style="margin-bottom:22px;">
        <label class="form-label">DDPP déclarée</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="type-chip active" id="mouv-ddpp-oui"
            onclick="selectMouvDDPP(true)"
            style="padding:6px 16px;">✅ Oui</button>
          <button class="type-chip" id="mouv-ddpp-non"
            onclick="selectMouvDDPP(false)"
            style="padding:6px 16px;">❌ Non</button>
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('mouvement-overlay').remove()"
          style="flex:1;padding:13px;background:#2a2a2a;border:none;border-radius:12px;
                 color:var(--soft);font-weight:600;cursor:pointer;">Annuler</button>
        <button onclick="saveAdminMouvement()"
          style="flex:2;padding:13px;background:var(--honey);border:none;border-radius:12px;
                 color:#fff;font-weight:600;cursor:pointer;">✓ Enregistrer</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function selectMouvDDPP(val) {
  _mouvDDPPSelect = val;
  const btnOui = document.getElementById('mouv-ddpp-oui');
  const btnNon = document.getElementById('mouv-ddpp-non');
  if (btnOui) btnOui.classList.toggle('active', val === true);
  if (btnNon) btnNon.classList.toggle('active', val === false);
}

async function saveAdminMouvement() {
  const date           = document.getElementById('mouv-date')?.value;
  const rucher         = document.getElementById('mouv-rucher')?.value;
  const deptDestination = (document.getElementById('mouv-dept')?.value || '').trim();

  if (!date || !rucher) {
    if (typeof toast === 'function') toast('⚠️ Date et rucher obligatoires');
    return;
  }

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const entry = { date, rucher, deptDestination, ddppDeclaree: _mouvDDPPSelect };
  const docRef = await db.collection('users').doc(uid).collection('mouvements').add(entry);
  entry._docId = docRef.id;
  _mouvementsData.unshift(entry);

  document.getElementById('mouvement-overlay')?.remove();
  if (typeof toast === 'function') toast('✅ Mouvement enregistré');
  _renderAdminDashboard();
}

/* ============================================================
   MARQUER MOUVEMENT DDPP DÉCLARÉ
   ============================================================ */
async function markDDPPDeclare(docId) {
  const uid = auth.currentUser?.uid;
  if (!uid || !docId) return;

  try {
    await db.collection('users').doc(uid).collection('mouvements')
      .doc(docId).update({ ddppDeclaree: true });

    const m = _mouvementsData.find(m => m._docId === docId);
    if (m) m.ddppDeclaree = true;

    if (typeof toast === 'function') toast('✅ Mouvement marqué déclaré DDPP');
    _renderAdminDashboard();
  } catch (err) {
    console.error('[Admin] Erreur markDDPP:', err);
    if (typeof toast === 'function') toast('⚠️ Erreur, réessayez');
  }
}
