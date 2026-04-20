/* ============================================================
   documents.js — Bibliothèque de documents réglementaires
   v1.4
   Upload depuis le formulaire sanitaire + consultation ordonnée
   ============================================================ */

const DOC_TYPES = {
  ordonnance:  { label: 'Ordonnance',   emoji: '📋', color: '#6A1B9A', bg: '#F3E5F5' },
  analyse:     { label: 'Analyse',      emoji: '🔬', color: '#1565C0', bg: '#E3F2FD' },
  declaration: { label: 'Déclaration',  emoji: '📄', color: '#2E7D32', bg: '#E8F5E9' },
  controle:    { label: 'Contrôle vét.', emoji: '🛡', color: '#E65100', bg: '#FBE9E7' },
  facture:     { label: 'Facture',      emoji: '🧾', color: '#5C4A2A', bg: '#FFF8EE' },
  autre:       { label: 'Autre',        emoji: '📎', color: '#546E7A', bg: '#ECEFF1' },
};

/* Fichier en attente d'upload (sélectionné dans le formulaire sanitaire) */
let _pendingDocFile = null;

/* Filtre actif dans la bibliothèque */
let _docsFilterType = 'all';

/* ============================================================
   RENDU — Bibliothèque
   ============================================================ */

function renderDocuments() {
  const el = document.getElementById('sub-documents');
  if (!el) return;

  const filtered = _docsFilterType === 'all'
    ? documentsData
    : documentsData.filter(d => d.type === _docsFilterType);

  /* Chips de filtre */
  const counts = {};
  Object.keys(DOC_TYPES).forEach(t => {
    counts[t] = documentsData.filter(d => d.type === t).length;
  });

  const chips = [
    `<button class="type-chip ${_docsFilterType === 'all' ? 'active' : ''}"
      onclick="_docsFilterType='all';renderDocuments()">
      Tous <span style="opacity:.6;font-size:.75em;">(${documentsData.length})</span>
    </button>`,
    ...Object.entries(DOC_TYPES).map(([t, dt]) =>
      counts[t] > 0 ? `<button class="type-chip ${_docsFilterType === t ? 'active' : ''}"
        onclick="_docsFilterType='${t}';renderDocuments()">
        ${dt.emoji} ${dt.label}
        <span style="opacity:.6;font-size:.75em;">(${counts[t]})</span>
      </button>` : ''
    ).filter(Boolean)
  ].join('');

  /* Cartes documents */
  const cards = filtered.length === 0
    ? `<div class="empty">
        <div class="empty-icon">📎</div>
        <p>${_docsFilterType === 'all'
          ? 'Aucun document enregistré.<br><small>Ajoutez des ordonnances, analyses ou déclarations pour les retrouver ici.</small>'
          : 'Aucun document dans cette catégorie.'
        }</p>
      </div>`
    : filtered.map(d => docCard(d)).join('');

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div class="card-title" style="margin:0;">📎 Bibliothèque de documents</div>
      <button class="btn-save" style="padding:6px 16px;font-size:0.8rem;" onclick="openModal('modal-new-doc')">+ Ajouter</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${chips}</div>
    <div id="docs-list">${cards}</div>`;
}

function docCard(d) {
  const dt = DOC_TYPES[d.type] || DOC_TYPES.autre;
  const date = d.timestamp ? new Date(d.timestamp).toLocaleDateString('fr-FR') : '—';
  const rucherTxt = d.rucher ? `<span style="margin-left:4px;">· ${d.rucher}</span>` : '';
  const origName = d.originalName
    ? `<div style="font-size:.7rem;color:var(--soft);margin-top:2px;word-break:break-all;">${d.originalName}</div>`
    : '';
  const linkedSani = d.sanitaireDocId
    ? `<div style="font-size:.7rem;color:var(--honey);margin-top:2px;">🔗 Lié à un traitement sanitaire</div>`
    : '';

  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:42px;height:42px;border-radius:10px;background:${dt.bg};display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">${dt.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.9rem;color:var(--dark);word-break:break-word;">${escHtml(d.label || d.originalName || '—')}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
            <span style="background:${dt.bg};color:${dt.color};padding:1px 8px;border-radius:20px;font-weight:600;font-size:.7rem;">${dt.label}</span>
            <span style="font-size:.75rem;color:var(--mid);">${date}${rucherTxt}</span>
          </div>
          ${origName}${linkedSani}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
          <a href="${d.url}" target="_blank" rel="noopener"
            style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:var(--honey-pale);color:var(--honey);text-decoration:none;font-size:1rem;"
            title="Ouvrir / télécharger">👁</a>
          <button onclick="confirmDeleteDoc('${d._docId}','${escAttr(d.label || d.originalName || 'ce document')}')"
            style="width:34px;height:34px;border-radius:8px;background:#FFEBEE;border:none;color:#C62828;font-size:1rem;cursor:pointer;"
            title="Supprimer">🗑</button>
        </div>
      </div>
    </div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s).replace(/'/g,"\\'");
}

/* ============================================================
   AJOUT MANUEL — modal-new-doc
   ============================================================ */

function populateDocRucherSelect() {
  const sel = document.getElementById('doc-rucher');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Tous ruchers —</option>'
    + RUCHERS.map(r => `<option value="${r.id}">${r.id} — ${r.lieu}</option>`).join('');
}

async function saveNewDocument() {
  const label = document.getElementById('doc-label').value.trim();
  const type  = document.getElementById('doc-type').value;
  const rucher = document.getElementById('doc-rucher').value;
  const fileInput = document.getElementById('doc-file');
  const file = fileInput?.files[0];

  if (!label) { toast('⚠️ Donnez un nom au document'); return; }
  if (!file)  { toast('⚠️ Sélectionnez un fichier'); return; }
  if (file.size > 15 * 1024 * 1024) { toast('⚠️ Fichier trop lourd (max 15 Mo)'); return; }

  const btn = document.getElementById('doc-save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Upload…';

  try {
    const doc = await uploadDocumentToFirestore(file, { label, type, rucher });
    documentsData.unshift(doc);
    closeModal('modal-new-doc');
    resetDocForm();
    renderDocuments();
    toast('✅ Document enregistré !');
  } catch (err) {
    console.error('Erreur upload document:', err);
    toast('❌ Erreur lors de l\'upload');
  } finally {
    btn.disabled = false;
    btn.textContent = '✓ Enregistrer';
  }
}

function resetDocForm() {
  const ids = ['doc-label', 'doc-file'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sel = document.getElementById('doc-type');
  if (sel) sel.value = 'ordonnance';
  const sel2 = document.getElementById('doc-rucher');
  if (sel2) sel2.value = '';
  const nm = document.getElementById('doc-file-label');
  if (nm) nm.textContent = 'Choisir un fichier (PDF, image)';
}

function handleDocFileSelect(input) {
  const file = input.files[0];
  const lbl = document.getElementById('doc-file-label');
  if (lbl) lbl.textContent = file ? file.name : 'Choisir un fichier (PDF, image)';
}

function confirmDeleteDoc(docId, label) {
  showConfirm(`Supprimer "${label}" ? Cette action est irréversible.`, async () => {
    await deleteDocumentFromFirestore(docId);
    documentsData = documentsData.filter(d => d._docId !== docId);
    renderDocuments();
    toast('🗑 Document supprimé');
  });
}

/* ============================================================
   UPLOAD RAPIDE — depuis le formulaire sanitaire
   ============================================================ */

/**
 * Appelé quand l'utilisateur sélectionne un fichier dans le formulaire sanitaire
 */
function handleSanitaireDocSelect(input) {
  const file = input.files[0];
  _pendingDocFile = file || null;
  const nm = document.getElementById('s-doc-name');
  if (!nm) return;
  if (file) {
    nm.textContent = file.name;
    nm.style.color = 'var(--honey)';
    nm.style.fontWeight = '600';
  } else {
    nm.textContent = 'Aucun document joint';
    nm.style.color = 'var(--soft)';
    nm.style.fontWeight = 'normal';
  }
}

/**
 * Uploadé le fichier en attente après la sauvegarde d'un traitement
 * @param {string} sanitaireDocId — l'ID Firestore du traitement lié
 */
async function uploadPendingDoc(sanitaireDocId) {
  if (!_pendingDocFile) return;
  const produit = document.getElementById('s-produit')?.value || 'Traitement';
  const date    = document.getElementById('s-date')?.value || new Date().toLocaleDateString('fr-FR');
  const rucher  = document.getElementById('s-rucher')?.value || '';
  const label   = `Ordonnance — ${produit} — ${date}`;

  try {
    const doc = await uploadDocumentToFirestore(_pendingDocFile, {
      label, type: 'ordonnance', rucher, sanitaireDocId
    });
    documentsData.unshift(doc);
    _pendingDocFile = null;
    toast('📎 Document joint au traitement');
  } catch (err) {
    console.warn('Erreur upload doc sanitaire:', err);
    toast('⚠️ Traitement enregistré mais échec du document');
  }
}

/**
 * Réinitialiser le fichier en attente (appelé par resetSanitaireForm)
 */
function clearPendingDoc() {
  _pendingDocFile = null;
  const input = document.getElementById('s-doc-file');
  if (input) input.value = '';
  const nm = document.getElementById('s-doc-name');
  if (nm) {
    nm.textContent = 'Aucun document joint';
    nm.style.color = 'var(--soft)';
    nm.style.fontWeight = 'normal';
  }
}
