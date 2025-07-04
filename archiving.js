
const { run, get, all, runTransaction } = require('./database');

// Arquivar dados com mais de 3 anos
const archiveOldData = async () => {
    try {
        // Log apenas quando há dados para processar
        // console.log('🗂️ Iniciando arquivamento de dados antigos...');
        
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const cutoffDate = threeYearsAgo.toISOString().split('T')[0];
        
        // Criar tabelas de arquivo se não existirem
        await createArchiveTables();
        
        // Arquivar AIHs antigas
        const oldAihs = await all(`
            SELECT * FROM aihs 
            WHERE DATE(criado_em) < ? 
            AND status IN (1, 4)
        `, [cutoffDate]);
        
        if (oldAihs.length === 0) {
            // Apenas log em debug quando não há dados para arquivar
            // console.log(`📊 Verificação de arquivamento concluída - 0 AIHs antigas (corte: ${cutoffDate})`);
            return { archived: 0, freed_space: 0 };
        }
        
        console.log(`📦 Encontradas ${oldAihs.length} AIHs para arquivar`);
        
        // Arquivar em lotes para evitar sobrecarga
        const batchSize = 100;
        let totalArchived = 0;
        
        for (let i = 0; i < oldAihs.length; i += batchSize) {
            const batch = oldAihs.slice(i, i + batchSize);
            await archiveBatch(batch);
            totalArchived += batch.length;
            console.log(`📦 Arquivadas ${totalArchived}/${oldAihs.length} AIHs`);
        }
        
        // Executar limpeza de espaço
        await run('PRAGMA wal_checkpoint(TRUNCATE)');
        await run('VACUUM');
        
        console.log(`✅ Arquivamento concluído: ${totalArchived} AIHs arquivadas`);
        
        return { 
            archived: totalArchived, 
            cutoff_date: cutoffDate,
            freed_space: 'Espaço liberado após VACUUM'
        };
        
    } catch (err) {
        console.error('❌ Erro no arquivamento:', err);
        throw err;
    }
};

// Criar tabelas de arquivo
const createArchiveTables = async () => {
    const tables = [
        `CREATE TABLE IF NOT EXISTS aihs_arquivo (
            id INTEGER,
            numero_aih TEXT,
            valor_inicial REAL,
            valor_atual REAL,
            status INTEGER,
            competencia TEXT,
            criado_em DATETIME,
            usuario_cadastro_id INTEGER,
            arquivado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`,
        `CREATE TABLE IF NOT EXISTS movimentacoes_arquivo (
            id INTEGER,
            aih_id INTEGER,
            tipo TEXT,
            data_movimentacao DATETIME,
            usuario_id INTEGER,
            valor_conta REAL,
            competencia TEXT,
            prof_medicina TEXT,
            prof_enfermagem TEXT,
            prof_fisioterapia TEXT,
            prof_bucomaxilo TEXT,
            status_aih INTEGER,
            observacoes TEXT,
            arquivado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`,
        `CREATE TABLE IF NOT EXISTS glosas_arquivo (
            id INTEGER,
            aih_id INTEGER,
            linha TEXT,
            tipo TEXT,
            profissional TEXT,
            quantidade INTEGER,
            ativa INTEGER,
            criado_em DATETIME,
            arquivado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`,
        `CREATE TABLE IF NOT EXISTS atendimentos_arquivo (
            id INTEGER,
            aih_id INTEGER,
            numero_atendimento TEXT,
            arquivado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`
    ];
    
    for (const sql of tables) {
        await run(sql);
    }
    
    // Índices para consultas em arquivos
    await run('CREATE INDEX IF NOT EXISTS idx_arquivo_aih_numero ON aihs_arquivo(numero_aih)');
    await run('CREATE INDEX IF NOT EXISTS idx_arquivo_aih_competencia ON aihs_arquivo(competencia)');
    await run('CREATE INDEX IF NOT EXISTS idx_arquivo_mov_aih ON movimentacoes_arquivo(aih_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_arquivo_glosas_aih ON glosas_arquivo(aih_id)');
};

