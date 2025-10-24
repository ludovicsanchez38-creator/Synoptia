# BrainSkills - Documentation Complète des Skills Claude Code

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Qu'est-ce qu'un Skill ?](#quest-ce-quun-skill)
3. [Architecture et Structure](#architecture-et-structure)
4. [Anatomie d'un Skill](#anatomie-dun-skill)
5. [Création d'un Skill](#création-dun-skill)
6. [Bonnes Pratiques](#bonnes-pratiques)
7. [Exemples de Skills](#exemples-de-skills)
8. [Gestion et Organisation](#gestion-et-organisation)
9. [Patterns Avancés](#patterns-avancés)
10. [Référence Technique](#référence-technique)

---

## Introduction

Les **Skills** sont une fonctionnalité majeure de Claude Code (annoncée le 23 octobre 2025) qui permet d'étendre les capacités de l'assistant IA de manière modulaire et réutilisable. Un Skill représente une capacité spécialisée que Claude peut invoquer automatiquement en fonction du contexte de travail.

### Principe Fondamental

Les Skills fonctionnent selon un principe d'**invocation autonome** : Claude décide lui-même quand utiliser un Skill en fonction de votre demande et de la description du Skill. Vous n'avez pas besoin d'appeler explicitement un Skill - Claude le fait pour vous.

### Avantages Clés

- **Modularité** : Capacités réutilisables et portables
- **Autonomie** : Claude décide quand les utiliser
- **Spécialisation** : Chaque Skill se concentre sur un domaine spécifique
- **Évolutivité** : Facile d'ajouter de nouvelles capacités
- **Collaboration** : Partagez vos Skills avec la communauté

---

## Qu'est-ce qu'un Skill ?

Un **Skill** est un dossier organisé contenant :

1. **Un fichier SKILL.md** (obligatoire) : Instructions que Claude lit
2. **Scripts et outils** (optionnels) : Code exécutable
3. **Templates** (optionnels) : Modèles réutilisables
4. **Ressources** (optionnelles) : Fichiers de support, données, configs

### Métaphore Conceptuelle

Pensez à un Skill comme à un **manuel de procédures spécialisé** :
- Le fichier SKILL.md est le manuel d'instructions
- Les scripts sont les outils fournis avec le manuel
- Les templates sont des formulaires pré-remplis
- Les ressources sont les annexes et références

---

## Architecture et Structure

### Structure de Base

```
my-skill/
├── SKILL.md              # Instructions principales (OBLIGATOIRE)
├── scripts/              # Scripts exécutables (optionnel)
│   ├── setup.sh
│   └── execute.py
├── templates/            # Modèles de fichiers (optionnel)
│   ├── config.yaml
│   └── boilerplate.ts
└── resources/            # Ressources additionnelles (optionnel)
    ├── data.json
    └── references.md
```

### Emplacement des Skills

Les Skills sont stockés dans le répertoire `.claude/skills/` de votre projet :

```
.claude/
└── skills/
    ├── code-reviewer/
    │   └── SKILL.md
    ├── test-generator/
    │   └── SKILL.md
    └── documentation-writer/
        ├── SKILL.md
        └── templates/
            └── readme-template.md
```

---

## Anatomie d'un Skill

### Le fichier SKILL.md

Le fichier SKILL.md est le cœur du Skill. Il doit contenir :

#### 1. Métadonnées (Front Matter YAML)

```yaml
---
name: nom-du-skill
description: Description courte pour l'invocation automatique
version: 1.0.0
author: Votre Nom
tags: [tag1, tag2, tag3]
---
```

**Champs importants :**

- **name** : Identifiant unique du Skill (kebab-case recommandé)
- **description** : Description concise utilisée par Claude pour décider quand invoquer le Skill
- **version** : Versioning sémantique (semver)
- **author** : Créateur du Skill
- **tags** : Catégories pour organisation et recherche

#### 2. Instructions Principales

Après les métadonnées, écrivez les instructions en markdown :

```markdown
# Nom du Skill

## Objectif

Décrivez clairement ce que fait le Skill et quand l'utiliser.

## Quand Utiliser ce Skill

Listez les situations où ce Skill doit être invoqué :
- Situation 1
- Situation 2
- Situation 3

## Instructions Détaillées

### Étape 1 : Préparation
Décrivez la première étape...

### Étape 2 : Exécution
Décrivez la deuxième étape...

### Étape 3 : Validation
Décrivez comment valider le résultat...

## Outils Disponibles

Si le Skill contient des scripts :
- `scripts/setup.sh` : Description du script
- `scripts/execute.py` : Description du script

## Templates Disponibles

Si le Skill contient des templates :
- `templates/config.yaml` : Description du template

## Exemples

Fournissez des exemples concrets d'utilisation.

## Notes Importantes

Ajoutez des avertissements, limitations ou considérations spéciales.
```

---

## Création d'un Skill

### Processus Étape par Étape

#### Étape 1 : Identifier le Besoin

Posez-vous ces questions :
- Quelle tâche répétitive voulez-vous automatiser ?
- Quelle expertise spécialisée voulez-vous encapsuler ?
- Quel workflow voulez-vous standardiser ?

#### Étape 2 : Concevoir le Skill

Définissez :
- **Nom** : Court, descriptif, en kebab-case
- **Scope** : Frontières claires de ce que fait le Skill
- **Inputs** : Quelles informations le Skill attend
- **Outputs** : Quels résultats le Skill produit
- **Dépendances** : Outils ou ressources nécessaires

#### Étape 3 : Créer la Structure

```bash
mkdir -p .claude/skills/my-new-skill
cd .claude/skills/my-new-skill
touch SKILL.md
```

#### Étape 4 : Rédiger les Instructions

Remplissez SKILL.md avec :
1. Métadonnées claires
2. Description concise de l'objectif
3. Critères d'invocation explicites
4. Instructions pas à pas
5. Exemples d'utilisation

#### Étape 5 : Ajouter des Ressources (si nécessaire)

```bash
mkdir -p scripts templates resources
```

Créez vos scripts, templates et autres ressources.

#### Étape 6 : Tester le Skill

Demandez à Claude d'effectuer une tâche qui devrait déclencher votre Skill et vérifiez :
- Le Skill est-il invoqué automatiquement ?
- Les instructions sont-elles claires ?
- Le résultat est-il conforme aux attentes ?

---

## Bonnes Pratiques

### 1. Nommage et Organisation

- **Noms explicites** : Utilisez des noms qui décrivent clairement la fonction
- **Kebab-case** : `code-reviewer`, `test-generator`, `api-documenter`
- **Un Skill = Une Responsabilité** : Gardez les Skills focalisés sur une tâche
- **Hiérarchie logique** : Organisez les Skills par domaine si nécessaire

### 2. Rédaction des Instructions

- **Clarté avant tout** : Soyez précis et non ambigu
- **Structure hiérarchique** : Utilisez des titres et sous-titres
- **Étapes numérotées** : Pour les processus séquentiels
- **Listes à puces** : Pour les options ou critères
- **Exemples concrets** : Illustrez chaque concept important

### 3. Description pour l'Invocation

La description dans les métadonnées est **cruciale** car c'est elle qui permet à Claude de décider quand utiliser le Skill.

**Mauvaise description :**
```yaml
description: Un outil utile
```

**Bonne description :**
```yaml
description: Analyse le code pour détecter les bugs potentiels, vérifier la conformité aux standards et suggérer des améliorations
```

### 4. Gestion des Dépendances

Si votre Skill nécessite des outils externes :

```markdown
## Prérequis

Ce Skill nécessite les outils suivants :
- Python 3.8+ (pour exécuter les scripts)
- Node.js 16+ (pour les outils de linting)
- Git (pour les opérations de versioning)

Vérifiez la disponibilité avec :
\`\`\`bash
python3 --version
node --version
git --version
\`\`\`
```

### 5. Versioning et Maintenance

- Utilisez le **versioning sémantique** : MAJOR.MINOR.PATCH
- Documentez les changements dans une section CHANGELOG
- Indiquez les **breaking changes** clairement

### 6. Sécurité et Permissions

```markdown
## Considérations de Sécurité

⚠️ Ce Skill nécessite :
- Accès en lecture au système de fichiers
- Exécution de scripts shell
- Connexion réseau pour télécharger des dépendances

Assurez-vous de comprendre ces permissions avant utilisation.
```

---

## Exemples de Skills

### Exemple 1 : Code Reviewer

```markdown
---
name: code-reviewer
description: Examine le code pour détecter les bugs, problèmes de qualité et suggérer des améliorations conformes aux best practices
version: 1.0.0
author: BrainSkills Team
tags: [code-quality, review, best-practices]
---

# Code Reviewer Skill

## Objectif

Effectuer une revue de code approfondie en analysant la qualité, la sécurité, les performances et la maintenabilité.

## Quand Utiliser ce Skill

- Quand l'utilisateur demande une revue de code
- Avant de merger une pull request
- Après avoir écrit une fonctionnalité significative
- Quand des problèmes de qualité sont suspectés

## Instructions Détaillées

### Étape 1 : Analyse Initiale

1. Lire le code fourni ou les fichiers modifiés
2. Identifier le langage de programmation et le contexte
3. Comprendre l'intention du code

### Étape 2 : Vérifications de Qualité

Examiner les aspects suivants :

#### A. Bugs Potentiels
- Conditions de race
- Null pointer exceptions
- Off-by-one errors
- Memory leaks
- Logic errors

#### B. Qualité du Code
- Lisibilité et clarté
- Complexité cyclomatique
- DRY (Don't Repeat Yourself)
- Nommage des variables et fonctions
- Commentaires et documentation

#### C. Performances
- Algorithmes inefficaces (O(n²) évitables)
- Boucles imbriquées excessives
- Opérations coûteuses répétées
- Fuites de mémoire potentielles

#### D. Sécurité
- Injection SQL/XSS/CSRF
- Exposition de données sensibles
- Validation des entrées
- Gestion des erreurs

#### E. Best Practices
- Conformité aux conventions du langage
- Architecture et design patterns
- Gestion des erreurs appropriée
- Tests unitaires présents

### Étape 3 : Génération du Rapport

Produire un rapport structuré :

```markdown
# Code Review Report

## 📊 Résumé

- ✅ Points Positifs : X
- ⚠️ Avertissements : Y
- 🐛 Bugs Critiques : Z

## 🔍 Détails

### Bugs Critiques
1. [Fichier:Ligne] Description du bug et impact
   - Solution suggérée : ...

### Avertissements
1. [Fichier:Ligne] Description du problème
   - Recommandation : ...

### Points Positifs
1. [Aspect] Ce qui est bien fait

## 💡 Suggestions d'Amélioration

1. Suggestion 1 avec exemple de code
2. Suggestion 2 avec exemple de code

## ✅ Conclusion

Évaluation globale et recommandation (approuver/améliorer/retravailler)
```

### Étape 4 : Priorisation

Classer les problèmes par priorité :
- 🔴 **Critique** : Doit être corrigé avant merge
- 🟡 **Important** : Devrait être corrigé rapidement
- 🟢 **Mineur** : Amélioration suggérée

## Exemples

### Exemple d'Utilisation

**Input utilisateur :**
"Peux-tu review cette fonction ?"

**Réponse Claude :**
[Invoque automatiquement code-reviewer et effectue l'analyse complète]

## Notes Importantes

- Ce Skill ne remplace pas les tests automatisés
- Les suggestions sont des recommandations, pas des obligations
- Le contexte métier peut justifier certaines décisions techniques
```

### Exemple 2 : Test Generator

```markdown
---
name: test-generator
description: Génère des tests unitaires et d'intégration complets pour le code existant avec une couverture maximale
version: 1.0.0
author: BrainSkills Team
tags: [testing, unit-tests, quality-assurance]
---

# Test Generator Skill

## Objectif

Générer automatiquement des tests unitaires et d'intégration de haute qualité pour assurer une couverture de code maximale.

## Quand Utiliser ce Skill

- Après avoir écrit une nouvelle fonction ou classe
- Quand l'utilisateur demande explicitement des tests
- Quand la couverture de tests est insuffisante
- Pour du code existant sans tests

## Instructions Détaillées

### Étape 1 : Analyse du Code

1. Lire et comprendre le code à tester
2. Identifier :
   - Le langage et le framework de test approprié
   - Les fonctions/méthodes publiques
   - Les chemins d'exécution possibles
   - Les cas limites (edge cases)
   - Les dépendances et mocks nécessaires

### Étape 2 : Conception des Tests

Pour chaque fonction/méthode, concevoir :

#### Tests du Chemin Heureux (Happy Path)
- Cas d'utilisation normal avec des entrées valides
- Vérifier les sorties attendues

#### Tests des Cas Limites (Edge Cases)
- Valeurs nulles ou undefined
- Chaînes vides
- Tableaux vides
- Valeurs maximales/minimales
- Caractères spéciaux

#### Tests d'Erreurs (Error Cases)
- Entrées invalides
- Exceptions attendues
- Comportement en cas d'échec

### Étape 3 : Génération des Tests

Utiliser le framework de test approprié :

**JavaScript/TypeScript** : Jest, Mocha, Vitest
**Python** : pytest, unittest
**Java** : JUnit, TestNG
**C#** : NUnit, xUnit
**Go** : testing package
**Ruby** : RSpec, Minitest

### Étape 4 : Structure des Tests

```javascript
describe('Nom de la fonction/classe', () => {
  // Setup
  beforeEach(() => {
    // Initialisation commune
  });

  // Happy Path
  describe('Happy Path', () => {
    it('devrait retourner X quand Y', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('devrait gérer une entrée nulle', () => { ... });
    it('devrait gérer un tableau vide', () => { ... });
  });

  // Error Cases
  describe('Error Handling', () => {
    it('devrait lever une exception pour entrée invalide', () => {
      expect(() => functionToTest(invalid)).toThrow(ErrorType);
    });
  });

  // Cleanup
  afterEach(() => {
    // Nettoyage
  });
});
```

### Étape 5 : Tests d'Intégration

Si approprié, générer aussi des tests d'intégration :
- Tests d'API endpoints
- Tests de base de données
- Tests de flux complets

### Étape 6 : Mocking et Stubbing

Générer les mocks nécessaires pour :
- Dépendances externes
- API calls
- Database queries
- File system operations

## Templates Disponibles

Le Skill utilise des templates pour différents frameworks (voir dossier `templates/`)

## Exemples

### Exemple : Fonction Simple

**Code à tester :**
```javascript
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Les arguments doivent être des nombres');
  }
  return a + b;
}
```

**Tests générés :**
```javascript
describe('add', () => {
  describe('Happy Path', () => {
    it('devrait additionner deux nombres positifs', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('devrait additionner deux nombres négatifs', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('devrait additionner zéro', () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('devrait gérer les nombres décimaux', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });

    it('devrait gérer les très grands nombres', () => {
      expect(add(Number.MAX_SAFE_INTEGER, 0))
        .toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Error Handling', () => {
    it('devrait lever une erreur pour un string', () => {
      expect(() => add('2', 3)).toThrow('Les arguments doivent être des nombres');
    });

    it('devrait lever une erreur pour null', () => {
      expect(() => add(null, 3)).toThrow();
    });

    it('devrait lever une erreur pour undefined', () => {
      expect(() => add(undefined, 3)).toThrow();
    });
  });
});
```

## Notes Importantes

- Viser au minimum 80% de couverture de code
- Les tests doivent être indépendants (ordre d'exécution non important)
- Utiliser des noms de tests descriptifs
- Suivre le pattern AAA (Arrange-Act-Assert)
```

### Exemple 3 : API Documenter

```markdown
---
name: api-documenter
description: Génère une documentation API complète au format OpenAPI/Swagger incluant tous les endpoints, paramètres et exemples
version: 1.0.0
author: BrainSkills Team
tags: [documentation, api, openapi, swagger]
---

# API Documenter Skill

## Objectif

Générer une documentation API complète et professionnelle au format OpenAPI 3.0 (Swagger) à partir du code source.

## Quand Utiliser ce Skill

- Quand l'utilisateur demande une documentation API
- Après avoir créé de nouveaux endpoints
- Pour mettre à jour une documentation existante
- Avant de publier une API

## Instructions Détaillées

### Étape 1 : Analyse du Code API

1. Scanner le code pour identifier :
   - Tous les endpoints (GET, POST, PUT, DELETE, PATCH, etc.)
   - Les routes et chemins
   - Les paramètres (query, path, body, headers)
   - Les types de réponses
   - Les codes de statut HTTP
   - L'authentification requise

2. Extraire les informations :
   - Descriptions des endpoints (depuis commentaires ou docstrings)
   - Schémas des objets
   - Exemples de requêtes/réponses

### Étape 2 : Structure OpenAPI

Créer un fichier `openapi.yaml` avec la structure suivante :

```yaml
openapi: 3.0.0
info:
  title: Nom de l'API
  description: Description de l'API
  version: 1.0.0
  contact:
    name: Équipe API
    email: api@example.com
  license:
    name: License Type
    url: https://example.com/license

servers:
  - url: https://api.example.com/v1
    description: Serveur de production
  - url: https://staging-api.example.com/v1
    description: Serveur de staging

paths:
  # Endpoints ici

components:
  schemas:
    # Schémas ici
  securitySchemes:
    # Authentification ici
```

### Étape 3 : Documentation des Endpoints

Pour chaque endpoint, créer une documentation complète :

```yaml
paths:
  /users:
    get:
      summary: Récupérer la liste des utilisateurs
      description: |
        Retourne une liste paginée de tous les utilisateurs.
        Nécessite une authentification Bearer.
      tags:
        - Users
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          description: Numéro de la page (commence à 1)
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          description: Nombre d'éléments par page
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: Liste des utilisateurs récupérée avec succès
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
              examples:
                success:
                  value:
                    data:
                      - id: 1
                        name: "John Doe"
                        email: "john@example.com"
                      - id: 2
                        name: "Jane Smith"
                        email: "jane@example.com"
                    pagination:
                      page: 1
                      limit: 20
                      total: 100
        '401':
          description: Non authentifié
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Erreur serveur
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

### Étape 4 : Schémas et Modèles

Documenter tous les schémas de données :

```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - name
        - email
      properties:
        id:
          type: integer
          format: int64
          description: Identifiant unique de l'utilisateur
          example: 1
        name:
          type: string
          description: Nom complet de l'utilisateur
          minLength: 1
          maxLength: 255
          example: "John Doe"
        email:
          type: string
          format: email
          description: Adresse email de l'utilisateur
          example: "john@example.com"
        createdAt:
          type: string
          format: date-time
          description: Date de création du compte
          example: "2025-01-15T10:30:00Z"

    Error:
      type: object
      properties:
        error:
          type: string
          description: Message d'erreur
        code:
          type: string
          description: Code d'erreur
        details:
          type: object
          description: Détails additionnels sur l'erreur
```

### Étape 5 : Authentification

Documenter les méthodes d'authentification :

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Authentification via JWT token.
        Format: `Authorization: Bearer <token>`
```

### Étape 6 : Génération du README

Créer également un README.md pour accompagner la documentation :

```markdown
# API Documentation

## Getting Started

### Authentication

Tous les endpoints nécessitent une authentification via JWT token.

Obtenez votre token en vous connectant :
\`\`\`bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "your-password"
}
\`\`\`

### Base URL

- Production: `https://api.example.com/v1`
- Staging: `https://staging-api.example.com/v1`

## Quick Examples

### Récupérer les utilisateurs

\`\`\`bash
curl -X GET "https://api.example.com/v1/users" \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Interactive Documentation

Consultez la documentation interactive Swagger UI :
- [Swagger UI](https://api.example.com/docs)

## Rate Limiting

- 1000 requêtes par heure pour les utilisateurs authentifiés
- 100 requêtes par heure pour les utilisateurs non authentifiés

## Support

- Email: api-support@example.com
- Documentation: https://docs.example.com
```

## Ressources

- Templates OpenAPI : `templates/openapi-template.yaml`
- Exemples de schémas : `resources/schemas-examples.yaml`

## Notes Importantes

- Toujours valider le fichier OpenAPI généré avec un validateur
- Inclure des exemples pour chaque endpoint
- Documenter tous les codes d'erreur possibles
- Maintenir la documentation à jour avec le code
```

---

## Gestion et Organisation

### Organisation Multi-Skills

Pour les projets complexes, organisez vos Skills par domaine :

```
.claude/skills/
├── backend/
│   ├── api-documenter/
│   ├── database-migrator/
│   └── error-handler/
├── frontend/
│   ├── component-generator/
│   ├── style-auditor/
│   └── a11y-checker/
├── devops/
│   ├── ci-cd-setup/
│   ├── docker-optimizer/
│   └── monitoring-setup/
└── quality/
    ├── code-reviewer/
    ├── test-generator/
    └── security-auditor/
```

### Skill Dependencies

Un Skill peut référencer d'autres Skills :

```markdown
## Dépendances

Ce Skill utilise :
- `code-reviewer` : Pour vérifier le code généré
- `test-generator` : Pour créer les tests associés

Assurez-vous que ces Skills sont installés.
```

### Skill Marketplace

Partagez vos Skills avec la communauté :

1. **Repository GitHub** : Créez un repo public pour vos Skills
2. **Documentation** : Incluez un README complet
3. **Licensing** : Ajoutez une licence (MIT, Apache, etc.)
4. **Versioning** : Utilisez git tags pour les versions

---

## Patterns Avancés

### Pattern 1 : Skill Composite

Un Skill qui orchestre plusieurs autres Skills :

```markdown
---
name: full-feature-pipeline
description: Pipeline complet pour développer une fonctionnalité : code, tests, docs, review
version: 1.0.0
---

# Full Feature Pipeline

## Instructions

### Étape 1 : Développement
Implémenter la fonctionnalité demandée.

### Étape 2 : Tests
Invoquer `test-generator` pour créer les tests.

### Étape 3 : Documentation
Invoquer `api-documenter` si c'est une API, sinon `code-documenter`.

### Étape 4 : Review
Invoquer `code-reviewer` pour vérifier la qualité.

### Étape 5 : Rapport
Générer un rapport consolidé de toutes les étapes.
```

### Pattern 2 : Skill avec Configuration

Utiliser un fichier de configuration pour personnaliser le comportement :

```markdown
## Configuration

Ce Skill utilise le fichier `.claude/skills/code-reviewer/config.yaml` :

\`\`\`yaml
severity_levels:
  critical: true
  warning: true
  info: false

rules:
  - no-console-log
  - no-unused-vars
  - max-complexity: 10

languages:
  - javascript
  - typescript
  - python
\`\`\`

Si le fichier n'existe pas, les valeurs par défaut sont utilisées.
```

### Pattern 3 : Skill avec Hooks

Définir des points d'extension pour personnalisation :

```markdown
## Hooks

Ce Skill supporte les hooks suivants :

### Pre-execution Hook
Exécuté avant le traitement principal.
Fichier : `scripts/pre-hook.sh`

### Post-execution Hook
Exécuté après le traitement principal.
Fichier : `scripts/post-hook.sh`

### On-error Hook
Exécuté en cas d'erreur.
Fichier : `scripts/error-hook.sh`

Créez ces fichiers pour personnaliser le comportement.
```

### Pattern 4 : Skill Contextuel

Un Skill qui s'adapte au contexte du projet :

```markdown
## Détection du Contexte

Ce Skill détecte automatiquement :

1. **Langage de programmation** (via extensions de fichiers)
2. **Framework utilisé** (via package.json, requirements.txt, etc.)
3. **Structure du projet** (via présence de dossiers clés)
4. **Conventions de code** (via .editorconfig, .eslintrc, etc.)

Et adapte son comportement en conséquence.
```

### Pattern 5 : Skill Interactif

Un Skill qui peut demander des clarifications :

```markdown
## Mode Interactif

Si des informations sont manquantes, ce Skill peut demander :

1. "Quel framework de test préférez-vous ?"
2. "Voulez-vous inclure les tests d'intégration ?"
3. "Niveau de verbosité souhaité ?"

Répondez à ces questions pour personnaliser l'exécution.
```

---

## Référence Technique

### Métadonnées Complètes

Toutes les métadonnées supportées dans le front matter :

```yaml
---
# Obligatoire
name: skill-name
description: Description courte

# Recommandé
version: 1.0.0
author: Your Name
tags: [tag1, tag2]

# Optionnel
license: MIT
repository: https://github.com/user/repo
homepage: https://skill-homepage.com
keywords: [keyword1, keyword2]
dependencies:
  - other-skill-1
  - other-skill-2
requirements:
  - python >= 3.8
  - node >= 16
category: development
language: en
created: 2025-10-24
updated: 2025-10-24
---
```

### Variables d'Environnement

Les Skills peuvent utiliser des variables d'environnement :

```markdown
## Variables d'Environnement

Ce Skill utilise les variables suivantes :

- `SKILL_CONFIG_PATH` : Chemin vers le fichier de configuration
- `SKILL_DEBUG` : Activer le mode debug (true/false)
- `SKILL_OUTPUT_FORMAT` : Format de sortie (json/yaml/text)

Définissez-les dans votre environnement ou fichier `.env`.
```

### Structure des Scripts

Convention pour les scripts accompagnant un Skill :

```bash
#!/usr/bin/env bash
# scripts/example-script.sh

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

# Fonction principale
main() {
    echo "Exécution du script..."
    # Logique ici
}

# Point d'entrée
main "$@"
```

### Templates Dynamiques

Utiliser des placeholders dans les templates :

```markdown
# {{PROJECT_NAME}}

## Description

{{PROJECT_DESCRIPTION}}

## Installation

\`\`\`bash
{{INSTALL_COMMAND}}
\`\`\`

## Usage

\`\`\`{{LANGUAGE}}
{{USAGE_EXAMPLE}}
\`\`\`
```

Le Skill remplace les placeholders lors de la génération.

### Logging et Debugging

Convention pour le logging dans les Skills :

```markdown
## Logging

Les logs sont écrits dans `.claude/skills/logs/{{skill-name}}.log`

Niveaux de log :
- DEBUG : Informations détaillées
- INFO : Informations générales
- WARNING : Avertissements
- ERROR : Erreurs
- CRITICAL : Erreurs critiques

Activez le mode debug avec :
\`\`\`bash
export SKILL_DEBUG=true
\`\`\`
```

---

## Annexes

### Checklist de Création d'un Skill

- [ ] Nom clair et descriptif (kebab-case)
- [ ] Description concise et précise
- [ ] Métadonnées complètes (name, description, version, author, tags)
- [ ] Objectif clairement défini
- [ ] Critères d'invocation explicites
- [ ] Instructions pas à pas détaillées
- [ ] Exemples concrets d'utilisation
- [ ] Gestion des erreurs et cas limites
- [ ] Documentation des dépendances
- [ ] Scripts testés (si applicable)
- [ ] Templates validés (si applicable)
- [ ] Fichier README pour le Skill
- [ ] Licensing approprié

### Ressources Externes

#### Documentation Officielle
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Skills Repository](https://github.com/anthropics/skills)

#### Communauté
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Skills Marketplace](https://github.com/anthropics/skills)

#### Outils
- [YAML Validator](https://www.yamllint.com/)
- [Markdown Linter](https://github.com/DavidAnson/markdownlint)

### Glossaire

- **Skill** : Capacité modulaire et réutilisable pour Claude Code
- **SKILL.md** : Fichier principal contenant les instructions du Skill
- **Invocation** : Activation automatique d'un Skill par Claude
- **Front Matter** : Métadonnées YAML en début de fichier markdown
- **Template** : Modèle de fichier réutilisable
- **Hook** : Point d'extension pour personnalisation
- **Composite Skill** : Skill orchestrant d'autres Skills

---

## Conclusion

Les **Skills** sont un outil puissant pour étendre les capacités de Claude Code de manière modulaire et réutilisable. En suivant les bonnes pratiques de cette documentation, vous pouvez créer des Skills de haute qualité qui automatisent vos workflows, standardisent vos processus et partagent votre expertise avec la communauté.

**Principes Clés à Retenir :**

1. **Clarté** : Des instructions claires = meilleure exécution
2. **Modularité** : Un Skill = Une responsabilité
3. **Autonomie** : Claude décide quand utiliser les Skills
4. **Évolutivité** : Facile d'ajouter de nouvelles capacités
5. **Collaboration** : Partagez vos Skills avec la communauté

---

**Document Version** : 1.0.0
**Date de Création** : 24 octobre 2025
**Auteur** : BrainSkills Team
**License** : CC BY 4.0
