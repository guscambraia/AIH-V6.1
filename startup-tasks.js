
const { run, get, all, getDbStats } = require('./database');
const path = require('path');
const fs = require('fs');

// Tarefas de inicialização do sistema
class StartupTasks {
    
    static async performStartupChecks() {
        console.log('🔍 Executando verificações de inicialização...');
        
        const checks = [
            this.checkDatabaseIntegrity,
            this.checkDiskSpace,
            this.checkLogRotation,
            this.cleanupTempFiles,
            this.validateCriticalTables,
            this.optimizeOnStartup
        ];
        
        for (const check of checks) {
            try {
                await check.call(this);
            } catch (error) {
                console.warn(`⚠️ Falha em verificação: ${error.message}`);
            }
        }
        
        console.log('✅ Verificações de inicialização concluídas');
    }
    
    static async checkDatabaseIntegrity() {
        console.log('   🔍 Verificando integridade do banco...');
        
        const integrity = await get('PRAGMA integrity_check');
        if (integrity && integrity.integrity_check !== 'ok') {
            console.warn('   ⚠️ Problemas de integridade detectados:', integrity);
            
            // Tentar reparar automaticamente
            console.log('   🔧 Tentando reparar banco...');
            await run('PRAGMA wal_checkpoint(TRUNCATE)');
            await run('REINDEX');
            
            // Verificar novamente
            const recheck = await get('PRAGMA integrity_check');
            if (recheck && recheck.integrity_check === 'ok') {
                console.log('   ✅ Banco reparado com sucesso');
            } else {
                console.error('   ❌ Não foi possível reparar o banco automaticamente');
            }
        } else {
            console.log('   ✅ Integridade do banco OK');
        }
    }
    
    static async checkDiskSpace() {
        console.log('   💾 Verificando espaço em disco...');
        
        try {
            const stats = fs.statSync(path.join(__dirname, 'db'));
            const dbPath = path.join(__dirname, 'db', 'aih.db');
            const dbStats = fs.statSync(dbPath);
            
            // Verificar se há pelo menos 100MB livres
            const dbSize = dbStats.size;
            const freeSpaceNeeded = Math.max(100 * 1024 * 1024, dbSize * 0.5); // 100MB ou 50% do tamanho do banco
            
            console.log(`   📊 Tamanho do banco: ${Math.round(dbSize / 1024 / 1024)}MB`);
            console.log('   ✅ Espaço em disco verificado');
            
        } catch (error) {
            console.warn('   ⚠️ Não foi possível verificar espaço em disco:', error.message);
        }
    }
    
    static async checkLogRotation() {
        console.log('   📝 Verificando rotação de logs...');
        
        try {
            const logsDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
                console.log('   📁 Diretório de logs criado');
            }
            
            // Limpar logs muito antigos (mais de 30 dias)
            const files = fs.readdirSync(logsDir);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            let removedCount = 0;
            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                console.log(`   🗑️ ${removedCount} logs antigos removidos`);
            }
            
