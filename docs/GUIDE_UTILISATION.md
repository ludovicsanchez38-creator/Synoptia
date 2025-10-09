# 📖 Guide d'Utilisation - Synoptia Workflow Builder

## 🎯 Pour qui est ce guide ?

Tu es Ludo, fondateur de Synoptia, et tu veux utiliser cet agent pour transformer des idées en workflows n8n automatiquement. Ce guide t'explique tout comme si tu avais 5 ans ! 👶

## 🚀 Démarrage en 3 étapes

### Étape 1 : Installer
```bash
cd synoptia-workflow-builder
npm install
```

### Étape 2 : Configurer
```bash
cp .env.example .env
# Édite .env avec tes vraies clés
```

### Étape 3 : Lancer
```bash
npm start
# Va sur http://localhost:3000
```

C'est tout ! 🎉

## 💬 Comment parler à l'agent ?

### ✅ Bonnes façons de demander

**Pour un email automatique :**
- *"Je veux envoyer un email tous les lundis à 9h"*
- *"Envoie-moi un rappel par email chaque jour"*
- *"Email automatique pour mes clients le vendredi"*

**Pour traiter des données :**
- *"Traite les fichiers de mon dossier automatiquement"*
- *"Synchronise mes données CRM avec Google Sheets"*
- *"Importe les nouvelles commandes toutes les heures"*

**Pour des notifications :**
- *"Notifie-moi quand quelqu'un remplit mon formulaire"*
- *"Alerte SMS si mon site web tombe en panne"*
- *"Push notification pour les nouvelles ventes"*

### ❌ Évite ces formulations

- ❌ *"Crée-moi un truc"* (trop vague)
- ❌ *"Fais de la magie"* (pas assez précis)
- ❌ *"Comme l'autre fois"* (l'agent n'a pas de mémoire)

## 🎨 Interface utilisateur

### Page principale
1. **Zone de texte** : Écris ton idée ici
2. **Cases à cocher** : Active/désactive le déploiement auto
3. **Bouton magique** : Lance la création
4. **Zone de résultat** : Vois ce qui s'est passé

### Exemples intégrés
Clique sur les petites pastilles grises pour remplir automatiquement avec des exemples !

## 🔧 Utilisation de l'API

### Créer un workflow via code
```javascript
const response = await fetch('http://localhost:3000/api/create-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        request: "Je veux envoyer un email quotidien",
        autoExecute: true
    })
});

const result = await response.json();
console.log(result.message); // Message pour l'utilisateur
```

### Intégrer dans tes autres outils
```bash
# Via curl
curl -X POST http://localhost:3000/api/create-workflow \
  -H "Content-Type: application/json" \
  -d '{"request": "ton idée ici", "autoExecute": true}'
```

## 🎯 Cas d'usage typiques Synoptia

### 1. Automatisation des emails clients
**Demande :** *"Envoie un email de bienvenue à chaque nouveau client"*

**Ce que fait l'agent :**
1. Crée un trigger webhook
2. Ajoute un nœud d'envoi d'email
3. Configure les paramètres de base
4. Déploie dans ton n8n

### 2. Sync des données
**Demande :** *"Synchronise les leads de mon site avec mon CRM toutes les heures"*

**Ce que fait l'agent :**
1. Trigger de planning (toutes les heures)
2. Récupération des données via API
3. Traitement et formatage
4. Envoi vers le CRM

### 3. Monitoring et alertes
**Demande :** *"Notifie-moi par SMS si mon serveur ne répond plus"*

**Ce que fait l'agent :**
1. Trigger de monitoring
2. Test de la disponibilité
3. Condition d'alerte
4. Envoi SMS

## 🛠 Personnalisation avancée

### Modifier les templates
Édite `src/workflow-generator.js` pour ajouter tes propres templates de nœuds.

### Ajouter des intégrations
```javascript
// Dans workflow-generator.js
this.nodeTemplates.ton_service = {
    id: 'ton-service',
    name: 'Ton Service',
    type: 'n8n-nodes-base.httpRequest',
    // ... configuration
};
```

### Personnaliser l'IA
Modifie le prompt dans `src/mcp-server.js` fonction `analyzeRequest()` :

```javascript
const prompt = `
Tu es un expert Synoptia en automatisation n8n.
[Ajoute tes instructions spécifiques ici]
`;
```

## 🐛 Dépannage courant

### Problème : L'agent ne comprend pas ma demande
**Solution :** Sois plus spécifique
- ❌ *"Automatise les trucs"*
- ✅ *"Envoie un email quotidien à mes clients"*

### Problème : Le workflow n'est pas déployé
**Solutions :**
1. Vérifie tes credentials n8n dans `.env`
2. Teste la connexion : `curl https://n8n.synoptia.fr/api/v1/workflows`
3. Désactive le déploiement auto et importe manuellement

### Problème : Erreur OpenAI
**Solutions :**
1. Vérifie ta clé API OpenAI
2. Assure-toi d'avoir du crédit
3. Teste avec : `curl -H "Authorization: Bearer ta-clé" https://api.openai.com/v1/models`

## 📊 Monitoring et logs

### Voir ce qui se passe
```bash
npm start
# Les logs s'affichent en temps réel
```

### Debug mode
```bash
DEBUG=* npm start
# Plus de détails
```

### Logs des workflows créés
Regarde dans les logs pour :
- ✅ Workflow créé avec l'ID: abc123
- 🔗 URL du workflow
- ❌ Erreurs éventuelles

## 🚀 Optimisations Synoptia

### 1. Utilise des demandes structurées
Au lieu de : *"Fais quelque chose avec les emails"*
Dis : *"Envoie un email de bienvenue 24h après chaque inscription"*

### 2. Teste d'abord
- Commence par des workflows simples
- Vérifie qu'ils fonctionnent
- Puis complexifie progressivement

### 3. Standardise tes demandes
Crée tes propres templates de demandes pour les cas récurrents :
- Email marketing : *"Campagne email [FREQUENCE] pour [SEGMENT]"*
- Data sync : *"Sync [SOURCE] vers [DESTINATION] toutes les [FREQUENCE]"*

## 💡 Conseils de pro

### Pour Synoptia spécifiquement

1. **Nomme tes workflows** avec un préfixe Synoptia
2. **Utilise des tags** pour organiser (client, interne, test)
3. **Documente** tes workflows complexes
4. **Teste** avant de mettre en production

### Intégration dans ton workflow quotidien

1. **Matin** : Crée les workflows de la journée
2. **Midi** : Vérifie que tout fonctionne
3. **Soir** : Optimise et améliore

## 📞 Aide et support

### Si tu es bloqué
1. **Logs** : Regarde les messages d'erreur
2. **Tests** : Lance `npm test`
3. **n8n** : Vérifie directement dans l'interface
4. **Contacts** : ludo@synoptia.fr

### Améliorations futures
- Templates sectoriels (e-commerce, SaaS, etc.)
- Import de workflows existants
- IA plus fine pour Synoptia

---

*Fait avec ❤️ pour que tu automatises tout Synoptia sans effort !*