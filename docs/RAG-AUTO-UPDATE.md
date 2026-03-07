# 🔄 RAG Auto-Update System

**Production-grade automatic documentation update system for n8n workflows**

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Composants](#composants)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

Le système de mise à jour automatique du RAG détecte les changements dans la documentation n8n et met à jour le RAG de manière intelligente sans intervention manuelle.

### **Caractéristiques**

✅ **Détection instantanée** des releases n8n via GitHub Webhooks
✅ **Diff intelligent** : scrape seulement les fichiers modifiés
✅ **Versioning** : historique complet des mises à jour
✅ **Notifications** : Slack/Discord/webhook personnalisé
✅ **Monitoring** : Dashboard temps réel
✅ **Rollback automatique** en cas d'échec
✅ **Zero-downtime** : update sans interruption de service

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub n8n/n8n-docs                       │
│                    (source of truth)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Release event
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Webhook Handler                         │
│  • Détecte les releases                                     │
│  • Parse les release notes                                  │
│  • Extrait nouveaux nodes                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Trigger update
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             RAG Version Manager                             │
│  • Check commit SHA                                         │
│  • Détecte les changements                                  │
│  • Compare versions                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ If changes detected
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Update RAG Docs Script                             │
│  1. Backup current docs                                     │
│  2. Fetch new docs (GitHub API)                             │
│  3. Index to Qdrant                                         │
│  4. Save new version                                        │
│  5. Cleanup old backups                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Success/Failure
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Notification System                              │
│  • Slack/Discord/webhook                                    │
│  • Detailed release notes                                   │
│  • New/updated nodes list                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Composants

### **1. GitHub Webhook Handler**

**Fichier** : `middleware/github-webhook.js`

**Rôle** : Écoute les releases GitHub et déclenche les mises à jour

**Features** :
- Vérification de signature HMAC
- Parsing intelligent des release notes
- Extraction automatique des nouveaux nodes
- Déclenchement async des mises à jour

### **2. RAG Version Manager**

**Fichier** : `services/rag-version-manager.js`

**Rôle** : Gère les versions et détecte les changements

**Features** :
- Compare commits SHA
- Détecte fichiers modifiés (diff)
- Versioning automatique (YYYY.MM.DD.HHMM)
- Historique dans Redis + fichier JSON

### **3. Update Scripts**

**Fichiers** :
- `scripts/update-rag-docs.sh` : Script principal
- `scripts/check-rag-updates.js` : Check si update nécessaire
- `scripts/save-rag-version.js` : Sauvegarde version

**Rôle** : Orchestration de la mise à jour

---

## ⚙️ Configuration

### **1. Variables d'environnement**

Ajouter dans `.env` :

```bash
# GitHub Webhook (optionnel mais recommandé)
GITHUB_WEBHOOK_SECRET=your-secret-here

# Notifications (optionnel)
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Redis (pour versioning)
REDIS_HOST=localhost
REDIS_PORT=6379

# Qdrant
QDRANT_URL=http://localhost:6333
```

### **2. Configurer le GitHub Webhook**

#### **Étape 1** : Créer le webhook sur GitHub

1. Aller sur https://github.com/n8n-io/n8n/settings/hooks
2. Cliquer **Add webhook**
3. Remplir :
   ```
   Payload URL: https://your-domain.example.com/api/github-webhook
   Content type: application/json
   Secret: [votre secret GITHUB_WEBHOOK_SECRET]
   Events: ☑️ Releases only
   ```
4. Cliquer **Add webhook**

#### **Étape 2** : Tester le webhook

```bash
# Simuler un event release
curl -X POST http://localhost:3002/api/github-webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: release" \
  -d '{
    "action": "published",
    "release": {
      "tag_name": "v1.60.0",
      "name": "1.60.0",
      "body": "## New Nodes\n- MongoDB\n- Anthropic\n\n## Improvements\n- Enhanced OpenAI node",
      "html_url": "https://github.com/n8n-io/n8n/releases/tag/v1.60.0",
      "published_at": "2025-10-10T12:00:00Z"
    },
    "repository": {
      "full_name": "n8n-io/n8n"
    }
  }'
```

### **3. Configurer Slack/Discord (optionnel)**

#### **Slack** :

1. Créer un Incoming Webhook : https://api.slack.com/messaging/webhooks
2. Copier l'URL dans `.env` :
   ```bash
   NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
   ```

#### **Discord** :

1. Créer un webhook Discord
2. Ajouter `/slack` à l'URL Discord (compatible Slack format)
3. Copier dans `.env` :
   ```bash
   NOTIFICATION_WEBHOOK_URL=https://discord.com/api/webhooks/XXX/YYY/slack
   ```

### **4. Configurer le cron (fallback)**

Le cron est un backup au cas où le webhook ne fonctionne pas :

```bash
# Éditer crontab
crontab -e

# Ajouter (tous les 15 jours à 2h du matin)
0 2 */15 * * /opt/synoptia-builder/scripts/update-rag-docs.sh >> /opt/synoptia-builder/logs/cron-rag-update.log 2>&1
```

---

## 🚀 Usage

### **Mise à jour manuelle**

```bash
# Check si update nécessaire
node scripts/check-rag-updates.js

# Forcer la mise à jour
./scripts/update-rag-docs.sh

# Sauvegarder la version actuelle
node scripts/save-rag-version.js
```

### **Via API**

```bash
# Check updates
curl http://localhost:3002/api/rag/check-updates -X POST

# Get status
curl http://localhost:3002/api/rag/status

# Trigger via webhook (simulé)
curl -X POST http://localhost:3002/api/github-webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: release" \
  -d @webhook-payload.json
```

---

## 📡 API Endpoints

### **GET /api/rag/status**

Retourne le statut du RAG et les versions.

**Response** :
```json
{
  "success": true,
  "current": {
    "version": "2025.10.10.1118",
    "commit": "a3f7e9d",
    "date": "2025-10-10T11:18:44.782Z",
    "savedAt": "2025-10-10T11:26:13.000Z"
  },
  "latest": {
    "commit": "a3f7e9d",
    "date": "2025-10-10T11:18:44.782Z",
    "message": "Add MongoDB node documentation"
  },
  "stats": {
    "localDocs": 709,
    "qdrantVectors": 2675,
    "upToDate": true
  }
}
```

### **POST /api/rag/check-updates**

Vérifie si une mise à jour est disponible.

**Response** :
```json
{
  "success": true,
  "updateNeeded": false,
  "reason": "up_to_date",
  "latestCommit": {
    "sha": "a3f7e9d...",
    "date": "2025-10-10T11:18:44.782Z",
    "message": "Update docs"
  }
}
```

### **POST /api/github-webhook**

Endpoint pour le webhook GitHub (usage interne).

**Headers** :
- `X-GitHub-Event`: `release`
- `X-Hub-Signature-256`: HMAC signature

---

## 📊 Monitoring

### **Dashboard temps réel**

```bash
# Voir le statut
curl http://localhost:3002/api/rag/status | jq

# Logs en temps réel
tail -f logs/rag-update-*.log

# Voir l'historique des versions
cat data/rag-version.json
```

### **Métriques clés**

| Métrique | Description | Valeur normale |
|----------|-------------|----------------|
| `upToDate` | RAG à jour ? | `true` |
| `localDocs` | Nombre de docs | ~700-800 |
| `qdrantVectors` | Vecteurs indexés | ~2500-3000 |
| `ageInDays` | Âge dernière update | < 15 jours |

### **Notifications Slack**

Exemple de notification reçue :

```
🚀 n8n v1.60.0 Released - RAG Updated

✅ RAG documentation updated automatically

✨ New Nodes (3):
  • MongoDB
  • Anthropic Chat
  • Stripe v2

📝 Updated Nodes (12):
  • OpenAI
  • Google Sheets
  • Slack
  [...]

🔗 View Release Notes
```

---

## 🐛 Troubleshooting

### **Le webhook ne se déclenche pas**

```bash
# 1. Vérifier les logs
tail -f logs/rag-update-*.log

# 2. Tester manuellement
curl -X POST http://localhost:3002/api/github-webhook -H "X-GitHub-Event: ping"

# 3. Vérifier sur GitHub
# Settings > Webhooks > Recent Deliveries
# Voir si GitHub a bien envoyé l'event
```

### **Update échoue**

```bash
# Vérifier les logs détaillés
cat logs/rag-update-YYYYMMDD-HHMMSS.log

# Restaurer le backup
cp -r data/n8n-docs-backup-YYYYMMDD data/n8n-docs

# Relancer manuellement
./scripts/update-rag-docs.sh
```

### **Version non sauvegardée**

```bash
# Sauvegarder manuellement
node scripts/save-rag-version.js

# Vérifier Redis
redis-cli
> GET rag:last_commit_sha
> EXIT
```

### **Qdrant inaccessible**

```bash
# Vérifier Qdrant
curl http://localhost:6333/collections/synoptia_knowledge

# Redémarrer Qdrant
docker restart qdrant  # ou selon votre setup
```

---

## 📈 Best Practices

### **Production**

1. ✅ **Toujours configurer** le webhook GitHub
2. ✅ **Toujours configurer** les notifications
3. ✅ **Garder le cron** comme backup
4. ✅ **Monitorer** les logs régulièrement
5. ✅ **Tester** le webhook après setup

### **Développement**

1. ✅ Utiliser `check-rag-updates.js` avant de scraper
2. ✅ Ne pas commit le fichier `data/rag-version.json`
3. ✅ Utiliser `.env.example` pour la doc

---

## 🔐 Sécurité

### **GitHub Webhook Secret**

- ⚠️ **TOUJOURS** définir `GITHUB_WEBHOOK_SECRET`
- ⚠️ **NE JAMAIS** commit ce secret
- ✅ Utiliser un secret fort (généré aléatoirement)

```bash
# Générer un secret sécurisé
openssl rand -hex 32
```

### **Notifications Webhook**

- Les webhooks Slack/Discord sont **authentifiés par l'URL secrète**
- Garder `NOTIFICATION_WEBHOOK_URL` **confidentielle**

---

## 📝 Changelog

### **v2.0.0** (2025-10-10)

- ✨ GitHub Webhook pour updates instantanées
- ✨ Diff intelligent (compare commits)
- ✨ Système de versioning complet
- ✨ Notifications automatiques
- ✨ Dashboard API
- ♻️ Refonte complète du système d'update

### **v1.0.0** (2025-09-25)

- ✅ Système de base avec cron

---

## 🤝 Contribution

Pour améliorer ce système :

1. Fork le repo
2. Créer une branche feature
3. Tester localement
4. Ouvrir une PR avec description détaillée

---

## 📞 Support

- **GitHub Issues** : [Synoptia Issues](https://github.com/ludovicsanchez38-creator/Synoptia/issues)
- **Documentation** : Ce fichier
- **Contact** : syn@synoptia.fr

---

**Powered by Synoptia** 🚀