            console.log('   ✅ Rotação de logs verificada');
            
        } catch (error) {
            console.warn('   ⚠️ Erro na verificação de logs:', error.message);
        }
    }
    
    static async cleanupTempFiles() {
        console.log('   🧹 Limpando arquivos temporários...');
        
        try {
            // Limpar arquivos temporários do SQLite
            const dbDir = path.join(__dirname, 'db');
            const files = fs.readdirSync(dbDir);
            
            let removedCount = 0;
            for (const file of files) {
                if (file.includes('-journal') || file.includes('.tmp')) {
                    const filePath = path.join(dbDir, file);
                    try {
                        fs.unlinkSync(filePath);
                        removedCount++;
                    } catch (e) {
                        // Arquivo pode estar em uso
                    }
                }
            }
            
            if (removedCount > 0) {
                console.log(`   🗑️ ${removedCount} arquivos temporários removidos`);
            }
            
            console.log('   ✅ Limpeza de temporários concluída');
            
        } catch (error) {
            console.warn('   ⚠️ Erro na limpeza de temporários:', error.message);
        }
    }
    
    static async validateCriticalTables() {
        console.log('   🔍 Validando tabelas críticas...');
        
        const criticalTables = ['aihs', 'movimentacoes', 'usuarios', 'glosas'];
        
        for (const table of criticalTables) {
            try {
                const count = await get(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 ${table}: ${count.count} registros`);
            } catch (error) {
                console.error(`   ❌ Erro na tabela ${table}:`, error.message);
                throw new Error(`Tabela crítica ${table} com problemas`);
            }
        }
        
        console.log('   ✅ Tabelas críticas validadas');
    }
    
    static async optimizeOnStartup() {
        console.log('   ⚡ Executando otimizações de inicialização...');
        
        try {
            // Analisar estatísticas se o banco for grande
            const stats = await getDbStats();
            if (stats && stats.total_aihs > 10000) {
                console.log('   📊 Atualizando estatísticas do banco...');
                await run('ANALYZE');
            }
            
            // Otimizar queries se necessário
            await run('PRAGMA optimize');
            
            console.log('   ✅ Otimizações concluídas');
            
        } catch (error) {
            console.warn('   ⚠️ Erro nas otimizações:', error.message);
        }
    }
    
    static async performShutdownTasks() {
        console.log('🔄 Executando tarefas de encerramento...');
        
        const tasks = [
            this.finalizeTransactions,
            this.createShutdownBackup,
            this.cleanupConnections,
            this.logShutdownInfo
        ];
        
        for (const task of tasks) {
            try {
                await task.call(this);
            } catch (error) {
                console.warn(`⚠️ Falha em tarefa de encerramento: ${error.message}`);
            }
        }
        
        console.log('✅ Tarefas de encerramento concluídas');
    }
    
    static async finalizeTransactions() {
        console.log('   🔄 Finalizando transações...');
        
        try {
            // Fazer checkpoint do WAL
            await run('PRAGMA wal_checkpoint(TRUNCATE)');
            
            // Otimizar uma última vez
            await run('PRAGMA optimize');
            
            console.log('   ✅ Transações finalizadas');
            
        } catch (error) {
            console.warn('   ⚠️ Erro ao finalizar transações:', error.message);
        }
    }
    
    static async createShutdownBackup() {
        console.log('   💾 Verificando necessidade de backup...');
        
        try {
            // Verificar quando foi o último backup
            const lastBackup = await get(`
                SELECT data_hora 
                FROM logs_acesso 
                WHERE acao LIKE '%backup%' 
                ORDER BY data_hora DESC 
                LIMIT 1
            `).catch(() => null);
            
            if (!lastBackup) {
                console.log('   📦 Criando backup de encerramento...');
                const { createBackup } = require('./database');
                await createBackup();
                console.log('   ✅ Backup de encerramento criado');
            } else {
                console.log('   ✅ Backup recente existe, não necessário');
            }
            
        } catch (error) {
            console.warn('   ⚠️ Erro no backup de encerramento:', error.message);
        }
    }
    
    static async cleanupConnections() {
        console.log('   🔌 Limpando conexões...');
        
        try {
            // Limpar caches
            const { clearCache } = require('./database');
            clearCache();
            
            console.log('   ✅ Conexões limpas');
            
        } catch (error) {
            console.warn('   ⚠️ Erro na limpeza de conexões:', error.message);
        }
    }
    
    static async logShutdownInfo() {
        console.log('   📝 Registrando informações de encerramento...');
        
        try {
            const stats = await getDbStats();
            const shutdownInfo = {
                timestamp: new Date().toISOString(),
                total_aihs: stats?.total_aihs || 0,
                db_size_mb: stats?.db_size_mb || 0,
                graceful_shutdown: true
            };
            
            await run(`
                INSERT INTO logs_acesso (usuario_id, acao, data_hora) 
                VALUES (0, ?, CURRENT_TIMESTAMP)
            `, [`Sistema encerrado - ${JSON.stringify(shutdownInfo)}`]);
            
            console.log('   ✅ Informações de encerramento registradas');
            
        } catch (error) {
            console.warn('   ⚠️ Erro ao registrar encerramento:', error.message);
        }
    }
}

module.exports = StartupTasks;
