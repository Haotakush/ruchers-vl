/* ============================================================
   registre.js — Registre d'élevage apicole
   Conforme à l'arrêté du 5 juin 2000 (art. 3)
   Contenu obligatoire :
     1. Identification apiculteur / exploitation
     2. Inventaire des ruchers (+ coordonnées GPS)
     3. Comptes-rendus des visites
     4. Registre Sanitaire
     5. Mouvements de colonies
   ============================================================ */

function renderRegistre() {
  const el = document.getElementById('registre-content');
  if (!el) return;
  el.innerHTML = [
    buildSection1_Identification(),
    buildSection2_Ruchers(),
    buildSection3_Visites(),
    buildSection4_Traitements(),
    buildSection5_Mouvements(),
    buildRegistreFooter(),
  ].join('');
}

/* ---- 1. Identification ---- */
function buildSection1_Identification() {
  const rows = [
    ['Nom / Raison sociale',  PARAMS.nom     || '—'],
    ['N° NAPI',               PARAMS.napi    || '—'],
    ['N° SIRET',              PARAMS.siret   || '—'],
    ['Adresse',               PARAMS.adresse || '—'],
    ['Email',                 PARAMS.email   || '—'],
    ['Date de déclaration',   PARAMS.dateDecl || '—'],
    ['Référence déclaration', PARAMS.refDecl  || '—'],
    ['Colonies déclarées',    PARAMS.colonies ? `<strong style="color:var(--honey);">${PARAMS.colonies}</strong>` : '—'],
  ].map(([label, val]) =>
    `<tr><td style="font-weight:700;width:45%">${label}</td><td>${val}</td></tr>`
  ).join('');

  return `<div class="registre-section">
    <div class="registre-section-title">1. Identification de l'apiculteur et de l'exploitation</div>
    <table class="registre-table">${rows}</table>
  </div>`;
}

