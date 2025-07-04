
const { getDbStats } = require('./database');
const logger = require('./logger');

class HealthMonitor {
    constructor() {
        this.metrics = {
            requests: { total: 0, errors: 0, responseTime: [] },
            database: { queries: 0, errors: 0, connectionPool: 0 },
            memory: { usage: 0, peak: 0 },
            cache: { hits: 0, misses: 0 },
            system: { uptime: 0, cpu: 0 }
        };
        this.alerts = [];
        this.startMonitoring();
    }

    startMonitoring() {
        // Monitorar a cada minuto
        setInterval(() => {
            this.checkSystemHealth();
        }, 60000);

        // Relatório detalhado a cada hora
        setInterval(() => {
            this.generateHealthReport();
        }, 3600000);
    }

    recordRequest(responseTime, hasError = false) {
        this.metrics.requests.total++;
        if (hasError) this.metrics.requests.errors++;
        
        this.metrics.requests.responseTime.push(responseTime);
        
        // Manter apenas os últimos 1000 tempos de resposta
        if (this.metrics.requests.responseTime.length > 1000) {
            this.metrics.requests.responseTime.shift();
        }
    }

    recordDatabaseQuery(hasError = false) {
        this.metrics.database.queries++;
        if (hasError) this.metrics.database.errors++;
    }

    recordCacheHit(isHit = true) {
        if (isHit) {
            this.metrics.cache.hits++;
        } else {
            this.metrics.cache.misses++;
        }
    }

    async checkSystemHealth() {
        try {
            // Verificar memória
            const memUsage = process.memoryUsage();
            this.metrics.memory.usage = memUsage.heapUsed;
            if (memUsage.heapUsed > this.metrics.memory.peak) {
                this.metrics.memory.peak = memUsage.heapUsed;
            }

            // Alertar se memória acima de 80% do limite
            const memoryLimitMB = 512; // 512MB limite
            const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
            if (memoryUsageMB > memoryLimitMB * 0.8) {
                this.addAlert('high_memory', `Uso de memória alto: ${memoryUsageMB.toFixed(1)}MB`);
            }

            // Verificar banco de dados
            const dbStats = await getDbStats();
            if (dbStats) {
                this.metrics.database.connectionPool = dbStats.available_connections;
                
                // Alertar se pool de conexões baixo
                if (dbStats.available_connections < 5) {
                    this.addAlert('low_db_connections', `Poucas conexões disponíveis: ${dbStats.available_connections}`);
                }
            }

            // Verificar taxa de erro
            const errorRate = this.getErrorRate();
            if (errorRate > 0.05) { // 5% de erro
                this.addAlert('high_error_rate', `Taxa de erro alta: ${(errorRate * 100).toFixed(1)}%`);
            }

            // Verificar tempo de resposta médio
            const avgResponseTime = this.getAverageResponseTime();
            if (avgResponseTime > 2000) { // 2 segundos
                this.addAlert('slow_response', `Tempo de resposta lento: ${avgResponseTime.toFixed(0)}ms`);
            }

        } catch (err) {
            logger.error('Erro no monitoramento de saúde', { error: err.message });
        }
    }

    addAlert(type, message) {
        const alert = {
            type,
            message,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random()
        };

        this.alerts.push(alert);
        
        // Manter apenas os últimos 100 alertas
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        logger.warn(`ALERTA DE SISTEMA: ${message}`, { alertType: type });
    }

    getErrorRate() {
        const total = this.metrics.requests.total;
        const errors = this.metrics.requests.errors;
        return total > 0 ? errors / total : 0;
    }

    getAverageResponseTime() {
        const times = this.metrics.requests.responseTime;
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    getCacheHitRate() {
        const hits = this.metrics.cache.hits;
        const total = hits + this.metrics.cache.misses;
        return total > 0 ? hits / total : 0;
    }

    generateHealthReport() {
        const report = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                current: Math.round(this.metrics.memory.usage / 1024 / 1024),
                peak: Math.round(this.metrics.memory.peak / 1024 / 1024)
            },
            requests: {
                total: this.metrics.requests.total,
                errorRate: (this.getErrorRate() * 100).toFixed(2) + '%',
                avgResponseTime: this.getAverageResponseTime().toFixed(0) + 'ms'
            },
            database: {
                queries: this.metrics.database.queries,
                errors: this.metrics.database.errors,
                connectionPool: this.metrics.database.connectionPool
            },
            cache: {
                hitRate: (this.getCacheHitRate() * 100).toFixed(2) + '%',
                hits: this.metrics.cache.hits,
                misses: this.metrics.cache.misses
            },
            alerts: this.alerts.slice(-10) // Últimos 10 alertas
        };

        logger.info('Relatório de saúde do sistema', { healthReport: report });
        return report;
    }

    getHealthStatus() {
        const errorRate = this.getErrorRate();
        const avgResponseTime = this.getAverageResponseTime();
        const memoryUsageMB = this.metrics.memory.usage / 1024 / 1024;

        let status = 'healthy';
        let issues = [];

        if (errorRate > 0.1) {
            status = 'critical';
            issues.push('Taxa de erro muito alta');
        } else if (errorRate > 0.05) {
            status = 'warning';
            issues.push('Taxa de erro elevada');
        }

        if (avgResponseTime > 5000) {
            status = 'critical';
            issues.push('Tempo de resposta muito lento');
        } else if (avgResponseTime > 2000) {
            if (status !== 'critical') status = 'warning';
            issues.push('Tempo de resposta lento');
        }

        if (memoryUsageMB > 400) {
            status = 'critical';
            issues.push('Uso de memória crítico');
        } else if (memoryUsageMB > 300) {
            if (status !== 'critical') status = 'warning';
            issues.push('Uso de memória alto');
        }

        return { status, issues, report: this.generateHealthReport() };
    }
}

const healthMonitor = new HealthMonitor();

module.exports = healthMonitor;
