/* registre.js — v1.3 : colonnes adaptées au nouveau modèle */
function renderRegistre() {
  const el = document.getElementById('registre-content');
  if (!el) return;
  el.innerHTML = [
    buildSection1_Identification(),
    buildSection2_Ruchers(),
    buildSection3_Journal(),
    buildSection4_Sanitaire(),
    buildRegistreFooter(),
  ].join('');
}

function buildSection1_Identification() {
  return '<div class="registre-section"><div class="registre-section-title">1. Identification de l\'exploitation</div><table class="registre-table"><tr><td style="font-weight:700;width:40%">Nom / Raison sociale</td><td>' + (PARAMS.nom||'—') + '</td></tr><tr><td style="font-weight:700">NAPI</td><td>' + (PARAMS.napi||'—') + '</td></tr><tr><td style="font-weight:700">N° SIRET</td><td>' + (PARAMS.siret||'—') + '</td></tr><tr><td style="font-weight:700">Adresse</td><td>' + (PARAMS.adresse||'—') + '</td></tr><tr><td style="font-weight:700">Email</td><td>' + (PARAMS.email||'—') + '</td></tr><tr><td style="font-weight:700">Date déclaration</td><td>' + (PARAMS.dateDecl||'—') + '</td></tr><tr><td style="font-weight:700">Référence</td><td>' + (PARAMS.refDecl||'—') + '</td></tr><tr><td style="font-weight:700">Colonies déclarées</td><td><strong style="font-size:1.1rem;color:var(--honey);">' + (PARAMS.colonies||'—') + '</strong></td></tr></table></div>';
}

function buildSection2_Ruchers() {
  const rows = RUCHERS.map(r => {
    const zoneCls = r.zone === 'Bas' ? 'badge-zone-bas' : r.zone === 'Mi-pentes' ? 'badge-zone-mi' : 'badge-zone-hauts';
    return '<tr><td style="font-family:\'DM Mono\',monospace;font-weight:700;">' + r.id + '</td><td>' + r.lieu + '</td><td><span class="badge ' + zoneCls + '">' + r.zone + '</span></td><td>' + r.alt + 'm</td><td>' + r.cp + '</td><td style="font-weight:700;color:var(--honey);">' + (r.nb!==null?r.nb:'—') + '</td><td style="color:#E65100;">' + (r.nbRuchettes||'—') + '</td></tr>';
  }).join('');
  const total = getTotalRuches();
  return '<div class="registre-section"><div class="registre-section-title">2. Inventaire des ruchers</div><table class="registre-table"><thead><tr><th>ID</th><th>Lieu</th><th>Zone</th><th>Alt.</th><th>CP</th><th>Ruches</th><th>Ruchettes</th></tr></thead><tbody>' + rows + '<tr style="background:var(--honey-pale);"><td colspan="5" style="font-weight:700;text-align:right;">TOTAL RUCHES</td><td style="font-weight:700;color:var(--honey);font-size:1rem;">' + total + '</td><td></td></tr></tbody></table></div>';
}

function buildSection3_Journal() {
  if (!journalData.length) {
    return '<div class="registre-section"><div class="registre-section-title">3. Journal des visites (0 entrées)</div><div class="empty"><div class="empty-icon">📋</div><p>Aucune visite enregistrée.</p></div></div>';
  }
  const sorted = [...journalData].sort((a,b) => a.date.localeCompare(b.date));
  const rows = sorted.map(v => '<tr><td style="font-family:\'DM Mono\',monospace;white-space:nowrap;">' + v.date + '</td><td style="font-weight:600;">' + v.rucher + '</td><td>' + (v.nbRuches||'—') + '</td><td>' + (v.nbRuchettes||'—') + '</td><td>' + (v.force||'—') + '</td><td style="font-size:0.72rem;">' + (v.marquage?.join(', ')||'—') + '</td><td style="font-size:0.72rem;">' + (v.intervention||'—') + '</td><td style="font-size:0.72rem;">' + (v.obs||'') + '</td></tr>').join('');
  return '<div class="registre-section"><div class="registre-section-title">3. Journal des visites (' + journalData.length + ' entrées)</div><table class="registre-table"><thead><tr><th>Date</th><th>Rucher</th><th>Ruches</th><th>Ruchettes</th><th>Force</th><th>Marquage</th><th>Interventions</th><th>Observations</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function buildSection4_Sanitaire() {
  if (!sanitaireData.length) {
    return '<div class="registre-section"><div class="registre-section-title">4. Registre sanitaire (0 entrées)</div><div class="empty"><div class="empty-icon">💊</div><p>Aucun traitement enregistré.</p></div></div>';
  }
  const sorted = [...sanitaireData].sort((a,b) => a.date.localeCompare(b.date));
  const rows = sorted.map(s => '<tr><td style="font-family:\'DM Mono\',monospace;white-space:nowrap;">' + s.date + '</td><td style="font-weight:600;">' + s.rucher + '</td><td>' + s.type + '</td><td>' + s.produit + '</td><td>' + s.dose + '</td><td>' + s.duree + '</td><td><span class="badge ' + (s.gdsa==='Oui'?'badge-sani':'badge-couvain') + '">' + s.gdsa + '</span></td><td style="font-size:0.72rem;">' + s.motif + '</td></tr>').join('');
  return '<div class="registre-section"><div class="registre-section-title">4. Registre sanitaire (' + sanitaireData.length + ' entrées)</div><table class="registre-table"><thead><tr><th>Date</th><th>Rucher</th><th>Type</th><th>Produit</th><th>Dose</th><th>Durée</th><th>GDSA</th><th>Motif</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function buildRegistreFooter() {
  return '<div style="text-align:center;font-size:0.7rem;color:var(--soft);padding:16px 0;border-top:1px solid var(--border);margin-top:10px;">Registre tenu conformément à l\'arrêté du 11 août 1994 — Généré le ' + new Date().toLocaleDateString('fr-FR') + '</div>';
}