// Arquivar lote de AIHs
const archiveBatch = async (aihs) => {
    const operations = [];
    
    for (const aih of aihs) {
        // Buscar dados relacionados
        const movimentacoes = await all('SELECT * FROM movimentacoes WHERE aih_id = ?', [aih.id]);
        const glosas = await all('SELECT * FROM glosas WHERE aih_id = ?', [aih.id]);
        const atendimentos = await all('SELECT * FROM atendimentos WHERE aih_id = ?', [aih.id]);
        
        // Inserir na tabela de arquivo
        operations.push({
            sql: `INSERT INTO aihs_arquivo 
                  (id, numero_aih, valor_inicial, valor_atual, status, competencia, criado_em, usuario_cadastro_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [aih.id, aih.numero_aih, aih.valor_inicial, aih.valor_atual, 
                    aih.status, aih.competencia, aih.criado_em, aih.usuario_cadastro_id]
        });
        
        // Arquivar movimentações
        for (const mov of movimentacoes) {
            operations.push({
                sql: `INSERT INTO movimentacoes_arquivo 
                      (id, aih_id, tipo, data_movimentacao, usuario_id, valor_conta, competencia,
                       prof_medicina, prof_enfermagem, prof_fisioterapia, prof_bucomaxilo, status_aih, observacoes)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [mov.id, mov.aih_id, mov.tipo, mov.data_movimentacao, mov.usuario_id,
                        mov.valor_conta, mov.competencia, mov.prof_medicina, mov.prof_enfermagem,
                        mov.prof_fisioterapia, mov.prof_bucomaxilo, mov.status_aih, mov.observacoes]
            });
        }
        
        // Arquivar glosas
        for (const glosa of glosas) {
            operations.push({
                sql: `INSERT INTO glosas_arquivo 
                      (id, aih_id, linha, tipo, profissional, quantidade, ativa, criado_em)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [glosa.id, glosa.aih_id, glosa.linha, glosa.tipo, glosa.profissional,
                        glosa.quantidade, glosa.ativa, glosa.criado_em]
            });
        }
        
        // Arquivar atendimentos
        for (const atend of atendimentos) {
            operations.push({
                sql: `INSERT INTO atendimentos_arquivo (id, aih_id, numero_atendimento) VALUES (?, ?, ?)`,
                params: [atend.id, atend.aih_id, atend.numero_atendimento]
            });
        }
        
        // Deletar da tabela principal
        operations.push({ sql: 'DELETE FROM glosas WHERE aih_id = ?', params: [aih.id] });
        operations.push({ sql: 'DELETE FROM movimentacoes WHERE aih_id = ?', params: [aih.id] });
        operations.push({ sql: 'DELETE FROM atendimentos WHERE aih_id = ?', params: [aih.id] });
        operations.push({ sql: 'DELETE FROM aihs WHERE id = ?', params: [aih.id] });
    }
    
    // Executar em transação
    await runTransaction(operations);
};

// Buscar dados arquivados (para consultas históricas)
const searchArchivedData = async (numeroAih) => {
    try {
        const aih = await get('SELECT * FROM aihs_arquivo WHERE numero_aih = ?', [numeroAih]);
        if (!aih) return null;
        
        const movimentacoes = await all('SELECT * FROM movimentacoes_arquivo WHERE aih_id = ?', [aih.id]);
        const glosas = await all('SELECT * FROM glosas_arquivo WHERE aih_id = ?', [aih.id]);
        const atendimentos = await all('SELECT * FROM atendimentos_arquivo WHERE aih_id = ?', [aih.id]);
        
        return {
            ...aih,
            movimentacoes,
            glosas,
            atendimentos: atendimentos.map(a => a.numero_atendimento),
            is_archived: true
        };
    } catch (err) {
        console.error('Erro ao buscar dados arquivados:', err);
        throw err;
    }
};

// Agendar arquivamento automático
const scheduleArchiving = () => {
    // Executar arquivamento a cada 6 meses (mais apropriado)
    const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
    
    setInterval(async () => {
        try {
            // Log apenas quando há dados para arquivar
            const result = await archiveOldData();
            if (result.archived > 0) {
                console.log(`🗂️ Arquivamento automático executado: ${result.archived} AIHs arquivadas`);
            }
        } catch (err) {
            console.error('Erro no arquivamento automático:', err);
        }
    }, SIX_MONTHS);
    
    // Executar primeira vez após 24 horas (silencioso)
    setTimeout(async () => {
        try {
            const result = await archiveOldData();
            if (result.archived > 0) {
                console.log(`🗂️ Primeira verificação de arquivamento executada: ${result.archived} AIHs arquivadas`);
            }
        } catch (err) {
            console.error('Erro no arquivamento inicial:', err);
        }
    }, 24 * 60 * 60 * 1000);
    
    console.log('📅 Sistema de arquivamento inicializado (executará a cada 6 meses)');
};

module.exports = {
    archiveOldData,
    createArchiveTables,
    searchArchivedData,
    scheduleArchiving
};
