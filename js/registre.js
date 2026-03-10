/* ============================================================
   registre.js — Registre d'élevage apicole
   
   Ce fichier gère :
   - Rendu du registre officiel (4 sections)
   - Export PDF via fenêtre d'impression
   ============================================================ */


/**
 * Générer le contenu complet du registre d'élevage
 * Appelé quand on navigue vers l'onglet Registre
 */
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


/* ------------------------------------------------------------
   SECTIONS DU REGISTRE
   ------------------------------------------------------------ */

/** Section 1 : Identification de l'exploitation */
function buildSection1_Identification() {
  return `
    <div class="registre-section">
      <div class="registre-section-title">1. Identification de l'exploitation</div>
      <table class="registre-table">
        <tr><td style="font-weight:700;width:40%">Nom / Raison sociale</td><td>${PARAMS.nom}</td></tr>
        <tr><td style="font-weight:700">NAPI</td>                          <td>${PARAMS.napi}</td></tr>
        <tr><td style="font-weight:700">N° SIRET</td>                      <td>${PARAMS.siret}</td></tr>
        <tr><td style="font-weight:700">Adresse</td>                       <td>${PARAMS.adresse}</td></tr>
        <tr><td style="font-weight:700">Email</td>                         <td>${PARAMS.email}</td></tr>
        <tr><td style="font-weight:700">Date déclaration</td>              <td>${PARAMS.dateDecl}</td></tr>
        <tr><td style="font-weight:700">Référence</td>                     <td>${PARAMS.refDecl}</td></tr>
        <tr>
          <td style="font-weight:700">Colonies déclarées</td>
          <td><strong style="font-size:1.1rem;color:var(--honey);">${PARAMS.colonies}</strong></td>
        </tr>
      </table>
    </div>`;
}