function exportPDF() {
  renderRegistre();
  const printContent = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Registre Élevage — ' + (PARAMS.nom||'Apiculteur') + '</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:11px;color:#2C1F0E;background:#FAF6EE;}.pdf-topbar{position:sticky;top:0;background:#1A1208;color:#F5A623;padding:14px 20px;display:flex;align-items:center;gap:16px;z-index:100;}.pdf-back-btn{background:rgba(245,166,35,.15);border:1px solid rgba(245,166,35,.4);color:#F5A623;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}.pdf-print-btn{background:#D4820A;border:none;color:white;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-left:auto;}.pdf-title{font-size:14px;font-weight:700;}.pdf-content{max-width:900px;margin:0 auto;padding:24px 20px 60px;}.header-block{background:#1A1208;color:#FAF6EE;padding:18px 20px;border-radius:10px;margin-bottom:20px;}.header-block h1{font-size:16px;color:#F5A623;margin-bottom:8px;}.header-block p{font-size:11px;color:#A8916A;margin:3px 0;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}th{background:#1A1208;color:#F5A623;padding:7px 10px;text-align:left;font-size:10px;}td{padding:6px 10px;border-bottom:1px solid #E8DCC8;vertical-align:top;font-size:11px;}tr:nth-child(even) td{background:#FEF3DC;}.badge{padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;}.badge-zone-bas{background:#E8F5E9;color:#2E7D32;}.badge-zone-mi{background:#FFF8E1;color:#F57F17;}.badge-zone-hauts{background:#E3F2FD;color:#1565C0;}.badge-sani{background:#F3E5F5;color:#6A1B9A;}.badge-couvain{background:#E8EAF6;color:#283593;}.registre-section-title{font-size:13px;color:#8B4513;border-bottom:2px solid #FEF3DC;padding-bottom:6px;margin:20px 0 12px;font-weight:700;}.empty{text-align:center;padding:30px;color:#A8916A;}@media print{.pdf-topbar{display:none;}body{background:white;}.pdf-content{padding:10mm;}}</style></head><body><div class="pdf-topbar"><button class="pdf-back-btn" onclick="window.close()">← Retour</button><span class="pdf-title">📖 Registre d\'Élevage Apicole</span><button class="pdf-print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button></div><div class="pdf-content"><div class="header-block"><h1>📖 Registre d\'Élevage Apicole</h1><p><strong style="color:#F5A623;">' + (PARAMS.nom||'—') + '</strong> · NAPI ' + (PARAMS.napi||'—') + ' · SIRET ' + (PARAMS.siret||'—') + '</p><p>' + (PARAMS.adresse||'—') + '</p><p>Déclaration du ' + (PARAMS.dateDecl||'—') + ' · Réf. ' + (PARAMS.refDecl||'—') + ' · ' + (PARAMS.colonies||'—') + ' colonies</p><p style="margin-top:8px;font-size:10px;color:#6B5A3E;">Généré le ' + new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) + '</p></div>' + document.getElementById('registre-content').innerHTML + '</div></body></html>';

  const w = window.open('', '_blank');
  if (!w) {
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return;
  }
  w.document.write(printContent);
  w.document.close();
  toast('📄 Registre ouvert — cliquez "Imprimer / PDF"');
}
