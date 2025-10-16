# 🚀 INSTALLATION SERVICE SYSTEMD

Guide rapide pour installer le Workflow Builder comme service systemd.

---

## ✅ PRÉREQUIS

```bash
# Vérifier Node.js installé
node --version  # v20.16.0 minimum

# Vérifier que le projet fonctionne
cd /home/ludo/synoptia-workflow-builder
npm install
./start.sh dev  # Tester en dev

# Ctrl+C pour arrêter
```

---

## 📦 INSTALLATION

### **Étape 1 : Arrêter le process manuel**

```bash
# Trouver et tuer les processus node existants
lsof -ti :3002 | xargs -r kill -9

# Vérifier que le port est libre
lsof -i :3002  # Devrait être vide
```

### **Étape 2 : Installer le service systemd**

```bash
# Copier le fichier service
sudo cp /tmp/workflow-builder.service /etc/systemd/system/

# Recharger systemd
sudo systemctl daemon-reload

# Activer le service (démarrage auto au boot)
sudo systemctl enable workflow-builder

# Démarrer le service
sudo systemctl start workflow-builder
```

### **Étape 3 : Vérifier le statut**

```bash
# Status du service
sudo systemctl status workflow-builder

# Devrait afficher :
# ● workflow-builder.service - Synoptia Workflow Builder
#    Loaded: loaded (/etc/systemd/system/workflow-builder.service)
#    Active: active (running) since ...
#    Main PID: XXXXX
```

### **Étape 4 : Vérifier que ça fonctionne**

```bash
# Test health endpoint
curl http://localhost:3002/health

# Devrait retourner :
{
  "status": "ok",
  "service": "workflow-builder",
  "uptime": 10.5,
  "memory": { "heapUsed": "32 MB" },
  "services": {
    "conversationManager": "ok",
    "templateManager": "ok",
    "feedbackCollector": "ok",
    "n8nApi": "ok"
  }
}
```

---

## 🛠️ COMMANDES UTILES

### **Gestion du service**

```bash
# Démarrer
sudo systemctl start workflow-builder

# Arrêter
sudo systemctl stop workflow-builder

# Redémarrer
sudo systemctl restart workflow-builder

# Recharger (après modification .env)
sudo systemctl reload workflow-builder

# Status
sudo systemctl status workflow-builder

# Désactiver (ne démarre plus au boot)
sudo systemctl disable workflow-builder
```

### **Logs**

```bash
# Voir les logs en temps réel
sudo journalctl -u workflow-builder -f

# Voir les 100 dernières lignes
sudo journalctl -u workflow-builder -n 100

# Logs depuis aujourd'hui
sudo journalctl -u workflow-builder --since today

# Logs des erreurs uniquement
sudo journalctl -u workflow-builder -p err
```

### **Monitoring**

```bash
# CPU et mémoire
systemctl status workflow-builder | grep Memory

# Nombre de restarts
systemctl show workflow-builder | grep NRestarts

# Temps actif (uptime)
systemctl show workflow-builder | grep ActiveEnterTimestamp
```

---

## 🔧 CONFIGURATION

### **Modifier la configuration**

```bash
# Éditer le fichier service
sudo nano /etc/systemd/system/workflow-builder.service

# Après modification, recharger
sudo systemctl daemon-reload
sudo systemctl restart workflow-builder
```

### **Modifier les variables d'environnement**

```bash
# Éditer .env
nano /home/ludo/synoptia-workflow-builder/.env

# Redémarrer le service
sudo systemctl restart workflow-builder
```

### **Changer le port**

```bash
# Option 1 : Modifier .env
echo "PORT=3003" >> .env
sudo systemctl restart workflow-builder

# Option 2 : Override systemd
sudo systemctl edit workflow-builder
# Ajouter :
[Service]
Environment="PORT=3003"

# Recharger
sudo systemctl daemon-reload
sudo systemctl restart workflow-builder
```

---

## 🐛 DÉPANNAGE

### **Le service ne démarre pas**

