
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDirectory();
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = process.env.LOG_LEVEL || 'info';
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
        return JSON.stringify(logEntry);
    }

    writeToFile(level, formattedMessage) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `${level}-${date}.log`;
        const filepath = path.join(this.logDir, filename);
        
        fs.appendFileSync(filepath, formattedMessage + '\n');
    }

    log(level, message, meta = {}) {
        if (this.levels[level] <= this.levels[this.currentLevel]) {
            const formattedMessage = this.formatMessage(level, message, meta);
            
            // Console output com cores
            const colors = {
                error: '\x1b[31m', // Vermelho
                warn: '\x1b[33m',  // Amarelo
                info: '\x1b[36m',  // Ciano
                debug: '\x1b[37m'  // Branco
            };
            
            console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m ${new Date().toISOString()} - ${message}`, meta);
            
            // Escrever em arquivo
            try {
                this.writeToFile(level, formattedMessage);
            } catch (err) {
                console.error('Erro ao escrever log:', err);
            }
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Métodos específicos para o sistema AIH
    aihCadastrado(numeroAIH, usuario, meta = {}) {
        this.info(`AIH cadastrada: ${numeroAIH}`, {
            action: 'AIH_CADASTRADA',
            usuario,
            numeroAIH,
            ...meta
        });
    }

    movimentacaoRealizada(aihId, tipo, usuario, meta = {}) {
        this.info(`Movimentação realizada: ${tipo}`, {
            action: 'MOVIMENTACAO_REALIZADA',
            aihId,
            tipo,
            usuario,
            ...meta
        });
    }

    loginSucesso(usuario, ip) {
        this.info(`Login realizado com sucesso`, {
            action: 'LOGIN_SUCESSO',
            usuario,
            ip
        });
    }

    loginFalha(usuario, ip, motivo) {
        this.warn(`Tentativa de login falhada`, {
            action: 'LOGIN_FALHA',
            usuario,
            ip,
            motivo
        });
    }

    relatorioGerado(tipo, usuario, filtros = {}) {
        this.info(`Relatório gerado: ${tipo}`, {
            action: 'RELATORIO_GERADO',
            tipo,
            usuario,
            filtros
        });
    }

    backupRealizado(path, size) {
        this.info(`Backup realizado com sucesso`, {
            action: 'BACKUP_REALIZADO',
            path,
            size
        });
    }

    // Limpeza automática de logs antigos
    cleanupOldLogs(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    this.info(`Log antigo removido: ${file}`);
                }
            });
        } catch (err) {
            this.error('Erro na limpeza de logs', { error: err.message });
        }
    }
}

// Instância singleton
const logger = new Logger();

// Limpeza automática de logs antigos (uma vez por dia)
setInterval(() => {
    logger.cleanupOldLogs();
}, 24 * 60 * 60 * 1000);

module.exports = logger;
