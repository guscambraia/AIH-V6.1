
const { validateAIH, validateMovimentacao } = require('../database');

class UnitTests {
    constructor() {
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    async run() {
        console.log('🔬 Iniciando Testes Unitários...');
        
        const tests = [
            { name: 'Validação de AIH - dados válidos', test: this.testValidAIH.bind(this) },
            { name: 'Validação de AIH - dados inválidos', test: this.testInvalidAIH.bind(this) },
            { name: 'Validação de movimentação - dados válidos', test: this.testValidMovimentacao.bind(this) },
            { name: 'Validação de movimentação - dados inválidos', test: this.testInvalidMovimentacao.bind(this) },
            { name: 'Formatação de competência', test: this.testCompetenciaFormat.bind(this) },
            { name: 'Validação de valores monetários', test: this.testMonetaryValidation.bind(this) }
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

    testValidAIH() {
        const validAIH = {
            numero_aih: '1234567890123',
            valor_inicial: 1500.50,
            competencia: '07/2025',
            atendimentos: ['ATD001', 'ATD002']
        };

        const errors = validateAIH(validAIH);
        
        if (errors.length > 0) {
            throw new Error(`AIH válida foi rejeitada: ${errors.join(', ')}`);
        }
    }

    testInvalidAIH() {
        const invalidAIHs = [
            { numero_aih: '', valor_inicial: 1500, competencia: '07/2025' }, // Número vazio
            { numero_aih: '123', valor_inicial: -100, competencia: '07/2025' }, // Valor negativo
            { numero_aih: '123', valor_inicial: 1500, competencia: '13/2025' }, // Competência inválida
            { numero_aih: '123', valor_inicial: 'abc', competencia: '07/2025' }, // Valor não numérico
        ];

        for (const invalidAIH of invalidAIHs) {
            const errors = validateAIH(invalidAIH);
            
            if (errors.length === 0) {
                throw new Error(`AIH inválida foi aceita: ${JSON.stringify(invalidAIH)}`);
            }
        }
    }

    testValidMovimentacao() {
        const validMovimentacao = {
            tipo: 'entrada_sus',
            valor_conta: 1400.00,
            competencia: '07/2025',
            prof_enfermagem: 'Enf. Maria',
            prof_medicina: 'Dr. Silva'
        };

        const errors = validateMovimentacao(validMovimentacao);
        
        if (errors.length > 0) {
            throw new Error(`Movimentação válida foi rejeitada: ${errors.join(', ')}`);
        }
    }

    testInvalidMovimentacao() {
        const invalidMovimentacoes = [
            { tipo: 'invalido', valor_conta: 1400 }, // Tipo inválido
            { tipo: 'entrada_sus', valor_conta: -100 }, // Valor negativo
            { tipo: 'entrada_sus', valor_conta: 1400, prof_enfermagem: '' }, // Sem enfermagem
        ];

        for (const invalidMov of invalidMovimentacoes) {
            const errors = validateMovimentacao(invalidMov);
            
            if (errors.length === 0) {
                throw new Error(`Movimentação inválida foi aceita: ${JSON.stringify(invalidMov)}`);
            }
        }
    }

    testCompetenciaFormat() {
        const validFormats = ['01/2025', '12/2024', '07/2025'];
        const invalidFormats = ['13/2025', '00/2025', '1/2025', '01/25', 'abc/2025'];

        for (const valid of validFormats) {
            const regex = /^\d{2}\/\d{4}$/;
            const monthValid = parseInt(valid.substr(0, 2)) >= 1 && parseInt(valid.substr(0, 2)) <= 12;
            
            if (!regex.test(valid) || !monthValid) {
                throw new Error(`Competência válida foi rejeitada: ${valid}`);
            }
        }

        for (const invalid of invalidFormats) {
            const regex = /^\d{2}\/\d{4}$/;
            const monthValid = regex.test(invalid) ? 
                (parseInt(invalid.substr(0, 2)) >= 1 && parseInt(invalid.substr(0, 2)) <= 12) : false;
            
            if (regex.test(invalid) && monthValid) {
                throw new Error(`Competência inválida foi aceita: ${invalid}`);
            }
        }
    }

    testMonetaryValidation() {
        const validValues = [0, 0.01, 100, 1500.50, 999999.99];
        const invalidValues = [-1, -0.01, 'abc', null, undefined, NaN];

        for (const valid of validValues) {
            const isValid = typeof valid === 'number' && !isNaN(valid) && valid >= 0;
            
            if (!isValid) {
                throw new Error(`Valor monetário válido foi rejeitado: ${valid}`);
            }
        }

        for (const invalid of invalidValues) {
            const isValid = typeof invalid === 'number' && !isNaN(invalid) && invalid >= 0;
            
            if (isValid) {
                throw new Error(`Valor monetário inválido foi aceito: ${invalid}`);
            }
        }
    }
}

module.exports = new UnitTests();
