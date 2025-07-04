
const fetch = require('node-fetch');

class StressTests {
    constructor() {
        this.baseUrl = 'http://localhost:5000';
        this.results = { passed: 0, failed: 0, total: 0, performance: '' };
    }

    async run() {
        console.log('🔥 Iniciando Testes de Estresse...');
        
        const tests = [
            { name: 'Cadastro massivo de AIHs', test: this.testMassiveAIHCreation.bind(this) },
            { name: 'Consultas simultâneas', test: this.testConcurrentQueries.bind(this) },
            { name: 'Geração de relatórios sob carga', test: this.testReportsUnderLoad.bind(this) },
            { name: 'Múltiplas movimentações simultâneas', test: this.testConcurrentMovements.bind(this) },
            { name: 'Estresse do banco de dados', test: this.testDatabaseStress.bind(this) }
        ];

        for (const { name, test } of tests) {
            await this.runTest(name, test);
        }

        return this.results;
    }

    async runTest(name, testFn) {
        this.results.total++;
        console.log(`  🧪 ${name}...`);
        
        const startTime = Date.now();
        try {
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`    ✅ Passou (${duration}ms)`);
            this.results.passed++;
        } catch (err) {
            console.log(`    ❌ Falhou: ${err.message}`);
            this.results.failed++;
        }
    }

    async testMassiveAIHCreation() {
        // Simular cadastro de 100 AIHs em lote (equivalente a um mês de trabalho)
        const token = await this.getAuthToken();
        const promises = [];
        const batchSize = 100;

        for (let i = 0; i < batchSize; i++) {
            const aihData = {
                numero_aih: `STRESS${Date.now()}-${i}`,
                valor_inicial: Math.random() * 10000 + 1000,
                competencia: '07/2025',
                atendimentos: [`ATD-${i}-1`, `ATD-${i}-2`]
            };

            promises.push(this.createAIH(token, aihData));
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`    📊 ${successful} sucessos, ${failed} falhas em ${duration}ms`);
        
        if (successful < batchSize * 0.95) { // Aceitar 5% de falha
            throw new Error(`Taxa de sucesso muito baixa: ${successful}/${batchSize}`);
        }

        // Performance esperada: < 50ms por AIH em média
        const avgTime = duration / batchSize;
        if (avgTime > 100) {
            throw new Error(`Performance ruim: ${avgTime}ms por AIH (limite: 100ms)`);
        }
    }

    async testConcurrentQueries() {
        // Testar 50 consultas simultâneas ao dashboard
        const token = await this.getAuthToken();
        const concurrentRequests = 50;
        const promises = [];

        for (let i = 0; i < concurrentRequests; i++) {
            promises.push(this.makeRequest('/dashboard', { 
                headers: { 'Authorization': `Bearer ${token}` }
            }));
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        if (successful < concurrentRequests * 0.98) { // 98% de sucesso mínimo
            throw new Error(`Muitas falhas em consultas simultâneas: ${successful}/${concurrentRequests}`);
        }

        // Tempo máximo aceitável: 5s para 50 consultas
        if (duration > 5000) {
            throw new Error(`Consultas muito lentas: ${duration}ms para ${concurrentRequests} requests`);
        }

        console.log(`    ⚡ ${successful} consultas em ${duration}ms (${(duration/concurrentRequests).toFixed(1)}ms/req)`);
    }

    async testReportsUnderLoad() {
        // Gerar múltiplos relatórios simultaneamente
        const token = await this.getAuthToken();
        const reports = [
            'estatisticas-periodo',
            'detalhamento-status', 
            'produtividade-auditores'
        ];

        const promises = reports.map(tipo => 
            this.makeRequest(`/relatorios/${tipo}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    competencia: '07/2025'
                })
            })
        );

        const startTime = Date.now();
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        if (successful !== reports.length) {
            throw new Error(`Falha na geração de relatórios: ${successful}/${reports.length}`);
        }

        // Relatórios devem gerar em menos de 10s
        if (duration > 10000) {
            throw new Error(`Relatórios muito lentos: ${duration}ms`);
        }

        console.log(`    📊 ${reports.length} relatórios gerados em ${duration}ms`);
    }

    async testConcurrentMovements() {
        // Testar criação simultânea de movimentações
        const token = await this.getAuthToken();
        
        // Primeiro criar uma AIH para usar nos testes
        const testAih = await this.createAIH(token, {
            numero_aih: `MOVEMENT-TEST-${Date.now()}`,
            valor_inicial: 5000,
            competencia: '07/2025',
            atendimentos: ['MOV-TEST-1']
        });

        // Tentar criar múltiplas movimentações (algumas devem falhar por regras de negócio)
        const movements = [];
        for (let i = 0; i < 10; i++) {
            movements.push({
                tipo: i % 2 === 0 ? 'entrada_sus' : 'saida_hospital',
                status_aih: 2,
                valor_conta: 4800,
                competencia: '07/2025',
                prof_medicina: 'Dr. Teste',
                prof_enfermagem: 'Enf. Teste',
                prof_fisioterapia: '',
                prof_bucomaxilo: ''
            });
        }

        const promises = movements.map(movement => 
            this.makeRequest(`/aih/${testAih.id}/movimentacao`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(movement)
            })
        );

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;

        // Pelo menos uma movimentação deve passar (a primeira entrada)
        if (successful === 0) {
            throw new Error('Nenhuma movimentação foi criada com sucesso');
        }

        console.log(`    🔄 ${successful} movimentações criadas de ${movements.length} tentativas`);
    }

    async testDatabaseStress() {
        // Testar operações intensivas no banco
        const token = await this.getAuthToken();
        
        // Fazer muitas consultas de pesquisa complexa
        const searchPromises = [];
        for (let i = 0; i < 20; i++) {
            searchPromises.push(
                this.makeRequest('/pesquisar', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filtros: {
                            status: [1, 2, 3, 4],
                            competencia: '07/2025'
                        }
                    })
                })
            );
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(searchPromises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        if (successful < searchPromises.length * 0.95) {
            throw new Error(`Muitas consultas falharam: ${successful}/${searchPromises.length}`);
        }

        if (duration > 8000) {
            throw new Error(`Consultas muito lentas: ${duration}ms`);
        }

        console.log(`    🗄️ ${successful} consultas complexas em ${duration}ms`);
    }

    async getAuthToken() {
        const response = await this.makeRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'admin', senha: 'admin123' })
        });
        return response.token;
    }

    async createAIH(token, data) {
        return await this.makeRequest('/aih', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    }

    async makeRequest(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
}

module.exports = new StressTests();
