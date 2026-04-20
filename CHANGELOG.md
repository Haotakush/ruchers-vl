# Ruchers VL — Changelog

---

## V2.0 — Roadmap (en cours)

### ✅ Livré

#### GPS Transhumance
Mini-carte Leaflet intégrée dans la section Transhumance. Chaque mouvement enregistré avec un rucher d'origine géolocalisé apparaît sur la carte. Si la destination contient des coordonnées GPS (format `lat, lng`), une flèche pointillée relie les deux points. Les mouvements avec GPS affichent un badge dédié dans la liste.

#### Bouton GPS dans les fiches rucher
Bouton "📍 Ma position GPS actuelle" dans les formulaires de création et d'édition de rucher. Un tap capture la position via l'API Géolocalisation et remplit automatiquement les champs lat/lng, avec affichage de la précision en mètres. Les champs manuels restent disponibles en dessous pour correction si besoin.

#### Bouton GPS dans le formulaire de mouvement
Bouton "📍 GPS" dans le champ destination du formulaire de mouvement. Permet à l'apiculteur de capturer ses coordonnées exactes depuis le terrain sans saisie manuelle.

#### Service Worker mis à jour (v1.3.12)
Modules `mouvements.js`, `documents.js`, `admin-conformite.js` et `manifest.json` ajoutés au cache offline — ces fichiers n'étaient pas disponibles hors connexion.

---

### 🔜 À faire

#### Calcul automatique du délai de retrait AMM
Quand un traitement est saisi dans le module Sanitaire, l'app calcule et affiche automatiquement la date de fin de retrait selon le produit (ex : Apivar = 6–10 semaines, Api-Bioxal = 4 semaines). Une alerte visuelle indique si on est encore dans la période de retrait. Élimine le risque d'erreur de calcul manuel = miel non conforme.

**Fichiers concernés :** `sanitaire.js`, `index.html` (modal traitement)

#### Déclaration de mouvement DDPP auto-générée
Quand un mouvement de rucher est enregistré, un bouton "Générer la déclaration DDPP" produit un PDF pré-rempli avec les informations obligatoires (nom, NAPI, date, nb ruches, adresse d'origine, lieu de destination). Prêt à envoyer par email à la DDPP en 2 taps. Obligation légale actuellement ignorée par la quasi-totalité des apiculteurs.

**Fichiers concernés :** nouveau module `ddpp.js` ou extension de `mouvements.js`, génération PDF (jsPDF ou export HTML)

#### Météo locale par rucher
Afficher les prévisions météo à l'emplacement GPS exact de chaque rucher via une API météo (OpenMeteo, gratuite et sans clé). Conditions de visite, température, vent, précipitations sur 3 jours. Particulièrement utile à La Réunion où les microclimats varient fortement entre côte et hauts.

**Fichiers concernés :** nouveau module `meteo.js`, appel API dans `ruchers.js` ou fiche rucher

#### Notifications push locales
Alertes planifiées sur 3 cas précis : ouverture de la fenêtre de déclaration annuelle DDPP (1er septembre), périodes de comptage varroa selon le calendrier 974, rucher non visité depuis plus de X jours. Repose sur le Service Worker déjà en place — pas de serveur push requis pour démarrer avec des notifications locales.

**Fichiers concernés :** `sw.js`, nouveau module `notifications.js`

---

### ⏸ Écarté pour V2

- **Multi-utilisateurs** — reporté à V3
- **Comptage Varroa structuré** — reporté, logique sanitaire à affiner
- **Suivi du stock de médicaments** — reporté, logique sanitaire à affiner

---

## V1.3 — Livré

### Nouveautés

#### Nouveau modèle de visite
Le formulaire de visite est entièrement revu : une seule saisie par rucher (et non plus par ruche individuelle). Chaque visite enregistre la date, le rucher, la météo, la force de la colonie, le marquage physique, le nombre de ruches et de ruchettes, les interventions réalisées et les observations libres.

Les données par ruche (cadres couvain/réserve/vide, ponte/reine) sont supprimées — le marquage physique (pierre, bois) suffit à identifier chaque ruche sur le terrain.

#### Effectif pré-rempli
Le nombre de ruches est pré-rempli depuis la fiche du rucher. Le nombre de ruchettes est pré-rempli depuis la dernière visite enregistrée pour ce rucher, et reste modifiable via les boutons + / −.

#### Fiche rucher enrichie
Les fiches ruchers disposent désormais d'un champ "Nb ruchettes" (en plus du nombre de ruches existant).

#### Création de compte
L'écran de connexion propose un lien "Pas encore de compte ?" pour créer un compte Firebase directement dans l'app — utile pour l'ouverture à d'autres apiculteurs en phase bêta.

#### Indicateur de synchronisation
La barre du haut affiche l'heure de la dernière synchronisation avec Firebase ("✓ Sync à l'instant", "✓ Sync il y a 3 min"…) ainsi qu'un bouton 🔄 pour forcer une resynchronisation manuelle.

#### Photos Firebase Storage
Les photos de ruchers sont désormais compressées (Canvas API, cible ~2 Mo) et stockées dans Firebase Storage — plus de limitation localStorage.

#### Édition des traitements sanitaires
Les fiches de traitement sanitaire sont maintenant modifiables (comme les visites de journal).

#### Modal de confirmation personnalisé
Les suppressions utilisent un modal intégré à l'app plutôt que le `confirm()` natif du navigateur.

#### Données vierges par défaut
L'application démarre sans ruchers ni visites pré-chargés — chaque utilisateur part d'une base propre.

### Corrections

- Fix marquage : les descriptions en champ libre (pierre, bois…) n'étaient pas sauvegardées — corrigé.
- Fix scroll iOS : la bottom navigation ne masque plus le bas du contenu (padding-bottom augmenté).
- Fix app-container : masqué par défaut, affiché uniquement après connexion Firebase.

### Registre d'élevage

Les colonnes du registre sont mises à jour : suppression des colonnes Reine et Ruches individuelles, ajout des colonnes Marquage, Force, NbRuches et NbRuchettes.

### Stack technique

- Firebase Auth (email/password + création de compte)
- Cloud Firestore (offline persistence, sync temps réel)
- Firebase Storage (photos compressées)
- HTML / CSS / JS natif — aucun bundler
- Hébergement : GitHub Pages
