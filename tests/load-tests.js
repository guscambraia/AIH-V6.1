
const fetch = require('node-fetch');

class LoadTests {
    constructor() {
        this.baseUrl = 'http://localhost:5000';
        this.results = { passed: 0, failed: 0, total: 0, performance: '' };
        this.metrics = {
            responseTime: [],
            throughput: 0,
            errorRate: 0
        };
    }

    async run() {
        console.log('⚡ Iniciando Testes de Carga...');
        
        const tests = [
            { name: 'Simulação de dia normal (50 AIHs)', test: this.testNormalDay.bind(this) },
            { name: 'Pico de trabalho (200 AIHs/hora)', test: this.testPeakHours.bind(this) },
            { name: 'Uso concorrente de múltiplos usuários', test: this.testMultiUser.bind(this) },
            { name: 'Geração de relatórios em horário de pico', test: this.testReportGeneration.bind(this) },
            { name: 'Simulação de 6 meses de operação', test: this.testLongTermUsage.bind(this) }
        ];

        for (const { name, test } of tests) {
            await this.runTest(name, test);
        }

        this.results.performance = this.generatePerformanceReport();
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

    async testNormalDay() {
        // Simular um dia normal: 50 AIHs + movimentações + consultas
        const token = await this.getAuthToken();
        const operations = [];
        
        // Criar 50 AIHs
        for (let i = 0; i < 50; i++) {
            operations.push({
                type: 'create_aih',
                data: {
                    numero_aih: `LOAD${Date.now()}-${i}`,
                    valor_inicial: Math.random() * 5000 + 1000,
                    competencia: '07/2025',
                    atendimentos: [`LOAD-${i}-1`, `LOAD-${i}-2`]
                }
            });
        }

        // Adicionar consultas de dashboard (usuários verificando status)
        for (let i = 0; i < 20; i++) {
            operations.push({ type: 'dashboard' });
        }

        // Adicionar algumas pesquisas
        for (let i = 0; i < 10; i++) {
            operations.push({ type: 'search' });
        }

        // Executar operações de forma escalonada (simular uso real)
        const startTime = Date.now();
        const batchSize = 10;
        
        for (let i = 0; i < operations.length; i += batchSize) {
            const batch = operations.slice(i, i + batchSize);
            const promises = batch.map(op => this.executeOperation(token, op));
            
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`    📦 Lote ${Math.floor(i/batchSize) + 1}: ${successful}/${batch.length} sucessos`);
            
            // Pequena pausa entre lotes (simular uso real)
            await this.sleep(100);
        }

        const totalTime = Date.now() - startTime;
        const throughput = operations.length / (totalTime / 1000); // operações por segundo

        if (throughput < 2) { // Mínimo 2 operações por segundo
            throw new Error(`Throughput muito baixo: ${throughput.toFixed(2)} ops/s`);
        }

        console.log(`    📊 Throughput: ${throughput.toFixed(2)} operações/segundo`);
    }

