# 🐝 Ruchers VL — Application Apicole

Application web progressive (PWA) pour la gestion des ruchers de La Réunion.

---

## Structure du projet

```
ruchers-vl/
│
├── index.html              ← Structure HTML (modals, navigation)
│
├── css/
│   └── style.css           ← Tout le CSS (33 sections commentées)
│
├── js/
│   ├── data.js             ← Données, constantes, utilitaires
│   ├── ui.js               ← Navigation, modals, toast, topbar
│   ├── journal.js          ← Journal des visites (v1.2 : mode rapide + ruche/ruche)
│   ├── sanitaire.js        ← Registre sanitaire
│   ├── ruchers.js          ← Gestion ruchers, photos, édition
│   ├── dashboard.js        ← Dashboard, stats, graphique, alertes
│   ├── carte.js            ← Carte Leaflet avec alertes visuelles
│   ├── registre.js         ← Registre d'élevage officiel + export PDF
│   ├── params-sync.js      ← Paramètres apiculteur
│   ├── firebase-init.js    ← Config Firebase
│   ├── firebase-auth.js    ← Auth email/password
│   ├── firebase-db.js      ← Couche Firestore (CRUD + listeners)
│   └── app.js              ← Init + export/import JSON ← CHARGÉ EN DERNIER
│
└── README.md
```

---

## Historique des versions

### v1.2 (actuelle)
- ✅ **Formulaire de visite entièrement refait**
  - Mode ⚡ Rapide : état global + interventions en quelques secondes
  - Mode 📋 Ruche par ruche : une carte dépliable par ruche avec force, reine, cadres, interventions, marquage
  - Interventions désormais **par ruche individuelle**
- ✅ **Marquage physique — double rôle**
  - Pose un marquage "à rappeler" sur une ruche (pour la prochaine visite)
  - La visite suivante affiche automatiquement un **résumé des rappels** en haut du formulaire
- ✅ **Compte rendu de visite** : cliquer sur une visite ouvre un détail complet par ruche
- ✅ Fix scroll iOS (touch events + overflow)
- ✅ Fix photos ruchers (injection JS, plus de base64 inline)

### v1.1
- ✅ Fix scroll iPhone
- ✅ Fix photos ruchers
- ✅ PDF dans nouvel onglet avec ← Retour
- ✅ Modifier un rucher (bouton ✏️)
- ✅ Modifier une visite
- ✅ Compte rendu basique

### v1.0
- Application fonctionnelle mono-fichier puis multi-fichiers
- Firebase Auth + Firestore
- Dashboard, carte Leaflet, registre PDF, calendrier mellifère, transhumance

---

## Déploiement sur GitHub Pages

### Première mise en ligne
1. Créer un repo sur GitHub (ex: `ruchers-vl`)
2. `git init` dans ton dossier local
3. `git add .` puis `git commit -m "Initial commit"`
4. `git branch -M main`
5. `git remote add origin https://github.com/TON_USERNAME/ruchers-vl.git`
6. `git push -u origin main`
7. Dans GitHub → Settings → Pages → Source : `main` / `/ (root)`

### Mise à jour (procédure courante)
```bash
git add .
git commit -m "v1.2 — Formulaire visite refait"
git push
```
GitHub Pages se met à jour automatiquement en ~1 minute.

---

## Données Firestore

```
users/{uid}/
  ├── config/params          → paramètres apiculteur
  ├── config/transhumance    → données transhumance
  ├── ruchers/{rucherId}     → chaque rucher
  ├── journal/{autoId}       → chaque visite
  │     ├── mode             → 'rapide' | 'complet'
  │     ├── ruchesDetail     → { "01": { force, reine, cadres, interventions, marquagePoser, obs } }
  │     └── ...
  └── sanitaire/{autoId}     → chaque traitement
```

### Structure d'une visite v1.2
```json
{
  "date": "2026-03-11",
  "rucher": "R01",
  "mode": "complet",
  "meteo": "Ensoleillé",
  "obs": "Bon état général",
  "ruches": "Ruches : 01, 03, 07",
  "force": "Forte",
  "reine": "PONTE OK",
  "interventions": ["Nourrissement", "Pose hausse"],
  "ruchesDetail": {
    "01": {
      "force": "Forte",
      "reine": "PONTE OK",
      "couvain": 7,
      "reserve": 5,
      "vide": 1,
      "interventions": ["Pose hausse"],
      "marquagePoser": ["Pierre"],
      "obs": "Reine vue, belle ponte"
    },
    "03": { ... }
  }
}
```

---

## localStorage (backup local)

| Clé            | Contenu                        |
|----------------|--------------------------------|
| `params`       | Infos apiculteur (nom, NAPI…) |
| `ruchers`      | Liste des ruchers              |
| `journal`      | Journal des visites            |
| `sanitaire`    | Traitements sanitaires         |
| `rucherPhotos` | Photos (base64)                |
| `transData`    | Données de transhumance        |
