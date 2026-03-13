# Ruchers VL — Changelog V1.3

## Nouveautés

### Nouveau modèle de visite
Le formulaire de visite est entièrement revu : une seule saisie par rucher (et non plus par ruche individuelle). Chaque visite enregistre la date, le rucher, la météo, la force de la colonie, le marquage physique, le nombre de ruches et de ruchettes, les interventions réalisées et les observations libres.

Les données par ruche (cadres couvain/réserve/vide, ponte/reine) sont supprimées — le marquage physique (pierre, bois) suffit à identifier chaque ruche sur le terrain.

### Effectif pré-rempli
Le nombre de ruches est pré-rempli depuis la fiche du rucher. Le nombre de ruchettes est pré-rempli depuis la dernière visite enregistrée pour ce rucher, et reste modifiable via les boutons + / −.

### Fiche rucher enrichie
Les fiches ruchers disposent désormais d'un champ "Nb ruchettes" (en plus du nombre de ruches existant).

### Création de compte
L'écran de connexion propose un lien "Pas encore de compte ?" pour créer un compte Firebase directement dans l'app — utile pour l'ouverture à d'autres apiculteurs en phase bêta.

### Indicateur de synchronisation
La barre du haut affiche l'heure de la dernière synchronisation avec Firebase ("✓ Sync à l'instant", "✓ Sync il y a 3 min"…) ainsi qu'un bouton 🔄 pour forcer une resynchronisation manuelle.

### Photos Firebase Storage
Les photos de ruchers sont désormais compressées (Canvas API, cible ~2 Mo) et stockées dans Firebase Storage — plus de limitation localStorage.

### Édition des traitements sanitaires
Les fiches de traitement sanitaire sont maintenant modifiables (comme les visites de journal).

### Modal de confirmation personnalisé
Les suppressions utilisent un modal intégré à l'app plutôt que le `confirm()` natif du navigateur.

### Données vierges par défaut
L'application démarre sans ruchers ni visites pré-chargés — chaque utilisateur part d'une base propre.

---

## Corrections

- Fix marquage : les descriptions en champ libre (pierre, bois…) n'étaient pas sauvegardées — corrigé.
- Fix scroll iOS : la bottom navigation ne masque plus le bas du contenu (padding-bottom augmenté).
- Fix app-container : masqué par défaut, affiché uniquement après connexion Firebase.

---

## Registre d'élevage

Les colonnes du registre sont mises à jour : suppression des colonnes Reine et Ruches individuelles, ajout des colonnes Marquage, Force, NbRuches et NbRuchettes.

---

## Stack technique

- Firebase Auth (email/password + création de compte)
- Cloud Firestore (offline persistence, sync temps réel)
- Firebase Storage (photos compressées)
- HTML / CSS / JS natif — aucun bundler
- Hébergement : GitHub Pages
