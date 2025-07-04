
// Configurações centralizadas do sistema
const config = {
    // Configurações de banco de dados
    database: {
        poolSize: process.env.NODE_ENV === 'production' ? 50 : 25,
        busyTimeout: 180000, // 3 minutos
        cacheSize: process.env.NODE_ENV === 'production' ? 200000 : 100000,
        mmapSize: process.env.NODE_ENV === 'production' ? 4294967296 : 2147483648
    },

    // Configurações de cache
    cache: {
        ttl: {
            quick: 5 * 60 * 1000,      // 5 minutos
            medium: 15 * 60 * 1000,    // 15 minutos
            report: 30 * 60 * 1000,    // 30 minutos
            dashboard: 10 * 60 * 1000  // 10 minutos
        },
        maxSize: {
            quick: 5000,
            medium: 10000,
            report: 2000,
            dashboard: 500
        }
    },

    // Configurações de segurança
    security: {
        rateLimitWindow: 15 * 60 * 1000, // 15 minutos
        maxRequests: process.env.NODE_ENV === 'production' ? 2000 : 5000,
        maxSecurityLogs: 1000,
        bcryptRounds: 12,
        jwtExpiresIn: '24h'
    },

    // Configurações de backup
    backup: {
        interval: 8 * 60 * 60 * 1000, // 8 horas
        maxBackups: 21, // 1 semana com 3 por dia
        firstBackupDelay: 30 * 60 * 1000 // 30 minutos
    },

    // Configurações de validação
    validation: {
        aih: {
            numeroMinLength: 3,
            numeroMaxLength: 50,
            valorMinimo: 0.01,
            valorMaximo: 1000000,
            maxAtendimentos: 100
        },
        atendimento: {
            minLength: 1,
            maxLength: 50
        },
        competencia: {
            pattern: /^\d{2}\/\d{4}$/,
            anoMinimo: 2020
        }
    },

    // Configurações de sistema
    system: {
        port: process.env.PORT || 5000,
        host: '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
    },

    // Configurações de performance
    performance: {
        compressionLevel: 6,
        compressionThreshold: 1024,
        chunkSize: 16 * 1024
    }
};

module.exports = config;
