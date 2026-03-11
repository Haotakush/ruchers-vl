# 🐝 Ruchers VL — Application Apicole

Application web progressive (PWA) pour la gestion des ruchers de La Réunion.

---

## Structure du projet

```
ruchers-vl/
│
├── index.html              ← Structure HTML uniquement (pas de JS ni CSS inline)
│
├── css/
│   └── style.css           ← Tout le CSS, organisé en 32 sections commentées
│
├── js/
│   ├── data.js             ← Données, localStorage, fonctions utilitaires
│   ├── ui.js               ← Navigation, modals, toast, sélecteur ruches
│   ├── journal.js          ← Journal des visites (save, render, delete)
│   ├── sanitaire.js        ← Registre sanitaire
│   ├── ruchers.js          ← Gestion ruchers, photos, calendrier, transhumance
│   ├── dashboard.js        ← Dashboard, stats, graphique, alertes, timeline
│   ├── carte.js            ← Carte Leaflet avec alertes visuelles
│   ├── registre.js         ← Registre d'élevage officiel + export PDF
│   ├── params-sync.js      ← Paramètres apiculteur + sync Google Sheets
│   └── app.js              ← Init + export/import JSON  ← DOIT ÊTRE CHARGÉ EN DERNIER
│
├── README.md               ← Ce fichier
└── google-apps-script.js   ← Script à coller dans Google Apps Script
```

---

## Déploiement sur GitHub Pages

1. Pusher tous les fichiers sur le repo GitHub
2. Aller dans Settings → Pages → Source : `main` branch, dossier `/` (root)
3. L'app sera accessible sur `https://[username].github.io/[repo]/`

⚠️ **Important** : GitHub Pages sert les fichiers tels quels.
Les fichiers `.js` et `.css` externes seront bien chargés.

---

## Ajouter une nouvelle fonctionnalité

### Exemple : ajouter un onglet "Récoltes"

1. **HTML** `index.html` :
   - Ajouter un bouton dans la `<nav class="bottom-nav">`
   - Ajouter une section `<div id="tab-recoltes" class="section">`

2. **JS** : créer `js/recoltes.js` avec les fonctions `saveRecolte()`, `renderRecoltes()`, etc.

3. **CSS** `css/style.css` : ajouter une section numérotée pour les styles spécifiques

4. **index.html** : ajouter `<script src="js/recoltes.js"></script>` avant `app.js`

5. **data.js** : ajouter `let recoltesData = JSON.parse(localStorage.getItem('recoltes')||'[]');`

---

## Données sauvegardées (localStorage)

| Clé            | Contenu                        |
|----------------|--------------------------------|
| `params`       | Infos apiculteur (nom, NAPI…) |
| `ruchers`      | Liste des ruchers              |
| `journal`      | Journal des visites            |
| `sanitaire`    | Traitements sanitaires         |
| `rucherPhotos` | Photos (base64)                |
| `transData`    | Données de transhumance        |
| `sheetsUrl`    | URL Google Apps Script         |
| `syncQueue`    | Queue d'envois en attente      |

---

## Versions

- **V1.0** — Application mono-fichier (point de départ)
- **V1.1** — Multi-fichiers, code refactorisé et documenté
- **V2.0** — *(à venir)* Sync cloud, graphiques avancés, récoltes…
