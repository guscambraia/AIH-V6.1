
const fs = require('fs');
const path = require('path');

class DebugHelper {
    constructor() {
        this.logFile = path.join(__dirname, 'debug.log');
        this.isActive = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    }

    // Debug de queries SQL
    enableSQLDebug() {
        if (!this.isActive) return;

        const originalConsoleLog = console.log;
        console.log = (...args) => {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('SQL:')) {
                this.logSQL(args.join(' '));
            }
            originalConsoleLog.apply(console, args);
        };

        console.log('🐛 Debug SQL ativado');
    }

    // Debug de requests HTTP
    debugRequests(req, res, next) {
        if (!this.isActive) return next();

        const startTime = Date.now();
        const originalSend = res.send;

        res.send = function(data) {
            const duration = Date.now() - startTime;
            
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: duration,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                size: data ? data.length : 0
            };

            this.logRequest(logData);
            
            if (duration > 1000) {
                console.warn(`⚠️ Request lento: ${req.method} ${req.url} - ${duration}ms`);
            }

            originalSend.call(this, data);
        }.bind(this);

        next();
    }

    // Debug de performance de funções
    measureFunction(fn, name) {
        if (!this.isActive) return fn;

        return async (...args) => {
            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;

            try {
                const result = await fn(...args);
                const duration = Date.now() - startTime;
                const memoryUsed = process.memoryUsage().heapUsed - startMemory;

                this.logPerformance({
                    function: name,
                    duration: duration,
                    memoryUsed: memoryUsed,
                    args: args.length,
                    success: true
                });

                if (duration > 500) {
                    console.warn(`⚠️ Função lenta: ${name} - ${duration}ms`);
                }

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                
                this.logPerformance({
                    function: name,
                    duration: duration,
                    args: args.length,
                    success: false,
                    error: error.message
                });

                throw error;
            }
        };
    }

    // Debug de conexões de banco
    debugDatabase(db) {
        if (!this.isActive) return;

        // Interceptar queries
        const originalPrepare = db.prepare;
        db.prepare = function(sql) {
            console.log(`🗄️ SQL: ${sql}`);
            return originalPrepare.call(this, sql);
        };

        // Monitorar conexões
        db.on('open', () => {
            console.log('🔗 Conexão com banco aberta');
        });

        db.on('close', () => {
            console.log('🔌 Conexão com banco fechada');
        });

        console.log('🐛 Debug de banco ativado');
    }

    // Debug de cache
    debugCache(cache) {
        if (!this.isActive) return;

        const originalGet = cache.get;
        const originalSet = cache.set;

        cache.get = function(key) {
            const result = originalGet.call(this, key);
            console.log(`📋 Cache GET: ${key} - ${result ? 'HIT' : 'MISS'}`);
            return result;
        };

        cache.set = function(key, value) {
            console.log(`📋 Cache SET: ${key}`);
            return originalSet.call(this, key, value);
        };

        console.log('🐛 Debug de cache ativado');
    }

    // Captura de estado do sistema
    captureSystemState() {
        const state = {
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid,
            env: process.env.NODE_ENV
        };

        this.logSystemState(state);
        return state;
    }

    // Debug de erros
    captureError(error, context = {}) {
        const errorData = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: context,
            systemState: this.captureSystemState()
        };

        this.logError(errorData);
        
        // Em desenvolvimento, mostrar erro detalhado
        if (this.isActive) {
            console.error('🚨 Erro capturado:', errorData);
        }

        return errorData;
    }

    // Profiling de código
    startProfiling(name) {
        if (!this.isActive) return { end: () => {} };

        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;

        return {
            end: () => {
                const duration = Date.now() - startTime;
                const memoryUsed = process.memoryUsage().heapUsed - startMemory;

                console.log(`⏱️ Profile ${name}: ${duration}ms, Memória: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
                
                this.logProfile({
                    name: name,
                    duration: duration,
                    memoryUsed: memoryUsed,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }

    // Logs estruturados
    logSQL(query) {
        this.writeLog('SQL', { query: query });
    }

    logRequest(data) {
        this.writeLog('REQUEST', data);
    }

    logPerformance(data) {
        this.writeLog('PERFORMANCE', data);
    }

    logError(data) {
        this.writeLog('ERROR', data);
    }

    logSystemState(data) {
        this.writeLog('SYSTEM', data);
    }

    logProfile(data) {
        this.writeLog('PROFILE', data);
    }

    writeLog(type, data) {
        if (!this.isActive) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            data: data
        };

        try {
            fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error('Erro ao escrever log:', err.message);
        }
    }

    // Análise de logs
    analyzeLogs() {
        if (!fs.existsSync(this.logFile)) {
            console.log('📄 Nenhum log encontrado');
            return;
        }

        const logs = fs.readFileSync(this.logFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return null;
                }
            })
            .filter(log => log !== null);

        const analysis = {
            total: logs.length,
            byType: {},
            errors: 0,
            slowRequests: 0,
            averageRequestTime: 0,
            memoryUsage: []
        };

        let totalRequestTime = 0;
        let requestCount = 0;

        for (const log of logs) {
            // Contagem por tipo
            analysis.byType[log.type] = (analysis.byType[log.type] || 0) + 1;

            // Análise específica por tipo
            switch (log.type) {
                case 'ERROR':
                    analysis.errors++;
                    break;
                    
                case 'REQUEST':
                    if (log.data.duration > 1000) {
                        analysis.slowRequests++;
                    }
                    totalRequestTime += log.data.duration;
                    requestCount++;
                    break;
                    
                case 'SYSTEM':
                    analysis.memoryUsage.push(log.data.memory.heapUsed);
                    break;
            }
        }

        if (requestCount > 0) {
            analysis.averageRequestTime = Math.round(totalRequestTime / requestCount);
        }

        console.log('📊 Análise de Logs:');
        console.log(`   Total de entradas: ${analysis.total}`);
        console.log(`   Por tipo:`, analysis.byType);
        console.log(`   Erros: ${analysis.errors}`);
        console.log(`   Requests lentos: ${analysis.slowRequests}`);
        console.log(`   Tempo médio de request: ${analysis.averageRequestTime}ms`);

        if (analysis.memoryUsage.length > 0) {
            const avgMemory = analysis.memoryUsage.reduce((a, b) => a + b, 0) / analysis.memoryUsage.length;
            console.log(`   Uso médio de memória: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
        }

        return analysis;
    }

    // Limpar logs antigos
    clearLogs() {
        if (fs.existsSync(this.logFile)) {
            fs.unlinkSync(this.logFile);
            console.log('🧹 Logs limpos');
        }
    }
}

module.exports = new DebugHelper();
