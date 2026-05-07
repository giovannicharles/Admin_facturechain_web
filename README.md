# FactureChain — Console d'administration

Application web réservée aux **administrateurs** et **agents de support** FactureChain. Permet de superviser la plateforme, traiter les réclamations, modérer les coupures, gérer les utilisateurs, et publier des annonces.

## Stack technique

- **Angular 18.2** standalone components, signals, lazy-loaded routes
- **Angular Material 18.2** + thème custom (sidenav sombre, palette M2 bleu/vert)
- **TypeScript 5.5** strict
- **Garde de rôle** : seuls les comptes `admin` et `agent` peuvent se connecter

## Démarrage

```bash
npm install
npm start
# → http://localhost:4300
```

Backend attendu sur `http://localhost:4000` (modifiable dans `src/environments/`).

## Comptes administrateurs

| Rôle  | Email                       | Mot de passe |
|-------|-----------------------------|--------------|
| Admin | `admin@facturechain.cm`     | `Admin@2024` |
| Agent | `agent@facturechain.cm`     | `Agent@2024` |

> Toute tentative de connexion avec un compte abonné sera rejetée avec le message *"Compte non autorisé pour la console admin"*.

## Pages livrées

| Route               | Page                              | Capacités |
|---------------------|-----------------------------------|-----------|
| `/auth/login`       | Connexion admin                   | Garde de rôle stricte |
| `/dashboard`        | Tableau de bord                   | KPIs agrégés (utilisateurs, clients, anomalies, coupures, claims par statut) |
| `/claims`           | Console réclamations              | Filtres statut/priorité, liste enrichie |
| `/claims/:id`       | Détail réclamation                | **Transitions FSM** (8 statuts), assignation, ajout réf ENEO, résolution, conversation |
| `/users`            | Gestion utilisateurs              | Recherche, filtres rôle/statut, suspendre/réactiver |
| `/customers`        | Annuaire clients ENEO             | Recherche par nom/identifiant/ville |
| `/outages`          | Modération coupures               | Liste filtrée, marquer rétabli |
| `/announcements`    | Annonces publiques                | Création (titre/message/sévérité), liste |

## Workflow type d'un agent sur une réclamation

1. L'agent ouvre `/claims` et filtre sur **Soumises**.
2. Il clique sur une réclamation → ouvre la fiche détail.
3. Dans le panneau **Action**, il sélectionne un **statut suivant autorisé** (selon la machine d'état du backend).
4. Selon le statut choisi, des champs apparaissent :
   - `transmitted_to_eneo` → champ **Référence transmission ENEO** obligatoire
   - `resolved` ou `rejected` → champ **Motif / Résolution** obligatoire
5. L'agent peut ajouter une **note interne** et appliquer.
6. L'historique de statuts est immédiatement mis à jour dans la timeline.
7. L'agent peut aussi répondre directement à l'abonné via la zone **Conversation**.

## Machine d'état des réclamations (FSM)

```
submitted → received | rejected
received → investigating | rejected
investigating → transmitted_to_eneo | resolved | rejected
transmitted_to_eneo → awaiting_response | resolved
awaiting_response → resolved | rejected
resolved → closed
rejected → closed
closed → ∅
```

Les transitions invalides sont **rejetées par le backend** (et l'UI ne propose que les transitions autorisées).

## Architecture du projet

```
src/
├── app/
│   ├── core/
│   │   ├── api/
│   │   │   ├── api.ts             # Services partagés avec le web abonné
│   │   │   └── admin-api.ts       # Service spécifique admin (/admin/*)
│   │   ├── auth/                  # AuthService (signals)
│   │   ├── guards/
│   │   │   ├── auth.guard.ts      # authGuard / guestGuard
│   │   │   └── admin-role.guard.ts # adminRoleGuard (refuse les abonnés)
│   │   ├── interceptors/auth.interceptor.ts
│   │   └── models/index.ts
│   ├── shared/
│   │   ├── components/badges.component.ts
│   │   ├── layouts/main-layout.component.ts # Sidenav sombre
│   │   └── pipes/format.pipes.ts
│   └── pages/
│       ├── auth/login/            # Login admin (variant)
│       ├── dashboard/             # KPIs agrégés
│       ├── claims/                # Liste + détail FSM
│       ├── users/                 # Gestion utilisateurs
│       ├── customers/             # Annuaire
│       ├── outages/               # Modération
│       └── announcements/         # CRUD annonces
└── styles.scss                    # Thème Material custom (identique à app abonné)
```

## Différences vs l'app abonné

| Aspect | App abonné | Console admin |
|---|---|---|
| Préfixe composants | `fc-` | `fca-` |
| Port dev | 4200 | 4300 |
| Sidenav | Clair | Sombre (slate-900) |
| Garde rôle | `subscriber+admin+agent` | `admin+agent` uniquement |
| Pages | 12 (subscriber-facing) | 7 (admin-facing) |
| Routes API | `/me/*`, `/meters/*`, `/claims/*`, `/outages` | `/admin/*` (en plus) |

---

© FactureChain — Console d'administration
