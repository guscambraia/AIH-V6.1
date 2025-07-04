
const fetch = require('node-fetch');

class PerformanceTests {
    constructor() {
        this.baseUrl = 'http://localhost:5000';
        this.results = { passed: 0, failed: 0, total: 0, performance: '' };
        this.benchmarks = {
            dashboard: 200,     // ms
            aih_creation: 150,  // ms
            search: 300,        // ms
            report: 2000,       // ms
            export: 5000        // ms
        };
    }

    async run() {
        console.log('⚡ Iniciando Testes de Performance...');
        
        const tests = [
            { name: 'Performance do Dashboard', test: this.testDashboardPerformance.bind(this) },
            { name: 'Performance de Criação de AIH', test: this.testAIHCreationPerformance.bind(this) },
            { name: 'Performance de Pesquisa', test: this.testSearchPerformance.bind(this) },
            { name: 'Performance de Relatórios', test: this.testReportPerformance.bind(this) },
            { name: 'Performance de Exportação', test: this.testExportPerformance.bind(this) },
            { name: 'Teste de Memória', test: this.testMemoryUsage.bind(this) }
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
            const startTime = Date.now();
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`    ✅ Passou (${duration}ms)`);
            this.results.passed++;
        } catch (err) {
            console.log(`    ❌ Falhou: ${err.message}`);
            this.results.failed++;
        }
    }

    async testDashboardPerformance() {
        const token = await this.getAuthToken();
        const iterations = 10;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            await this.makeRequest('/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const duration = Date.now() - startTime;
            times.push(duration);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);

        console.log(`    📊 Dashboard - Média: ${avgTime.toFixed(1)}ms, Máximo: ${maxTime}ms`);

        if (avgTime > this.benchmarks.dashboard) {
            throw new Error(`Dashboard muito lento: ${avgTime.toFixed(1)}ms (limite: ${this.benchmarks.dashboard}ms)`);
        }

        if (maxTime > this.benchmarks.dashboard * 2) {
            throw new Error(`Pico de dashboard muito alto: ${maxTime}ms`);
        }
    }

    async testAIHCreationPerformance() {
        const token = await this.getAuthToken();
        const iterations = 20;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const aihData = {
                numero_aih: `PERF${Date.now()}-${i}`,
                valor_inicial: Math.random() * 5000 + 1000,
                competencia: '07/2025',
                atendimentos: [`PERF-${i}-1`, `PERF-${i}-2`]
            };

            const startTime = Date.now();
            
            await this.makeRequest('/aih', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aihData)
            });
            
            const duration = Date.now() - startTime;
            times.push(duration);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);

        console.log(`    🏥 Criação AIH - Média: ${avgTime.toFixed(1)}ms, Máximo: ${maxTime}ms`);

        if (avgTime > this.benchmarks.aih_creation) {
            throw new Error(`Criação de AIH muito lenta: ${avgTime.toFixed(1)}ms (limite: ${this.benchmarks.aih_creation}ms)`);
        }
    }

    async testSearchPerformance() {
        const token = await this.getAuthToken();
        const searchTypes = [
            { filtros: { status: [1, 2, 3, 4] } },
            { filtros: { competencia: '07/2025' } },
            { filtros: { status: [2, 3], competencia: '07/2025' } },
            { filtros: { numero_aih: 'PERF' } }
        ];

        const allTimes = [];

        for (const search of searchTypes) {
            const iterations = 5;
            const times = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                
                await this.makeRequest('/pesquisar', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(search)
                });
                
                const duration = Date.now() - startTime;
                times.push(duration);
            }

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            allTimes.push(...times);

            console.log(`    🔍 Pesquisa ${JSON.stringify(search.filtros)}: ${avgTime.toFixed(1)}ms`);
        }

        const overallAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
        const maxTime = Math.max(...allTimes);

        if (overallAvg > this.benchmarks.search) {
            throw new Error(`Pesquisa muito lenta: ${overallAvg.toFixed(1)}ms (limite: ${this.benchmarks.search}ms)`);
        }

        if (maxTime > this.benchmarks.search * 3) {
            throw new Error(`Pico de pesquisa muito alto: ${maxTime}ms`);
        }
    }

    async testReportPerformance() {
        const token = await this.getAuthToken();
        const reports = [
            'estatisticas-periodo',
            'detalhamento-status',
            'produtividade-auditores'
        ];

        for (const reportType of reports) {
            const startTime = Date.now();
            
            await this.makeRequest(`/relatorios/${reportType}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ competencia: '07/2025' })
            });
            
            const duration = Date.now() - startTime;

            console.log(`    📊 Relatório ${reportType}: ${duration}ms`);

            if (duration > this.benchmarks.report) {
                throw new Error(`Relatório ${reportType} muito lento: ${duration}ms (limite: ${this.benchmarks.report}ms)`);
            }
        }
    }

    async testExportPerformance() {
        const token = await this.getAuthToken();
        
        const startTime = Date.now();
        
        const response = await fetch(`${this.baseUrl}/api/relatorios/estatisticas-periodo/export`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ competencia: '07/2025' })
        });

        if (!response.ok) {
            throw new Error(`Exportação falhou: ${response.status}`);
        }

        // Consumir o stream para medir tempo real
        const buffer = await response.buffer();
        const duration = Date.now() - startTime;

        console.log(`    📤 Exportação Excel: ${duration}ms (${(buffer.length / 1024).toFixed(1)}KB)`);

        if (duration > this.benchmarks.export) {
            throw new Error(`Exportação muito lenta: ${duration}ms (limite: ${this.benchmarks.export}ms)`);
        }
    }

    async testMemoryUsage() {
        const token = await this.getAuthToken();
        
        // Capturar uso de memória inicial
        const initialMemory = process.memoryUsage();
        
        // Executar operações que consomem memória
        const operations = [];
        
        // Múltiplas consultas simultâneas
        for (let i = 0; i < 10; i++) {
            operations.push(
                this.makeRequest('/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            );
        }

        // Geração de relatório
        operations.push(
            this.makeRequest('/relatorios/estatisticas-periodo', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ competencia: '07/2025' })
            })
        );

        await Promise.all(operations);

        // Capturar uso de memória final
        const finalMemory = process.memoryUsage();
        
        const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
        const currentMemoryMB = finalMemory.heapUsed / 1024 / 1024;

        console.log(`    🧠 Memória atual: ${currentMemoryMB.toFixed(1)}MB, Aumento: ${memoryIncrease.toFixed(1)}MB`);

        // Verificar se não há vazamentos grosseiros
        if (memoryIncrease > 50) { // Limite: 50MB de aumento
            throw new Error(`Possível vazamento de memória: aumento de ${memoryIncrease.toFixed(1)}MB`);
        }

        // Verificar uso total de memória
        if (currentMemoryMB > 200) { // Limite: 200MB total
            throw new Error(`Uso de memória muito alto: ${currentMemoryMB.toFixed(1)}MB`);
        }
    }

    async getAuthToken() {
        const response = await this.makeRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'admin', senha: 'admin123' })
        });
        return response.token;
    }

    async makeRequest(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
}

module.exports = new PerformanceTests();
