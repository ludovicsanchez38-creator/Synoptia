# 🔒 Security Policy

## Supported Versions

Nous maintenons activement les versions suivantes :

| Version | Support          |
| ------- | ---------------- |
| 1.x.x   | ✅ Supportée     |
| < 1.0   | ❌ Non supportée |

---

## 🛡️ Reporting a Vulnerability

La sécurité de Synoptia Workflow Builder est une priorité. Si vous découvrez une vulnérabilité, **ne créez pas d'issue publique**.

### Comment reporter

**Option 1 : Email (Préféré)**
- 📧 Envoyez un email à : **syn@synoptia.fr**
- Sujet : `[SECURITY] Brief description`

**Option 2 : GitHub Security Advisory**
- Utilisez [GitHub Private Security Reporting](../../security/advisories/new)

### Informations à inclure

Pour nous aider à résoudre rapidement :

```markdown
**Type de vulnérabilité**
[XSS / Injection / Auth bypass / etc.]

**Description**
Description claire de la vulnérabilité

**Impact**
Quel est l'impact potentiel ?

**Reproduction**
Steps pour reproduire :
1. ...
2. ...
3. ...

**Environnement**
- Version : [1.0.0]
- OS : [Ubuntu 22.04]
- Node.js : [18.17.0]

**Preuve de concept**
```bash
# Code ou commandes pour démontrer
```

**Suggestions de fix**
Si vous avez des idées
```

---

## ⏱️ Délai de réponse

| Étape | Délai |
|-------|-------|
| 📨 Accusé de réception | 48 heures |
| 🔍 Évaluation initiale | 7 jours |
| 🛠️ Fix et patch | 14-30 jours (selon criticité) |
| 📢 Disclosure publique | Après fix + 7 jours |

---

## 🏆 Responsible Disclosure

Nous suivons les principes de **Responsible Disclosure** :

1. ✅ **Reporter** découvre et reporte en privé
2. ✅ **Nous** confirmons et développons un fix
3. ✅ **Coordination** sur la date de disclosure
4. ✅ **Publication** du fix et advisory
5. ✅ **Crédit** au reporter (si souhaité)

---

## 🎖️ Hall of Fame

Les chercheurs en sécurité qui ont contribué :

*Aucune vulnérabilité reportée pour le moment*

---

## 🔐 Security Best Practices

### Pour les utilisateurs

**1. Protection des secrets**
```bash
# ❌ JAMAIS
git add .env

# ✅ TOUJOURS
echo ".env" >> .gitignore
```

**2. Clés API**
- Utilisez des variables d'environnement
- Ne les committez JAMAIS
- Régénérez-les si exposées

**3. Mises à jour**
```bash
# Vérifiez les mises à jour de sécurité
npm audit
npm audit fix
```

**4. Réseau**
- Utilisez HTTPS en production
- Activez les firewalls
- Limitez les accès réseau

### Pour les contributeurs

**1. Code reviews**
- Toutes les PRs sont reviewées
- Focus sur la sécurité

**2. Dependencies**
```bash
# Vérifiez avant de commit
npm audit

# Pas de dépendances non vérifiées
```

**3. Validation des inputs**
```javascript
// ✅ TOUJOURS valider
const { error, value } = schema.validate(input);

// ❌ JAMAIS faire confiance aux inputs
eval(userInput); // NON !
```

---

## 🚨 Vulnérabilités connues

### Actuelles
Aucune vulnérabilité connue

### Historique
Aucun historique

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

## 📞 Contact

- **Email sécurité** : syn@synoptia.fr
- **GitHub Security** : [Private Reporting](../../security/advisories/new)

---

**Merci de nous aider à garder Synoptia sécurisé ! 🙏**
