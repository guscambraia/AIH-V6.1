
const fs = require('fs');
const path = require('path');

// Importar módulos de teste
const loadTests = require('./load-tests');
const stressTests = require('./stress-tests');
const unitTests = require('./unit-tests');
const integrationTests = require('./integration-tests');
const performanceTests = require('./performance-tests');

class TestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.startTime = Date.now();
    }

    async runAll() {
        console.log('🧪 INICIANDO SUITE COMPLETA DE TESTES');
        console.log('=====================================\n');

        const testSuites = [
            { name: 'Testes Unitários', runner: unitTests.run },
            { name: 'Testes de Integração', runner: integrationTests.run },
            { name: 'Testes de Performance', runner: performanceTests.run },
            { name: 'Testes de Carga', runner: loadTests.run },
            { name: 'Testes de Estresse', runner: stressTests.run }
        ];

        for (const suite of testSuites) {
            console.log(`🔄 Executando: ${suite.name}`);
            console.log('-'.repeat(50));
            
            try {
                const result = await suite.runner();
                this.processResult(suite.name, result);
            } catch (err) {
                console.error(`❌ Erro em ${suite.name}:`, err.message);
                this.results.failed++;
                this.results.details.push({
                    suite: suite.name,
                    status: 'ERRO',
                    error: err.message
                });
            }
            
            console.log('\n');
        }

        this.generateReport();
    }

    processResult(suiteName, result) {
        this.results.total += result.total;
        this.results.passed += result.passed;
        this.results.failed += result.failed;
        
        this.results.details.push({
            suite: suiteName,
            ...result
        });
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(2);

        console.log('📊 RELATÓRIO FINAL DE TESTES');
        console.log('============================');
        console.log(`⏱️  Duração total: ${duration}ms`);
        console.log(`✅ Aprovados: ${this.results.passed}`);
        console.log(`❌ Falharam: ${this.results.failed}`);
        console.log(`📈 Taxa de sucesso: ${successRate}%`);
        console.log('\n📋 Detalhes por Suite:');
        
        this.results.details.forEach(detail => {
            const status = detail.failed === 0 ? '✅' : '❌';
            console.log(`${status} ${detail.suite}: ${detail.passed}/${detail.total} aprovados`);
            
            if (detail.performance) {
                console.log(`   ⚡ Performance: ${detail.performance}`);
            }
        });

        // Salvar relatório
        this.saveReport();
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary: this.results,
            environment: {
                node_version: process.version,
                platform: process.platform,
                memory: process.memoryUsage()
            }
        };

        const reportPath = path.join(__dirname, 'reports', `test-report-${Date.now()}.json`);
        
        if (!fs.existsSync(path.dirname(reportPath))) {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Relatório salvo em: ${reportPath}`);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAll().catch(console.error);
}

module.exports = TestRunner;
