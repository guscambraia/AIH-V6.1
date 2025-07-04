
const fetch = require('node-fetch');

class IntegrationTests {
    constructor() {
        this.baseUrl = 'http://localhost:5000';
        this.results = { passed: 0, failed: 0, total: 0 };
        this.authToken = null;
    }

    async run() {
        console.log('🔗 Iniciando Testes de Integração...');
        
        const tests = [
            { name: 'Fluxo completo de AIH', test: this.testCompleteAIHFlow.bind(this) },
            { name: 'Sistema de autenticação', test: this.testAuthenticationSystem.bind(this) },
            { name: 'Integração relatórios/exportação', test: this.testReportExportIntegration.bind(this) },
            { name: 'Fluxo de glosas', test: this.testGlosaFlow.bind(this) },
            { name: 'Gestão de profissionais', test: this.testProfessionalsManagement.bind(this) },
            { name: 'Sistema de backup', test: this.testBackupSystem.bind(this) }
        ];

        for (const { name, test } of tests) {
            await this.runTest(name, test);
        }

        return this.results;
    }

    async runTest(name, testFn) {
        this.results.total++;
        console.log(`  🧪 ${name}...`);
        
        try {
            await testFn();
            console.log(`    ✅ Passou`);
            this.results.passed++;
        } catch (err) {
            console.log(`    ❌ Falhou: ${err.message}`);
            this.results.failed++;
        }
    }