```bash
# Voir les erreurs détaillées
sudo journalctl -u workflow-builder -n 50 --no-pager

# Vérifier les permissions .env
ls -l /home/ludo/synoptia-workflow-builder/.env
# Devrait être : -rw------- 1 ludo ludo

# Tester manuellement
cd /home/ludo/synoptia-workflow-builder
sudo -u ludo node server.js
```

### **Port déjà utilisé**

```bash
# Trouver qui utilise le port 3002
sudo lsof -i :3002

# Tuer le process
sudo lsof -ti :3002 | xargs -r kill -9

# Redémarrer le service
sudo systemctl restart workflow-builder
```

### **Erreurs de mémoire**

```bash
# Augmenter la limite mémoire
sudo systemctl edit workflow-builder

# Ajouter :
[Service]
MemoryLimit=1G

# Recharger
sudo systemctl daemon-reload
sudo systemctl restart workflow-builder
```

### **Service crashe après quelques minutes**

```bash
# Vérifier les logs
sudo journalctl -u workflow-builder --since "10 minutes ago"

# Vérifier la mémoire
systemctl status workflow-builder | grep Memory

# Vérifier les erreurs node
tail -f /home/ludo/synoptia-workflow-builder/logs/errors-*.log
```

---

## 🔒 SÉCURITÉ

### **Permissions correctes**

```bash
# .env doit être 600 (owner uniquement)
chmod 600 /home/ludo/synoptia-workflow-builder/.env

# Logs accessibles uniquement par ludo
chmod 700 /home/ludo/synoptia-workflow-builder/logs

# Service tourne sous user 'ludo' (non-root)
systemctl show workflow-builder | grep User
# User=ludo
```

### **Firewall**

```bash
# Si vous voulez exposer publiquement (déconseillé)
sudo ufw allow 3002/tcp

# Recommandé : Utiliser reverse proxy (Caddy/Nginx)
# Le workflow builder écoute uniquement sur localhost
```

---

## 📊 MONITORING PRODUCTION

### **Health check automatique**

```bash
# Créer un script de monitoring
cat > /home/ludo/check-workflow-builder.sh << 'EOF'
#!/bin/bash
HEALTH=$(curl -s http://localhost:3002/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "Workflow Builder DOWN!"
  sudo systemctl restart workflow-builder
fi
EOF

chmod +x /home/ludo/check-workflow-builder.sh

# Ajouter à crontab (check toutes les 5 min)
crontab -e
# Ajouter :
*/5 * * * * /home/ludo/check-workflow-builder.sh
```

### **Alertes par email**

```bash
# Installer alerting
sudo apt install mailutils

# Créer script d'alerte
cat > /home/ludo/alert-workflow-builder.sh << 'EOF'
#!/bin/bash
STATUS=$(systemctl is-active workflow-builder)
if [ "$STATUS" != "active" ]; then
  echo "Workflow Builder est DOWN!" | mail -s "Alert Workflow Builder" ludo@synoptia.fr
fi
EOF

chmod +x /home/ludo/alert-workflow-builder.sh

# Ajouter à crontab
*/10 * * * * /home/ludo/alert-workflow-builder.sh
```

---

## ✅ CHECKLIST POST-INSTALLATION

- [ ] Service démarre : `sudo systemctl status workflow-builder`
- [ ] Health check OK : `curl http://localhost:3002/health`
- [ ] Stats endpoint OK : `curl http://localhost:3002/api/stats`
- [ ] Logs accessibles : `sudo journalctl -u workflow-builder -n 10`
- [ ] Auto-start activé : `systemctl is-enabled workflow-builder`
- [ ] Permissions .env : `ls -l .env` → `-rw------- ludo ludo`
- [ ] Pas de vulnérabilités : `npm audit`
- [ ] Service reboot-safe : `sudo reboot` puis vérifier

---

## 📞 SUPPORT

Si problème persistant :

1. Consulter les logs : `sudo journalctl -u workflow-builder -n 100`
2. Vérifier la doc : `cat CORRECTIONS_OCTOBRE_2025.md`
3. Tester manuellement : `./start.sh dev`
4. Contact : ludo@synoptia.fr

---

**Installation réalisée : 7 octobre 2025**
**Version service : 1.0.0**
**Guide maintenu par : Claude (Anthropic)**