/** Section 2 : Inventaire des ruchers */
function buildSection2_Ruchers() {
  const rows = RUCHERS.map(r => {
    const zoneCls = r.zone === 'Bas' ? 'badge-zone-bas'
                  : r.zone === 'Mi-pentes' ? 'badge-zone-mi'
                  : 'badge-zone-hauts';
    return `
      <tr>
        <td style="font-family:'DM Mono',monospace;font-weight:700;">${r.id}</td>
        <td>${r.lieu}</td>
        <td><span class="badge ${zoneCls}">${r.zone}</span></td>
        <td>${r.alt}m</td>
        <td>${r.cp}</td>
        <td style="font-weight:700;color:var(--honey);">${r.nb !== null ? r.nb : '—'}</td>
      </tr>`;
  }).join('');

  const total = getTotalRuches();

  return `
    <div class="registre-section">
      <div class="registre-section-title">2. Inventaire des ruchers</div>
      <table class="registre-table">
        <thead>
          <tr><th>ID</th><th>Lieu</th><th>Zone</th><th>Alt.</th><th>CP</th><th>Ruches</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:var(--honey-pale);">
            <td colspan="5" style="font-weight:700;text-align:right;">TOTAL</td>
            <td style="font-weight:700;color:var(--honey);font-size:1rem;">${total}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

/** Section 3 : Journal des visites */
function buildSection3_Journal() {
  if (!journalData.length) {
    return `
      <div class="registre-section">
        <div class="registre-section-title">3. Journal des visites (0 entrées)</div>
        <div class="empty"><div class="empty-icon">📋</div><p>Aucune visite enregistrée.</p></div>
      </div>`;
  }

  // Trier par date croissante pour le registre officiel
  const sorted = [...journalData].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map(v => `
    <tr>
      <td style="font-family:'DM Mono',monospace;white-space:nowrap;">${v.date}</td>
      <td style="font-weight:600;">${v.rucher}</td>
      <td style="font-size:0.72rem;">${v.ruches || '—'}</td>
      <td>${v.reine || '—'}</td>
      <td>${v.force || '—'}</td>
      <td style="font-size:0.72rem;">${v.intervention || '—'}</td>
      <td style="font-size:0.72rem;">${v.obs || ''}</td>
    </tr>`).join('');

  return `
    <div class="registre-section">
      <div class="registre-section-title">3. Journal des visites (${journalData.length} entrées)</div>
      <table class="registre-table">
        <thead>
          <tr><th>Date</th><th>Rucher</th><th>Ruches</th><th>Reine</th><th>Force</th><th>Interventions</th><th>Observations</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/** Section 4 : Registre sanitaire */
function buildSection4_Sanitaire() {
  if (!sanitaireData.length) {
    return `
      <div class="registre-section">
        <div class="registre-section-title">4. Registre sanitaire (0 entrées)</div>
        <div class="empty"><div class="empty-icon">💊</div><p>Aucun traitement enregistré.</p></div>
      </div>`;
  }

  const sorted = [...sanitaireData].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map(s => `
    <tr>
      <td style="font-family:'DM Mono',monospace;white-space:nowrap;">${s.date}</td>
      <td style="font-weight:600;">${s.rucher}</td>
      <td>${s.type}</td>
      <td>${s.produit}</td>
      <td>${s.dose}</td>
      <td>${s.duree}</td>
      <td><span class="badge ${s.gdsa === 'Oui' ? 'badge-sani' : 'badge-couvain'}">${s.gdsa}</span></td>
      <td style="font-size:0.72rem;">${s.motif}</td>
    </tr>`).join('');

  return `
    <div class="registre-section">
      <div class="registre-section-title">4. Registre sanitaire (${sanitaireData.length} entrées)</div>
      <table class="registre-table">
        <thead>
          <tr><th>Date</th><th>Rucher</th><th>Type</th><th>Produit</th><th>Dose</th><th>Durée</th><th>GDSA</th><th>Motif</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/** Pied de page légal du registre */
function buildRegistreFooter() {
  return `
    <div style="text-align:center;font-size:0.7rem;color:var(--soft);padding:16px 0;
      border-top:1px solid var(--border);margin-top:10px;">
      Registre tenu conformément à l'arrêté du 11 août 1994 —
      Généré le ${new Date().toLocaleDateString('fr-FR')}
    </div>`;
}


/* ------------------------------------------------------------
   EXPORT PDF
   ------------------------------------------------------------ */

/**
 * Ouvrir une fenêtre d'impression pré-formatée
 * L'utilisateur choisit "Enregistrer en PDF" dans la boîte de dialogue
 */
function exportPDF() {
  renderRegistre();

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Registre Élevage — ${PARAMS.nom}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #2C1F0E;
          margin: 20mm;
        }
        h2 {
          font-size: 13px;
          color: #8B4513;
          border-bottom: 1px solid #E8DCC8;
          padding-bottom: 5px;
          margin: 16px 0 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        th {
          background: #1A1208;
          color: #F5A623;
          padding: 6px 8px;
          text-align: left;
          font-size: 9px;
        }
        td {
          padding: 5px 8px;
          border-bottom: 1px solid #E8DCC8;
          vertical-align: top;
        }
        tr:nth-child(even) td { background: #FEF3DC; }
        .header-block {
          background: #1A1208;
          color: #FAF6EE;
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .header-block h1 {
          font-size: 15px;
          color: #F5A623;
          margin-bottom: 6px;
        }
        .header-block p {
          font-size: 10px;
          color: #A8916A;
          margin: 3px 0;
        }
        .badge {
          padding: 2px 7px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 700;
        }
        .registre-section-title {
          font-size: 12px;
          color: #8B4513;
          border-bottom: 2px solid #FEF3DC;
          padding-bottom: 5px;
          margin: 16px 0 10px;
        }
        @media print { body { margin: 10mm; } }
      </style>
    </head>
    <body>
      <div class="header-block">
        <h1>📖 Registre d'Élevage Apicole</h1>
        <p>${PARAMS.nom} · NAPI ${PARAMS.napi} · SIRET ${PARAMS.siret}</p>
        <p>${PARAMS.adresse}</p>
        <p>Déclaration du ${PARAMS.dateDecl} · Réf. ${PARAMS.refDecl} · ${PARAMS.colonies} colonies</p>
      </div>
      ${document.getElementById('registre-content').innerHTML}
    </body>
    </html>`;

  const w = window.open('', '_blank');
  w.document.write(printContent);
  w.document.close();
  w.focus();

  // Petit délai pour que le contenu se charge avant d'imprimer
  setTimeout(() => { w.print(); }, 500);

  toast('📄 Impression / PDF en cours…');
}