    async testCompleteAIHFlow() {
        // Teste do fluxo completo: login -> criar AIH -> movimentações -> consultar
        
        // 1. Fazer login
        const authResponse = await this.makeRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'admin', senha: 'admin123' })
        });
        
        if (!authResponse.token) {
            throw new Error('Login falhou');
        }
        
        this.authToken = authResponse.token;

        // 2. Criar AIH
        const aihData = {
            numero_aih: `INTEGRATION-${Date.now()}`,
            valor_inicial: 2500.00,
            competencia: '07/2025',
            atendimentos: ['INT001', 'INT002']
        };

        const createResponse = await this.makeRequest('/aih', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(aihData)
        });

        if (!createResponse.success) {
            throw new Error('Criação de AIH falhou');
        }

        const aihId = createResponse.id;

        // 3. Consultar AIH criada
        const getResponse = await this.makeRequest(`/aih/${aihData.numero_aih}`, {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (getResponse.numero_aih !== aihData.numero_aih) {
            throw new Error('AIH não foi encontrada após criação');
        }

        // 4. Criar primeira movimentação (entrada SUS)
        const movimentacao1 = {
            tipo: 'entrada_sus',
            status_aih: 3,
            valor_conta: 2400.00,
            competencia: '07/2025',
            prof_medicina: 'Dr. Integração',
            prof_enfermagem: 'Enf. Teste',
            prof_fisioterapia: '',
            prof_bucomaxilo: '',
            observacoes: 'Teste de integração'
        };

        const mov1Response = await this.makeRequest(`/aih/${aihId}/movimentacao`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(movimentacao1)
        });

        if (!mov1Response.success) {
            throw new Error('Primeira movimentação falhou');
        }

        // 5. Verificar se o dashboard foi atualizado
        const dashboardResponse = await this.makeRequest('/dashboard', {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (typeof dashboardResponse.total_aihs_geral !== 'number') {
            throw new Error('Dashboard não foi atualizado corretamente');
        }

        console.log(`    📊 Fluxo completado: AIH ${aihData.numero_aih} criada e processada`);
    }

    async testAuthenticationSystem() {
        // Testar sistema de autenticação completo
        
        // 1. Login com credenciais corretas
        const validLogin = await this.makeRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'admin', senha: 'admin123' })
        });

        if (!validLogin.token) {
            throw new Error('Login válido falhou');
        }

        // 2. Testar acesso com token válido
        const dashboardAccess = await this.makeRequest('/dashboard', {
            headers: { 'Authorization': `Bearer ${validLogin.token}` }
        });

        if (!dashboardAccess.total_aihs_geral) {
            throw new Error('Acesso com token válido falhou');
        }

        // 3. Testar login com credenciais inválidas
        try {
            await this.makeRequest('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: 'admin', senha: 'senha_errada' })
            });
            throw new Error('Login inválido foi aceito');
        } catch (err) {
            if (!err.message.includes('HTTP 401')) {
                throw new Error('Login inválido não retornou erro correto');
            }
        }

        // 4. Testar acesso sem token
        try {
            await this.makeRequest('/dashboard');
            throw new Error('Acesso sem token foi permitido');
        } catch (err) {
            if (!err.message.includes('HTTP 401')) {
                throw new Error('Acesso sem token não foi bloqueado corretamente');
            }
        }

        console.log(`    🔐 Sistema de autenticação funcionando corretamente`);
    }

    async testReportExportIntegration() {
        // Testar integração entre geração de relatórios e exportação
        if (!this.authToken) {
            await this.testCompleteAIHFlow(); // Garantir que temos token
        }

        // 1. Gerar relatório
        const reportResponse = await this.makeRequest('/relatorios/estatisticas-periodo', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ competencia: '07/2025' })
        });

        if (!reportResponse.resultado) {
            throw new Error('Geração de relatório falhou');
        }

        // 2. Exportar relatório 
        const exportResponse = await fetch(`${this.baseUrl}/api/relatorios/estatisticas-periodo/export`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ competencia: '07/2025' })
        });

        if (!exportResponse.ok) {
            throw new Error('Exportação de relatório falhou');
        }

        const contentType = exportResponse.headers.get('content-type');
        if (!contentType.includes('application/vnd.ms-excel')) {
            throw new Error('Formato de exportação incorreto');
        }

        console.log(`    📊 Integração relatório/exportação funcionando`);
    }

    async testGlosaFlow() {
        // Testar fluxo completo de glosas
        if (!this.authToken) {
            await this.testCompleteAIHFlow();
        }

        // 1. Criar AIH para teste de glosas
        const aihData = {
            numero_aih: `GLOSA-${Date.now()}`,
            valor_inicial: 3000.00,
            competencia: '07/2025',
            atendimentos: ['GLOSA001']
        };

        const createResponse = await this.makeRequest('/aih', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(aihData)
        });

        const aihId = createResponse.id;

        // 2. Adicionar tipo de glosa
        const tipoGlosaResponse = await this.makeRequest('/tipos-glosa', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ descricao: 'Teste Integração' })
        });

        if (!tipoGlosaResponse.success) {
            throw new Error('Criação de tipo de glosa falhou');
        }

        // 3. Adicionar glosa à AIH
        const glosaData = {
            linha: 'Material cirúrgico',
            tipo: 'Teste Integração',
            profissional: 'Dr. Glosa',
            quantidade: 2
        };

        const glosaResponse = await this.makeRequest(`/aih/${aihId}/glosas`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(glosaData)
        });

        if (!glosaResponse.success) {
            throw new Error('Adição de glosa falhou');
        }

        // 4. Verificar glosas da AIH
        const glosasResponse = await this.makeRequest(`/aih/${aihId}/glosas`, {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!glosasResponse.glosas || glosasResponse.glosas.length === 0) {
            throw new Error('Glosa não foi encontrada após criação');
        }

        const glosaId = glosasResponse.glosas[0].id;

        // 5. Remover glosa
        const removeGlosaResponse = await this.makeRequest(`/glosas/${glosaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!removeGlosaResponse.success) {
            throw new Error('Remoção de glosa falhou');
        }

        console.log(`    🏷️ Fluxo de glosas funcionando corretamente`);
    }

    async testProfessionalsManagement() {
        // Testar gestão de profissionais
        if (!this.authToken) {
            await this.testCompleteAIHFlow();
        }

        // 1. Listar profissionais existentes
        const listResponse = await this.makeRequest('/profissionais', {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        const initialCount = listResponse.profissionais.length;

        // 2. Adicionar novo profissional
        const profData = {
            nome: `Dr. Teste Integration ${Date.now()}`,
            especialidade: 'Medicina'
        };

        const createProfResponse = await this.makeRequest('/profissionais', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profData)
        });

        if (!createProfResponse.success) {
            throw new Error('Criação de profissional falhou');
        }

        const profId = createProfResponse.id;

        // 3. Verificar se foi adicionado
        const newListResponse = await this.makeRequest('/profissionais', {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (newListResponse.profissionais.length !== initialCount + 1) {
            throw new Error('Profissional não foi adicionado à lista');
        }

        // 4. Remover profissional
        const deleteProfResponse = await this.makeRequest(`/profissionais/${profId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!deleteProfResponse.success) {
            throw new Error('Remoção de profissional falhou');
        }

        console.log(`    👨‍⚕️ Gestão de profissionais funcionando`);
    }

    async testBackupSystem() {
        // Testar sistema de backup
        if (!this.authToken) {
            await this.testCompleteAIHFlow();
        }

        // 1. Testar backup do banco
        const backupResponse = await fetch(`${this.baseUrl}/api/backup`, {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!backupResponse.ok) {
            throw new Error('Download de backup falhou');
        }

        const contentDisposition = backupResponse.headers.get('content-disposition');
        if (!contentDisposition || !contentDisposition.includes('backup-aih')) {
            throw new Error('Arquivo de backup com nome incorreto');
        }

        // 2. Verificar estatísticas do sistema
        const statsResponse = await this.makeRequest('/admin/stats', {
            headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!statsResponse.success || !statsResponse.stats) {
            throw new Error('Estatísticas do sistema não disponíveis');
        }

        console.log(`    💾 Sistema de backup funcionando`);
    }

    async makeRequest(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
}

module.exports = new IntegrationTests();