/* ---- 2. Inventaire des ruchers (+ GPS) ---- */
function buildSection2_Ruchers() {
  if (!RUCHERS.length) {
    return `<div class="registre-section">
      <div class="registre-section-title">2. Inventaire des ruchers</div>
      <div class="empty"><div class="empty-icon">📍</div><p>Aucun rucher enregistré.</p></div>
    </div>`;
  }

  const rows = RUCHERS.map(r => {
    const gps = (r.lat && r.lng)
      ? `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`
      : '—';
    const total = (r.nb || 0) + (r.nbRuchettes || 0);
    return `<tr>
      <td style="font-family:'DM Mono',monospace;font-weight:700;">${r.id}</td>
      <td>${r.lieu}</td>
      <td style="font-family:'DM Mono',monospace;font-size:0.8rem;">${gps}</td>
      <td style="font-weight:700;color:var(--honey);text-align:center;">${r.nb !== null && r.nb !== undefined ? r.nb : '—'}</td>
      <td style="text-align:center;color:#E65100;">${r.nbRuchettes || '—'}</td>
      <td style="font-weight:700;text-align:center;">${total || '—'}</td>
    </tr>`;
  }).join('');

  const totalRuches = RUCHERS.reduce((s, r) => s + (r.nb || 0) + (r.nbRuchettes || 0), 0);

  return `<div class="registre-section">
    <div class="registre-section-title">2. Inventaire des ruchers</div>
    <table class="registre-table">
      <thead><tr>
        <th>ID</th><th>Lieu-dit</th><th>Coordonnées GPS</th>
        <th style="text-align:center;">Ruches</th>
        <th style="text-align:center;">Ruchettes</th>
        <th style="text-align:center;">Total</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr style="background:var(--honey-pale);">
          <td colspan="5" style="font-weight:700;text-align:right;">TOTAL COLONIES</td>
          <td style="font-weight:700;color:var(--honey);font-size:1rem;text-align:center;">${totalRuches}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

/* ---- 3. Comptes-rendus des visites ---- */
function buildSection3_Visites() {
  if (!journalData.length) {
    return `<div class="registre-section">
      <div class="registre-section-title">3. Comptes-rendus des visites (0 entrées)</div>
      <div class="empty"><div class="empty-icon">📋</div><p>Aucune visite enregistrée.</p></div>
    </div>`;
  }

  const sorted = [...journalData].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map(v => {
    const rucherLabel = getRucherLabel ? getRucherLabel(v.rucher) : v.rucher;
    const intv = v.interventions?.length
      ? v.interventions.join(', ')
      : (v.intervention || 'Visite contrôle');
    return `<tr>
      <td style="font-family:'DM Mono',monospace;white-space:nowrap;">${v.date}</td>
      <td style="font-weight:600;">${rucherLabel}</td>
      <td style="font-size:0.75rem;">${intv}</td>
      <td style="font-size:0.75rem;">${v.obs || '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="registre-section">
    <div class="registre-section-title">3. Comptes-rendus des visites (${journalData.length} entrées)</div>
    <table class="registre-table">
      <thead><tr>
        <th>Date</th><th>Rucher</th><th>Interventions</th><th>Observations</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* ---- 4. Registre Sanitaire ---- */
function buildSection4_Traitements() {
  if (!sanitaireData.length) {
    return `<div class="registre-section">
      <div class="registre-section-title">4. Registre Sanitaire (0 entrées)</div>
      <div class="empty"><div class="empty-icon">💊</div><p>Aucun traitement enregistré.</p></div>
    </div>`;
  }

  const sorted = [...sanitaireData].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map(s => {
    const rucherLabel = getRucherLabel ? getRucherLabel(s.rucher) : s.rucher;
    return `<tr>
      <td style="font-family:'DM Mono',monospace;white-space:nowrap;">${s.date}</td>
      <td style="font-weight:600;">${rucherLabel}</td>
      <td>${s.type || '—'}</td>
      <td style="font-weight:600;">${s.produit || '—'}</td>
      <td>${s.dose || '—'}</td>
      <td>${s.duree || '—'}</td>
      <td><span class="badge ${s.gdsa === 'Oui' ? 'badge-sani' : 'badge-couvain'}">${s.gdsa || '—'}</span></td>
      <td style="font-size:0.75rem;">${s.motif || '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="registre-section">
    <div class="registre-section-title">4. Registre Sanitaire (${sanitaireData.length} entrées)</div>
    <table class="registre-table">
      <thead><tr>
        <th>Date</th><th>Rucher</th><th>Type</th><th>Produit (AMM)</th>
        <th>Dose</th><th>Durée</th><th>GDSA</th><th>Réf. ordonnance / Motif</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:0.72rem;color:var(--soft);margin-top:8px;font-style:italic;">
      * Conserver les ordonnances et documents vétérinaires avec ce registre (obligation légale).
    </p>
  </div>`;
}

/* ---- 5. Mouvements de colonies ---- */
function buildSection5_Mouvements() {
  if (typeof mouvementsData === 'undefined' || !mouvementsData.length) {
    return `<div class="registre-section">
      <div class="registre-section-title">5. Mouvements de colonies (0 entrées)</div>
      <div class="empty"><div class="empty-icon">🚛</div><p>Aucun mouvement enregistré.</p></div>
    </div>`;
  }

  const sorted = [...mouvementsData].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map(m => {
    const rucherLabel = getRucherLabel ? getRucherLabel(m.origine) : m.origine;
    const nb = m.nbColonies ? `<strong style="color:var(--honey);">${m.nbColonies}</strong>` : '—';
    return `<tr>
      <td style="font-family:'DM Mono',monospace;white-space:nowrap;">${m.date}</td>
      <td style="font-weight:600;">${rucherLabel}</td>
      <td>${m.destination || '—'}</td>
      <td style="text-align:center;">${nb}</td>
      <td>${m.motif || '—'}</td>
      <td style="font-size:0.75rem;">${m.obs || '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="registre-section">
    <div class="registre-section-title">5. Mouvements de colonies (${mouvementsData.length} entrées)</div>
    <table class="registre-table">
      <thead><tr>
        <th>Date</th><th>Rucher d'origine</th><th>Lieu de destination</th>
        <th style="text-align:center;">Nb colonies</th><th>Motif</th><th>Observations</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:0.72rem;color:var(--soft);margin-top:8px;font-style:italic;">
      * Conforme à l'arrêté du 5 juin 2000 — signaler tout mouvement inter-départemental à la DDPP.
    </p>
  </div>`;
}

/* ---- Pied de page ---- */
function buildRegistreFooter() {
  return `<div style="text-align:center;font-size:0.7rem;color:var(--soft);
    padding:16px 0;border-top:1px solid var(--border);margin-top:10px;">
    Registre tenu conformément à l'arrêté du 5 juin 2000 (art. 3) —
    À conserver 5 ans avec le récépissé de déclaration annuelle —
    Généré le ${new Date().toLocaleDateString('fr-FR')}
  </div>`;
}

/* ---- Export PDF ---- */
function exportPDF() {
  renderRegistre();

  const header = `
    <div class="header-block">
      <h1>📖 Registre d'Élevage Apicole</h1>
      <p><strong style="color:#F5A623;">${PARAMS.nom||'—'}</strong>
         · NAPI ${PARAMS.napi||'—'}
         · SIRET ${PARAMS.siret||'—'}</p>
      <p>${PARAMS.adresse||'—'}</p>
      <p>Déclaration du ${PARAMS.dateDecl||'—'} · Réf. ${PARAMS.refDecl||'—'} · ${PARAMS.colonies||'—'} colonies</p>
      <p style="margin-top:8px;font-size:10px;color:#6B5A3E;">
        Généré le ${new Date().toLocaleDateString('fr-FR')} à
        ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
      </p>
    </div>`;

  const printContent = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8">
<title>Registre Élevage — ${PARAMS.nom||'Apiculteur'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,sans-serif;font-size:11px;color:#2C1F0E;background:#FAF6EE;}
.pdf-topbar{position:sticky;top:0;background:#1A1208;color:#F5A623;padding:14px 20px;display:flex;align-items:center;gap:16px;z-index:100;}
.pdf-back-btn{background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);color:#F5A623;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
.pdf-print-btn{background:#D4820A;border:none;color:white;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-left:auto;}
.pdf-title{font-size:14px;font-weight:700;}
.pdf-content{max-width:960px;margin:0 auto;padding:24px 20px 60px;}
.header-block{background:#1A1208;color:#FAF6EE;padding:18px 20px;border-radius:10px;margin-bottom:20px;}
.header-block h1{font-size:16px;color:#F5A623;margin-bottom:8px;}
.header-block p{font-size:11px;color:#A8916A;margin:3px 0;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;}
th{background:#1A1208;color:#F5A623;padding:7px 10px;text-align:left;font-size:10px;}
td{padding:6px 10px;border-bottom:1px solid #E8DCC8;vertical-align:top;font-size:11px;}
tr:nth-child(even) td{background:#FEF3DC;}
.badge{padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;}
.badge-sani{background:#F3E5F5;color:#6A1B9A;}
.badge-couvain{background:#E8EAF6;color:#283593;}
.registre-section-title{font-size:13px;color:#8B4513;border-bottom:2px solid #FEF3DC;padding-bottom:6px;margin:20px 0 12px;font-weight:700;}
.empty{text-align:center;padding:30px;color:#A8916A;}
@media print{.pdf-topbar{display:none;}body{background:white;}.pdf-content{padding:10mm;}}
</style></head><body>
<div class="pdf-topbar">
  <button class="pdf-back-btn" onclick="window.close()">← Retour</button>
  <span class="pdf-title">📖 Registre d'Élevage Apicole</span>
  <button class="pdf-print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>
</div>
<div class="pdf-content">
  ${header}
  ${document.getElementById('registre-content').innerHTML}
</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }
  w.document.write(printContent);
  w.document.close();
  toast('📄 Registre ouvert — cliquez "Imprimer / PDF"');
}
