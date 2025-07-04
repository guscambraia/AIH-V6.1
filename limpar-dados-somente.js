
const { db, run, all, get } = require('./database');
const fs = require('fs');
const path = require('path');

const limparApenasGlosas = async () => {
    console.log('🧹 INICIANDO LIMPEZA SELETIVA - MANTENDO CONFIGURAÇÕES...\n');
    
    try {
        // 1. Fazer backup antes de limpar (segurança)
        console.log('📦 Criando backup de segurança...');
        const { createBackup } = require('./database');
        const backupPath = await createBackup();
        console.log(`✅ Backup criado: ${backupPath}\n`);

        // 2. Desabilitar foreign keys temporariamente
        await run('PRAGMA foreign_keys = OFF');
        console.log('🔓 Foreign keys desabilitadas\n');

        // 3. Verificar dados antes da limpeza
        console.log('📊 DADOS ANTES DA LIMPEZA:');
        const stats = await get(`
            SELECT 
                (SELECT COUNT(*) FROM aihs) as total_aihs,
                (SELECT COUNT(*) FROM movimentacoes) as total_movimentacoes,
                (SELECT COUNT(*) FROM glosas) as total_glosas,
                (SELECT COUNT(*) FROM atendimentos) as total_atendimentos,
                (SELECT COUNT(*) FROM logs_acesso) as total_logs_acesso,
                (SELECT COUNT(*) FROM logs_exclusao) as total_logs_exclusao,
                (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                (SELECT COUNT(*) FROM profissionais) as total_profissionais,
                (SELECT COUNT(*) FROM tipos_glosa) as total_tipos_glosa
        `);
        
        console.log(`   - AIHs: ${stats.total_aihs} registros`);
        console.log(`   - Movimentações: ${stats.total_movimentacoes} registros`);
        console.log(`   - Glosas: ${stats.total_glosas} registros`);
        console.log(`   - Atendimentos: ${stats.total_atendimentos} registros`);
        console.log(`   - Logs de acesso: ${stats.total_logs_acesso} registros`);
        console.log(`   - Logs de exclusão: ${stats.total_logs_exclusao} registros`);
        console.log(`   - Usuários: ${stats.total_usuarios} registros (MANTIDO)`);
        console.log(`   - Profissionais: ${stats.total_profissionais} registros (MANTIDO)`);
        console.log(`   - Tipos de glosa: ${stats.total_tipos_glosa} registros (MANTIDO)`);
        console.log('');

        // 4. Limpar APENAS as tabelas de dados (preservando configurações)
        console.log('🗑️ LIMPANDO APENAS DADOS OPERACIONAIS...');
        
        // Ordem específica para respeitar foreign keys
        const tabelasParaLimpar = [
            { nome: 'logs_exclusao', descricao: 'Logs de exclusão' },
            { nome: 'logs_acesso', descricao: 'Logs de acesso' },
            { nome: 'glosas', descricao: 'Glosas das AIHs' },
            { nome: 'movimentacoes', descricao: 'Movimentações das AIHs' },
            { nome: 'atendimentos', descricao: 'Atendimentos das AIHs' },
            { nome: 'aihs', descricao: 'AIHs cadastradas' }
        ];

        let totalRegistrosRemovidos = 0;

        for (const tabela of tabelasParaLimpar) {
            try {
                const antes = await get(`SELECT COUNT(*) as total FROM ${tabela.nome}`);
                await run(`DELETE FROM ${tabela.nome}`);
                console.log(`   ✅ ${tabela.descricao}: ${antes.total} registros removidos`);
                totalRegistrosRemovidos += antes.total;
            } catch (err) {
                console.log(`   ⚠️ ${tabela.nome}: ${err.message}`);
            }
        }

        console.log(`\n📊 Total de registros removidos: ${totalRegistrosRemovidos}`);

        // 5. Resetar auto_increment das tabelas limpas
        console.log('\n🔄 RESETANDO AUTO_INCREMENT...');
        for (const tabela of tabelasParaLimpar) {
            try {
                await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [tabela.nome]);
                console.log(`   ✅ ${tabela.nome}: Auto-increment resetado para 1`);
            } catch (err) {
                // Ignorar erros (tabela pode não ter auto-increment)
            }
        }

        // 6. Registrar a limpeza nos logs (se houver usuário admin)
        console.log('\n📝 REGISTRANDO LIMPEZA NO LOG...');
        try {
            // Verificar se existe algum usuário administrador
            const admin = await get('SELECT id FROM administradores LIMIT 1');
            if (admin) {
                await run(`
                    INSERT INTO logs_acesso (usuario_id, acao, data_hora) 
                    VALUES (?, 'Limpeza seletiva de dados executada', CURRENT_TIMESTAMP)
                `, [admin.id]);
                console.log('   ✅ Limpeza registrada no log');
            }
        } catch (err) {
            console.log('   ⚠️ Não foi possível registrar no log:', err.message);
        }

        // 7. Reabilitar foreign keys
        await run('PRAGMA foreign_keys = ON');
        console.log('\n🔒 Foreign keys reabilitadas');

        // 8. Verificação final
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        const statsFinais = await get(`
            SELECT 
                (SELECT COUNT(*) FROM aihs) as total_aihs,
                (SELECT COUNT(*) FROM movimentacoes) as total_movimentacoes,
                (SELECT COUNT(*) FROM glosas) as total_glosas,
                (SELECT COUNT(*) FROM atendimentos) as total_atendimentos,
                (SELECT COUNT(*) FROM logs_acesso) as total_logs_acesso,
                (SELECT COUNT(*) FROM logs_exclusao) as total_logs_exclusao,
                (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                (SELECT COUNT(*) FROM profissionais) as total_profissionais,
                (SELECT COUNT(*) FROM tipos_glosa) as total_tipos_glosa
        `);
        
        console.log(`   - AIHs: ${statsFinais.total_aihs} registros`);
        console.log(`   - Movimentações: ${statsFinais.total_movimentacoes} registros`);
        console.log(`   - Glosas: ${statsFinais.total_glosas} registros`);
        console.log(`   - Atendimentos: ${statsFinais.total_atendimentos} registros`);
        console.log(`   - Logs de acesso: ${statsFinais.total_logs_acesso} registros`);
        console.log(`   - Logs de exclusão: ${statsFinais.total_logs_exclusao} registros`);
        console.log(`   - Usuários: ${statsFinais.total_usuarios} registros (MANTIDOS)`);
        console.log(`   - Profissionais: ${statsFinais.total_profissionais} registros (MANTIDOS)`);
        console.log(`   - Tipos de glosa: ${statsFinais.total_tipos_glosa} registros (MANTIDOS)`);

        // 9. Otimizar banco após limpeza
        console.log('\n⚡ OTIMIZANDO BANCO DE DADOS...');
        await run('VACUUM');
        await run('ANALYZE');
        await run('PRAGMA optimize');
        console.log('   ✅ Banco otimizado');

        // 10. Checkpoint do WAL para limpar arquivos temporários
        await run('PRAGMA wal_checkpoint(TRUNCATE)');
        console.log('   ✅ Arquivos WAL limpos');

        console.log('\n🎉 LIMPEZA SELETIVA CONCLUÍDA COM SUCESSO!');
        console.log('\n📋 RESUMO:');
        console.log(`   • ${totalRegistrosRemovidos} registros de dados removidos`);
        console.log('   • Todas as AIHs, movimentações e glosas foram removidas');
        console.log('   • Todos os logs foram limpos');
        console.log('   • Usuários, profissionais e tipos de glosa foram MANTIDOS');
        console.log('   • Backup de segurança criado antes da limpeza');
        console.log('   • Banco otimizado e pronto para novos dados');
        console.log('\n✨ Sistema pronto para receber novos dados, mantendo todas as configurações!');

        // 11. Mostrar configurações mantidas
        console.log('\n🔧 CONFIGURAÇÕES MANTIDAS:');
        
        const usuarios = await all('SELECT nome, matricula FROM usuarios ORDER BY nome');
        console.log(`   👥 Usuários (${usuarios.length}):`);
        usuarios.forEach(u => console.log(`      - ${u.nome} (${u.matricula})`));
        
        const profissionais = await all('SELECT nome, especialidade FROM profissionais ORDER BY especialidade, nome');
        console.log(`   👨‍⚕️ Profissionais (${profissionais.length}):`);
        profissionais.forEach(p => console.log(`      - ${p.nome} (${p.especialidade})`));
        
        const tiposGlosa = await all('SELECT descricao FROM tipos_glosa ORDER BY descricao');
        console.log(`   📝 Tipos de Glosa (${tiposGlosa.length}):`);
        tiposGlosa.forEach(t => console.log(`      - ${t.descricao}`));

    } catch (err) {
        console.error('\n❌ ERRO durante a limpeza seletiva:', err);
        console.log('\n🔧 Tente executar novamente ou restaure o backup se necessário');
        throw err;
    }
};

// Executar se chamado diretamente
if (require.main === module) {
    limparApenasGlosas()
        .then(() => {
            console.log('\n✅ Limpeza seletiva concluída com sucesso!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Limpeza seletiva falhou:', err);
            process.exit(1);
        });
}

module.exports = { limparApenasGlosas };
