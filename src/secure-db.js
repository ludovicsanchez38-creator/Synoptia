/**
 * Base de données sécurisée pour les codes SAV
 * Utilise SQLite avec chiffrement AES-256 pour les données sensibles
 */

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const path = require('path');
const fs = require('fs');

class SecureSAVDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'sav-codes.db');
        this.encryptionKey = this.getOrCreateEncryptionKey();
        this.db = null;
        this.initializeDatabase();
    }

    /**
     * Génère ou récupère la clé de chiffrement
     */
    getOrCreateEncryptionKey() {
        const keyPath = path.join(__dirname, '..', 'config', 'encryption.key');

        try {
            // Créer le répertoire config si nécessaire
            const configDir = path.dirname(keyPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Essayer de lire la clé existante
            if (fs.existsSync(keyPath)) {
                const existingKey = fs.readFileSync(keyPath, 'utf8').trim();
                if (existingKey.length === 64) { // 256 bits en hex
                    console.log('🔐 Clé de chiffrement chargée');
                    return existingKey;
                }
            }

            // Générer une nouvelle clé sécurisée
            const newKey = crypto.randomBytes(32).toString('hex');
            fs.writeFileSync(keyPath, newKey, { mode: 0o600 }); // Lecture seule pour le propriétaire
            console.log('🔑 Nouvelle clé de chiffrement générée');
            return newKey;

        } catch (error) {
            console.error('❌ Erreur génération clé:', error);
            // Clé par défaut sécurisée (à changer en production)
            return crypto.randomBytes(32).toString('hex');
        }
    }

    /**
     * Chiffre une chaîne avec AES-256
     */
    encrypt(text) {
        if (!text) return null;
        try {
            return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
        } catch (error) {
            console.error('❌ Erreur chiffrement:', error);
            return text; // Fallback non chiffré
        }
    }

    /**
     * Déchiffre une chaîne
     */
    decrypt(encryptedText) {
        if (!encryptedText) return null;
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('❌ Erreur déchiffrement:', error);
            return encryptedText; // Fallback
        }
    }

    /**
     * Initialise la base de données SQLite
     */
    initializeDatabase() {
        try {
            // Créer le répertoire data si nécessaire
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Erreur ouverture DB:', err);
                    return;
                }
                console.log('🗄️ Base de données SAV connectée');
            });

            // Créer les tables
            this.createTables();

            // Nettoyer les codes expirés au démarrage
            this.cleanupExpiredCodes();

        } catch (error) {
            console.error('❌ Erreur initialisation DB:', error);
        }
    }

    /**
     * Crée les tables nécessaires
     */
    createTables() {
        const createCodesTable = `
            CREATE TABLE IF NOT EXISTS sav_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                client_id_encrypted TEXT NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                session_started BOOLEAN DEFAULT FALSE,
                revoked_at DATETIME NULL,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata_encrypted TEXT
            )
        `;

        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sav_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL,
                session_id TEXT UNIQUE NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                messages_count INTEGER DEFAULT 0,
                FOREIGN KEY (code) REFERENCES sav_codes (code)
            )
        `;

        const createAuditTable = `
            CREATE TABLE IF NOT EXISTS sav_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL,
                action TEXT NOT NULL,
                details_encrypted TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.serialize(() => {
            this.db.run(createCodesTable);
            this.db.run(createSessionsTable);
            this.db.run(createAuditTable);

            // Index pour les performances
            this.db.run('CREATE INDEX IF NOT EXISTS idx_sav_codes_expires_at ON sav_codes(expires_at)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_sav_codes_used ON sav_codes(used)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_sav_audit_timestamp ON sav_audit(timestamp)');
        });

        console.log('📋 Tables SAV créées/vérifiées');
    }

    /**
     * Génère un code SAV sécurisé
     */
    async generateCode(clientId, validityHours = 24, metadata = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Génération du code unique
                const prefix = 'SAV';
                const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
                const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
                const code = `${prefix}-${part1}-${part2}`;

                // Chiffrement des données sensibles
                const clientIdEncrypted = this.encrypt(clientId);
                const metadataEncrypted = this.encrypt(JSON.stringify(metadata));

                // Calcul de l'expiration
                let expiresAt = null;
                if (validityHours < 999999) { // Pas à vie
                    expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + validityHours);
                }

                const stmt = this.db.prepare(`
                    INSERT INTO sav_codes
                    (code, client_id_encrypted, expires_at, metadata_encrypted)
                    VALUES (?, ?, ?, ?)
                `);

                stmt.run([
                    code,
                    clientIdEncrypted,
                    expiresAt ? expiresAt.toISOString() : null,
                    metadataEncrypted
                ], function(err) {
                    if (err) {
                        console.error('❌ Erreur insertion code:', err);
                        reject(err);
                        return;
                    }

                    // Audit log
                    this.logAudit(code, 'GENERATED', { clientId, validityHours });

                    console.log(`🔑 Code SAV généré: ${code} (client: ${clientId})`);

                    resolve({
                        code,
                        clientId,
                        validityHours,
                        expiresAt,
                        createdAt: new Date()
                    });
                }.bind(this));

                stmt.finalize();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Vérifie et authentifie un code SAV
     */
    async authenticateCode(code) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM sav_codes
                WHERE code = ? AND revoked_at IS NULL
            `;

            this.db.get(query, [code], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    this.logAudit(code, 'AUTH_FAILED', { reason: 'Code not found' });
                    resolve({ success: false, error: 'Code invalide ou révoqué' });
                    return;
                }

                // Vérifier l'expiration
                if (row.expires_at && new Date(row.expires_at) < new Date()) {
                    this.logAudit(code, 'AUTH_FAILED', { reason: 'Code expired' });
                    resolve({ success: false, error: 'Code expiré' });
                    return;
                }

                // Déchiffrer les données
                const clientId = this.decrypt(row.client_id_encrypted);

                // Marquer comme utilisé et démarrer la session
                this.db.run(
                    'UPDATE sav_codes SET used = TRUE, session_started = TRUE, last_activity = CURRENT_TIMESTAMP WHERE code = ?',
                    [code]
                );

                this.logAudit(code, 'AUTHENTICATED', { clientId });

                console.log(`✅ Code SAV authentifié: ${code} (client: ${clientId})`);

                resolve({
                    success: true,
                    clientId,
                    sessionStarted: true
                });
            });
        });
    }

    /**
     * Révoque un code SAV
     */
    async revokeCode(code) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE sav_codes
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE code = ? AND revoked_at IS NULL
            `;

            this.db.run(query, [code], function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                if (this.changes === 0) {
                    resolve({
                        success: false,
                        error: 'Code introuvable ou déjà révoqué'
                    });
                    return;
                }

                // Audit log
                this.logAudit(code, 'REVOKED', {});

                console.log(`🚫 Code SAV révoqué: ${code}`);

                resolve({
                    success: true,
                    message: 'Code révoqué avec succès',
                    revokedAt: new Date()
                });
            }.bind(this));
        });
    }

    /**
     * Liste tous les codes actifs
     */
    async listActiveCodes() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM sav_codes
                WHERE revoked_at IS NULL
                ORDER BY created_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const codes = rows.map(row => {
                    const clientId = this.decrypt(row.client_id_encrypted);
                    const isExpired = row.expires_at && new Date(row.expires_at) < new Date();

                    return {
                        code: row.code,
                        clientId,
                        used: Boolean(row.used),
                        createdAt: new Date(row.created_at),
                        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
                        sessionStarted: Boolean(row.session_started),
                        isExpired,
                        lastActivity: new Date(row.last_activity)
                    };
                }).filter(code => !code.isExpired); // Filtrer les codes expirés

                resolve(codes);
            });
        });
    }

    /**
     * Nettoie les codes expirés
     */
    async cleanupExpiredCodes() {
        const query = `
            DELETE FROM sav_codes
            WHERE expires_at IS NOT NULL
            AND expires_at < datetime('now')
        `;

        this.db.run(query, function(err) {
            if (err) {
                console.error('❌ Erreur nettoyage codes expirés:', err);
                return;
            }

            if (this.changes > 0) {
                console.log(`🧹 ${this.changes} code(s) SAV expiré(s) supprimé(s)`);
            }
        });
    }

    /**
     * Enregistre un événement d'audit
     */
    logAudit(code, action, details = {}, ipAddress = null, userAgent = null) {
        const detailsEncrypted = this.encrypt(JSON.stringify(details));

        const stmt = this.db.prepare(`
            INSERT INTO sav_audit
            (code, action, details_encrypted, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run([code, action, detailsEncrypted, ipAddress, userAgent], (err) => {
            if (err) {
                console.error('❌ Erreur audit log:', err);
            }
        });

        stmt.finalize();
    }

    /**
     * Ferme la connexion à la base de données
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Erreur fermeture DB:', err);
                } else {
                    console.log('🔒 Base de données SAV fermée');
                }
            });
        }
    }
}

module.exports = SecureSAVDatabase;