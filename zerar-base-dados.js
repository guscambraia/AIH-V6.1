
const { db, run, all, get } = require('./database');
const fs = require('fs');
const path = require('path');

const zerarBaseDados = async () => {
    console.log('🗑️ INICIANDO PROCESSO DE LIMPEZA COMPLETA DA BASE DE DADOS...\n');
    
    try {
        // 1. Fazer backup antes de zerar (segurança)
        console.log('📦 Criando backup de segurança...');
        const { createBackup } = require('./database');
        const backupPath = await createBackup();
        console.log(`✅ Backup criado: ${backupPath}\n`);

        // 2. Desabilitar foreign keys temporariamente
        await run('PRAGMA foreign_keys = OFF');
        console.log('🔓 Foreign keys desabilitadas\n');

        // 3. Listar todas as tabelas antes da limpeza
        const tabelas = await all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `);

        console.log('📊 TABELAS ENCONTRADAS:');
        for (const tabela of tabelas) {
            const count = await get(`SELECT COUNT(*) as total FROM ${tabela.name}`);
            console.log(`   - ${tabela.name}: ${count.total} registros`);
        }
        console.log('');

        // 4. Zerar todas as tabelas de dados (preservando estrutura)
        console.log('🧹 ZERANDO TABELAS...');
        
        // Ordem específica para respeitar foreign keys
        const tabelasParaZerar = [
            'logs_exclusao',
            'logs_acesso', 
            'glosas',
            'movimentacoes',
            'atendimentos',
            'aihs',
            'usuarios',
            'profissionais',
            'tipos_glosa'
        ];

        for (const nomeTabela of tabelasParaZerar) {
            try {
                const antes = await get(`SELECT COUNT(*) as total FROM ${nomeTabela}`);
                await run(`DELETE FROM ${nomeTabela}`);
                console.log(`   ✅ ${nomeTabela}: ${antes.total} registros removidos`);
            } catch (err) {
                console.log(`   ⚠️ ${nomeTabela}: ${err.message}`);
            }
        }

        // 5. Resetar auto_increment das tabelas
        console.log('\n🔄 RESETANDO AUTO_INCREMENT...');
        for (const nomeTabela of tabelasParaZerar) {
            try {
                await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [nomeTabela]);
                console.log(`   ✅ ${nomeTabela}: Auto-increment resetado`);
            } catch (err) {
                // Ignorar erros (tabela pode não ter auto-increment)
            }
        }

        // 6. Recriar dados essenciais do sistema
        console.log('\n🏗️ RECRIANDO DADOS ESSENCIAIS...');

        // Recriar administrador padrão
        const bcrypt = require('bcryptjs');
        const senhaHash = await bcrypt.hash('admin', 10);
        await run(`INSERT INTO administradores (usuario, senha_hash) VALUES (?, ?)`, 
            ['admin', senhaHash]);
        console.log('   ✅ Administrador padrão recriado (usuário: admin, senha: admin)');

        // Recriar tipos de glosa padrão
        const tiposGlosa = [
            'Material não autorizado',
            'Quantidade excedente', 
            'Procedimento não autorizado',
            'Falta de documentação',
            'Divergência de valores'
        ];

        for (const tipo of tiposGlosa) {
            await run(`INSERT INTO tipos_glosa (descricao) VALUES (?)`, [tipo]);
        }
        console.log(`   ✅ ${tiposGlosa.length} tipos de glosa padrão recriados`);

        // 7. Reabilitar foreign keys
        await run('PRAGMA foreign_keys = ON');
        console.log('\n🔒 Foreign keys reabilitadas');

        // 8. Otimizar banco após limpeza
        console.log('\n⚡ OTIMIZANDO BANCO DE DADOS...');
        await run('VACUUM');
        await run('ANALYZE');
        await run('PRAGMA optimize');
        console.log('   ✅ Banco otimizado');

        // 9. Verificação final
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        for (const tabela of tabelas) {
            const count = await get(`SELECT COUNT(*) as total FROM ${tabela.name}`);
            console.log(`   - ${tabela.name}: ${count.total} registros`);
        }

        // 10. Limpar arquivos temporários e cache
        console.log('\n🧽 LIMPANDO ARQUIVOS TEMPORÁRIOS...');
        
        // Limpar backups antigos (manter apenas o mais recente)
        const backupDir = path.join(__dirname, 'backups');
        if (fs.existsSync(backupDir)) {
            const arquivos = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('aih-backup-') && f.endsWith('.db'))
                .sort()
                .reverse();
            
            // Manter apenas os 3 backups mais recentes
            for (let i = 3; i < arquivos.length; i++) {
                fs.unlinkSync(path.join(backupDir, arquivos[i]));
                console.log(`   🗑️ Backup antigo removido: ${arquivos[i]}`);
            }
        }

        // Checkpoint do WAL para limpar arquivos temporários
        await run('PRAGMA wal_checkpoint(TRUNCATE)');
        console.log('   ✅ Arquivos WAL limpos');

        console.log('\n🎉 BASE DE DADOS ZERADA COM SUCESSO!');
        console.log('\n📋 RESUMO:');
        console.log('   • Todas as AIHs, movimentações e glosas foram removidas');
        console.log('   • Todos os usuários foram removidos');
        console.log('   • Administrador padrão recriado (admin/admin)');
        console.log('   • Tipos de glosa padrão recriados');
        console.log('   • Backup de segurança criado antes da limpeza');
        console.log('   • Banco otimizado e pronto para uso profissional');
        console.log('\n⚠️ IMPORTANTE:');
        console.log('   • Altere a senha do administrador após o primeiro login');
        console.log('   • Crie os usuários necessários para sua equipe');
        console.log('   • Configure os profissionais do sistema');
        console.log('\n✨ O sistema está pronto para uso profissional!');

    } catch (err) {
        console.error('\n❌ ERRO durante a limpeza:', err);
        console.log('\n🔧 Tente executar novamente ou restaure o backup se necessário');
        throw err;
    }
};

// Executar se chamado diretamente
if (require.main === module) {
    zerarBaseDados()
        .then(() => {
            console.log('\n✅ Processo concluído com sucesso!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Processo falhou:', err);
            process.exit(1);
        });
}

module.exports = { zerarBaseDados };