    async testPeakHours() {
        // Simular horário de pico: alta concorrência
        const token = await this.getAuthToken();
        const concurrentUsers = 8; // 8 usuários simultâneos
        const operationsPerUser = 25; // 25 operações cada

        const userPromises = [];
        
        for (let user = 0; user < concurrentUsers; user++) {
            userPromises.push(this.simulateUserSession(token, user, operationsPerUser));
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(userPromises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        if (successful < concurrentUsers * 0.9) { // 90% dos usuários devem completar
            throw new Error(`Muitos usuários falharam: ${successful}/${concurrentUsers}`);
        }

        const totalOps = concurrentUsers * operationsPerUser;
        const throughput = totalOps / (duration / 1000);

        console.log(`    🚀 ${successful} usuários completaram ${totalOps} operações em ${duration}ms`);
        console.log(`    📈 Throughput pico: ${throughput.toFixed(2)} ops/s`);

        if (throughput < 5) { // Mínimo 5 operações por segundo no pico
            throw new Error(`Throughput de pico muito baixo: ${throughput.toFixed(2)} ops/s`);
        }
    }

    async testMultiUser() {
        // Testar comportamento com múltiplos usuários fazendo operações diferentes
        const scenarios = [
            { users: 3, operation: 'dashboard_intensive' },
            { users: 2, operation: 'aih_creation' },
            { users: 2, operation: 'report_generation' },
            { users: 1, operation: 'data_export' }
        ];

        const allPromises = [];

        for (const scenario of scenarios) {
            for (let i = 0; i < scenario.users; i++) {
                allPromises.push(this.runUserScenario(scenario.operation, i));
            }
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(allPromises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const totalUsers = scenarios.reduce((sum, s) => sum + s.users, 0);

        if (successful < totalUsers * 0.85) {
            throw new Error(`Muitos cenários falharam: ${successful}/${totalUsers}`);
        }

        console.log(`    👥 ${successful}/${totalUsers} cenários de usuário completados em ${duration}ms`);
    }

    async testReportGeneration() {
        // Testar geração de relatórios sob carga
        const token = await this.getAuthToken();
        const reportTypes = [
            'estatisticas-periodo',
            'detalhamento-status',
            'produtividade-auditores',
            'analise-valores-glosas',
            'ranking-glosas-frequentes'
        ];

        // Gerar cada relatório 3 vezes simultaneamente
        const promises = [];
        
        for (const reportType of reportTypes) {
            for (let i = 0; i < 3; i++) {
                promises.push(this.generateReport(token, reportType));
            }
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        if (successful < promises.length * 0.9) {
            throw new Error(`Muitos relatórios falharam: ${successful}/${promises.length}`);
        }

        // Relatórios devem ser gerados em tempo razoável mesmo sob carga
        if (duration > 15000) {
            throw new Error(`Relatórios muito lentos sob carga: ${duration}ms`);
        }

        console.log(`    📊 ${successful} relatórios gerados em ${duration}ms`);
    }

    async testLongTermUsage() {
        // Simular uso a longo prazo com dados acumulados
        const token = await this.getAuthToken();
        
        // Criar dados para simular 6 meses de operação (600 AIHs)
        console.log('    📅 Simulando 6 meses de dados...');
        
        const batches = 12; // 12 lotes de 50 AIHs cada
        const batchSize = 50;
        
        for (let batch = 0; batch < batches; batch++) {
            const promises = [];
            
            for (let i = 0; i < batchSize; i++) {
                const aihData = {
                    numero_aih: `LONG${Date.now()}-${batch}-${i}`,
                    valor_inicial: Math.random() * 8000 + 1000,
                    competencia: this.getRandomCompetencia(),
                    atendimentos: [`LONG-${batch}-${i}-1`]
                };
                
                promises.push(this.createAIH(token, aihData));
            }
            
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`      Lote ${batch + 1}: ${successful}/${batchSize} AIHs criadas`);
            
            // Pequena pausa entre lotes
            await this.sleep(200);
        }

        // Testar performance com dados acumulados
        const testOperations = [
            () => this.makeRequest('/dashboard', { headers: { 'Authorization': `Bearer ${token}` }}),
            () => this.makeRequest('/pesquisar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ filtros: { status: [1, 2, 3, 4] }})
            }),
            () => this.generateReport(token, 'estatisticas-periodo')
        ];

        const opStartTime = Date.now();
        const opResults = await Promise.allSettled(testOperations.map(op => op()));
        const opDuration = Date.now() - opStartTime;

        const opSuccessful = opResults.filter(r => r.status === 'fulfilled').length;
        
        if (opSuccessful !== testOperations.length) {
            throw new Error(`Performance degradada com dados acumulados: ${opSuccessful}/${testOperations.length}`);
        }

        if (opDuration > 5000) {
            throw new Error(`Operações muito lentas com dados acumulados: ${opDuration}ms`);
        }

        console.log(`    📈 Performance com dados acumulados: ${opDuration}ms para operações essenciais`);
    }

    async simulateUserSession(token, userId, operations) {
        const userOperations = [];
        
        for (let i = 0; i < operations; i++) {
            const opType = this.getRandomOperation();
            userOperations.push(this.executeOperation(token, opType));
            
            // Pequena variação no timing (simular uso humano)
            await this.sleep(Math.random() * 50 + 10);
        }

        const results = await Promise.allSettled(userOperations);
        const successful = results.filter(r => r.status === 'fulfilled').length;

        if (successful < operations * 0.8) {
            throw new Error(`Usuário ${userId} teve muitas falhas: ${successful}/${operations}`);
        }

        return { userId, successful, total: operations };
    }

    async runUserScenario(scenarioType, userId) {
        const token = await this.getAuthToken();
        
        switch (scenarioType) {
            case 'dashboard_intensive':
                // Usuário consultando dashboard frequentemente
                for (let i = 0; i < 20; i++) {
                    await this.makeRequest('/dashboard', { 
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    await this.sleep(100);
                }
                break;
                
            case 'aih_creation':
                // Usuário cadastrando AIHs
                for (let i = 0; i < 10; i++) {
                    await this.createAIH(token, {
                        numero_aih: `SCENARIO-${scenarioType}-${userId}-${i}`,
                        valor_inicial: Math.random() * 5000 + 1000,
                        competencia: '07/2025',
                        atendimentos: [`SCEN-${i}`]
                    });
                    await this.sleep(200);
                }
                break;
                
            case 'report_generation':
                // Usuário gerando relatórios
                const reports = ['estatisticas-periodo', 'detalhamento-status'];
                for (const report of reports) {
                    await this.generateReport(token, report);
                    await this.sleep(1000);
                }
                break;
                
            case 'data_export':
                // Usuário exportando dados
                await this.makeRequest('/export/json', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                break;
        }

        return { scenario: scenarioType, userId };
    }

    async executeOperation(token, operation) {
        switch (operation.type || operation) {
            case 'create_aih':
                return await this.createAIH(token, operation.data);
            case 'dashboard':
                return await this.makeRequest('/dashboard', { 
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            case 'search':
                return await this.makeRequest('/pesquisar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filtros: { status: [2, 3] }})
                });
            default:
                throw new Error(`Operação desconhecida: ${operation.type || operation}`);
        }
    }

    getRandomOperation() {
        const operations = ['dashboard', 'search', 'create_aih'];
        const weights = [0.5, 0.3, 0.2]; // Dashboard mais frequente
        
        const random = Math.random();
        let accumulated = 0;
        
        for (let i = 0; i < operations.length; i++) {
            accumulated += weights[i];
            if (random <= accumulated) {
                if (operations[i] === 'create_aih') {
                    return {
                        type: 'create_aih',
                        data: {
                            numero_aih: `RAND${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            valor_inicial: Math.random() * 5000 + 1000,
                            competencia: '07/2025',
                            atendimentos: [`RAND-${Date.now()}`]
                        }
                    };
                }
                return operations[i];
            }
        }
        
        return 'dashboard';
    }

    getRandomCompetencia() {
        const competencias = ['01/2025', '02/2025', '03/2025', '04/2025', '05/2025', '06/2025', '07/2025'];
        return competencias[Math.floor(Math.random() * competencias.length)];
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

    async generateReport(token, type) {
        return await this.makeRequest(`/relatorios/${type}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ competencia: '07/2025' })
        });
    }

    async makeRequest(endpoint, options = {}) {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);
            const duration = Date.now() - startTime;
            
            this.metrics.responseTime.push(duration);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (err) {
            this.metrics.errorRate++;
            throw err;
        }
    }

    generatePerformanceReport() {
        const responseTimes = this.metrics.responseTime;
        if (responseTimes.length === 0) return 'Sem dados de performance';

        const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const sorted = [...responseTimes].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const max = Math.max(...responseTimes);

        return `Tempo médio: ${avg.toFixed(1)}ms, P95: ${p95}ms, Máximo: ${max}ms, Erros: ${this.metrics.errorRate}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new LoadTests();
