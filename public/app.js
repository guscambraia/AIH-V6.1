// Estado da aplicação
let state = {
    token: localStorage.getItem('token'),
    usuario: null,
    aihAtual: null,
    telaAnterior: null,
    glosasPendentes: []
};

// Verificar se há token válido ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    if (state.token) {
        try {
            // Tentar validar o token fazendo uma requisição simples
            const userType = localStorage.getItem('userType');

            if (userType === 'admin') {
                // Para admin, ir direto para tela de gestão
                mostrarTela('telaGestaoUsuarios');
                carregarUsuarios();
            } else {
                // Para usuário normal, validar token e ir para dashboard
                await carregarDashboard();
                mostrarTela('telaPrincipal');
            }
        } catch (err) {
            console.log('Token inválido, redirecionando para login');
            state.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('userType');
            mostrarTela('telaLogin');
        }
    } else {
        mostrarTela('telaLogin');
    }
});

// API Helper
const api = async (endpoint, options = {}) => {
    const config = {
        method: 'GET',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(`/api${endpoint}`, config);

        // Verificar se a resposta é JSON válida
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Resposta não é JSON:', text);
            throw new Error('Resposta inválida do servidor');
        }

        if (!response.ok) {
            throw new Error(data.error || `Erro HTTP ${response.status}`);
        }

        return data;
    } catch (err) {
        console.error('Erro API:', {
            endpoint: endpoint,
            method: config.method,
            error: err.message,
            stack: err.stack
        });
        throw err;
    }
};

// Navegação
const mostrarTela = (telaId) => {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.classList.remove('ativa');
    });
    document.getElementById(telaId).classList.add('ativa');

    // Controlar atualização automática baseado na tela
    if (telaId === 'telaPrincipal') {
        // Iniciar atualização automática ao entrar na tela principal
        setTimeout(() => {
            iniciarAtualizacaoAutomatica();
        }, 1000); // Aguardar 1 segundo para garantir que o dashboard carregou
    } else {
        // Parar atualização automática ao sair da tela principal
        pararAtualizacaoAutomatica();
    }
};

const voltarTelaPrincipal = () => {
    mostrarTela('telaPrincipal');
    carregarDashboard();

    // Limpar campo da AIH se estiver na tela de informar AIH
    setTimeout(() => {
        const campoNumeroAIH = document.getElementById('numeroBuscarAIH');
        if (campoNumeroAIH) {
            campoNumeroAIH.value = '';
        }
    }, 100);
};

const voltarTelaAnterior = () => {
    try {
        console.log('Voltando para tela anterior:', state.telaAnterior);

        if (state.telaAnterior) {
            const telaDestino = state.telaAnterior;

            // Limpar tela anterior para evitar loops
            state.telaAnterior = null;

            mostrarTela(telaDestino);

            // Se voltando para tela de movimentação, recarregar dados para atualizar glosas
            if (telaDestino === 'telaMovimentacao') {
                console.log('Recarregando dados da movimentação...');
                // Usar setTimeout para garantir que a tela foi renderizada
                setTimeout(() => {
                    carregarDadosMovimentacao();
                    // Reconfigurar event listeners após carregar dados
                    setTimeout(() => {
                        configurarEventListenersMovimentacao();
                    }, 300);
                }, 150);
            }
            // Se voltando para tela de informações AIH, recarregar AIH atualizada
            else if (telaDestino === 'telaInfoAIH' && state.aihAtual) {
                console.log('Recarregando AIH atualizada com glosas...');
                api(`/aih/${state.aihAtual.numero_aih}`)
                    .then(aih => {
                        console.log('AIH recarregada com sucesso, glosas:', aih.glosas);
                        state.aihAtual = aih;
                        mostrarInfoAIH(aih);
                    })
                    .catch(err => {
                        console.error('Erro ao recarregar AIH:', err);
                        // Se der erro, pelo menos mostrar a tela anterior
                        mostrarTela(telaDestino);
                    });
            }
        } else {
            // Se não há tela anterior, voltar ao dashboard
            console.log('Nenhuma tela anterior definida, voltando ao dashboard');
            mostrarTela('telaPrincipal');
            carregarDashboard();
        }
    } catch (error) {
        console.error('Erro ao voltar para tela anterior:', error);
        // Fallback: sempre tentar voltar ao dashboard
        mostrarTela('telaPrincipal');
        carregarDashboard();
    }
};

// Modal
const mostrarModal = (titulo, mensagem) => {
    return new Promise((resolve) => {
        const modalTitulo = document.getElementById('modalTitulo');
        const modalMensagem = document.getElementById('modalMensagem');
        const modal = document.getElementById('modal');
        const btnSim = document.getElementById('modalBtnSim');
        const btnNao = document.getElementById('modalBtnNao');

        if (!modalTitulo || !modalMensagem || !modal || !btnSim || !btnNao) {
            console.error('Elementos do modal não encontrados. Usando confirm nativo.');
            resolve(confirm(`${titulo}\n\n${mensagem}`));
            return;
        }

        modalTitulo.textContent = titulo;
        modalMensagem.textContent = mensagem;
        modal.classList.add('ativo');

        const fecharModal = (resultado) => {
            modal.classList.remove('ativo');
            btnSim.removeEventListener('click', simHandler);
            btnNao.removeEventListener('click', naoHandler);
            resolve(resultado);
        };

        const simHandler = () => fecharModal(true);
        const naoHandler = () => fecharModal(false);

        btnSim.addEventListener('click', simHandler);
        btnNao.addEventListener('click', naoHandler);
    });
};

// Login
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    try {
        submitButton.textContent = 'Entrando...';
        submitButton.disabled = true;

        const nome = document.getElementById('loginUsuario').value.trim();
        const senha = document.getElementById('loginSenha').value;

        if (!nome || !senha) {
            throw new Error('Por favor, preencha todos os campos');
        }

        const result = await api('/login', {
            method: 'POST',
            body: JSON.stringify({ nome, senha })
        });

        if (result && result.token && result.usuario) {
            state.token = result.token;
            state.usuario = result.usuario;
            state.admin = null; // Limpar admin
            localStorage.setItem('token', result.token);
            localStorage.setItem('userType', 'user');

            // Atualizar interface
            const nomeUsuarioElement = document.getElementById('nomeUsuario');
            if (nomeUsuarioElement) {
                nomeUsuarioElement.textContent = result.usuario.nome;
            }

            console.log('Login realizado com sucesso:', result.usuario.nome);

            // Redirecionar para tela principal
            mostrarTela('telaPrincipal');
            await carregarDashboard();
        } else {
            throw new Error('Resposta inválida do servidor');
        }
    } catch (err) {
        console.error('Erro no login:', err);
        alert('Erro no login: ' + err.message);
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});

// Link para gerenciar usuários
document.getElementById('linkGerenciarUsuarios').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarTela('telaAdminUsuarios');
});

// Voltar para login
document.getElementById('linkVoltarLogin').addEventListener('click', (e) => {
    e.preventDefault();
    mostrarTela('telaLogin');
});

// Login de administrador
document.getElementById('formLoginAdmin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    try {
        submitButton.textContent = 'Entrando...';
        submitButton.disabled = true;

        const usuario = document.getElementById('adminUsuario').value.trim();
        const senha = document.getElementById('adminSenha').value;

        if (!usuario || !senha) {
            throw new Error('Por favor, preencha todos os campos');
        }

        const result = await api('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ usuario, senha })
        });

        if (result && result.token && result.admin) {
            state.token = result.token;
            state.admin = result.admin;
            state.usuario = null; // Limpar usuário normal
            localStorage.setItem('token', result.token);
            localStorage.setItem('userType', 'admin');

            console.log('Login de admin realizado com sucesso');

            mostrarTela('telaGestaoUsuarios');
            await carregarUsuarios();
        } else {
            throw new Error('Resposta inválida do servidor');
        }
    } catch (err) {
        console.error('Erro no login de administrador:', err);
        alert('Erro no login de administrador: ' + err.message);
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});

// Voltar para login principal
window.voltarLogin = () => {
    // Parar atualização automática ao voltar para login
    pararAtualizacaoAutomatica();

    state.token = null;
    state.admin = null;
    state.usuario = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    mostrarTela('telaLogin');
};

// Carregar lista de usuários
const carregarUsuarios = async () => {
    try {
        const response = await api('/admin/usuarios');
        const container = document.getElementById('listaUsuarios');

        if (response && response.usuarios && Array.isArray(response.usuarios)) {
            container.innerHTML = response.usuarios.map(u => `
                <div class="glosa-item">
                    <div>
                        <strong>${u.nome}</strong> - Matrícula: ${u.matricula}
                        <br>
                        <span style="color: #64748b; font-size: 0.875rem;">
                            Cadastrado em: ${new Date(u.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                    <button onclick="excluirUsuario(${u.id}, '${u.nome}')" class="btn-danger" style="padding: 0.5rem 1rem;">
                        Excluir
                    </button>
                </div>
            `).join('') || '<p>Nenhum usuário cadastrado</p>';
        } else {
            container.innerHTML = '<p>Erro ao carregar usuários</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        const container = document.getElementById('listaUsuarios');
        if (container) {
            container.innerHTML = '<p>Erro ao carregar usuários. Tente novamente.</p>';
        }
    }
};

// Excluir usuário
window.excluirUsuario = async (id, nome) => {
    // Verificar se é admin
    const userType = localStorage.getItem('userType');
    if (userType !== 'admin') {
        alert('Erro: Apenas administradores podem excluir usuários');
        return;
    }

    const confirmar = await mostrarModal(
        'Excluir Usuário',
        `Tem certeza que deseja excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmar) return;

    try {
        await api(`/admin/usuarios/${id}`, { method: 'DELETE' });
        alert('Usuário excluído com sucesso!');
        carregarUsuarios();
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        alert('Erro ao excluir usuário: ' + err.message);
    }
};

// Adicionar novo usuário
document.getElementById('formNovoUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const dados = {
            nome: document.getElementById('novoUsuarioNome').value,
            matricula: document.getElementById('novoUsuarioMatricula').value,
            senha: document.getElementById('novoUsuarioSenha').value
        };

        await api('/admin/usuarios', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('Usuário cadastrado com sucesso!');
        document.getElementById('formNovoUsuario').reset();
        carregarUsuarios();
    } catch (err) {
        alert('Erro ao cadastrar usuário: ' + err.message);
    }
});

// Alterar senha do administrador
document.getElementById('formAlterarSenhaAdmin').addEventListener('submit', async (e) => {
    e.preventDefault();

    const novaSenha = document.getElementById('novaSenhaAdmin').value;
    const confirmarSenha = document.getElementById('confirmarSenhaAdmin').value;

    if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
    }

    if (novaSenha.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres!');
        return;
    }

    const confirmar = await mostrarModal(
        'Alterar Senha',
        'Tem certeza que deseja alterar a senha do administrador?'
    );

    if (!confirmar) return;

    try {
        await api('/admin/alterar-senha', {
            method: 'POST',
            body: JSON.stringify({ novaSenha })
        });

        alert('Senha do administrador alterada com sucesso!');
        document.getElementById('formAlterarSenhaAdmin').reset();
    } catch (err) {
        alert('Erro ao alterar senha: ' + err.message);
    }
});

// Logout
document.getElementById('btnSair').addEventListener('click', () => {
    // Parar atualização automática ao fazer logout
    pararAtualizacaoAutomatica();

    state.token = null;
    state.usuario = null;
    state.admin = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    mostrarTela('telaLogin');
});

// Helpers
const getStatusDescricao = (status) => {
    const descricoes = {
        1: '✅ Finalizada - Aprovação Direta (SUS aprovado)',
        2: '🔄 Ativa - Aprovação Indireta (Aguardando hospital)',
        3: '⚠️ Ativa - Em Discussão (Divergências identificadas ou aguardando análise Auditoria SUS)',
        4: '✅ Finalizada - Após Discussão (Resolvida)'
    };
    return descricoes[status] || '❓ Status Desconhecido';
};

// Obter competência atual
const getCompetenciaAtual = () => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${mes}/${ano}`;
};

// Animar números
const animarNumero = (elementId, valorFinal) => {
    const elemento = document.getElementById(elementId);
    const valorInicial = parseInt(elemento.textContent) || 0;
    const duracao = 1000; // 1 segundo
    const incremento = (valorFinal - valorInicial) / (duracao / 16);
    let valorAtual = valorInicial;

    const timer = setInterval(() => {
        valorAtual += incremento;
        if ((incremento > 0 && valorAtual >= valorFinal) || 
            (incremento < 0 && valorAtual <= valorFinal)) {
            valorAtual = valorFinal;
            clearInterval(timer);
        }
        elemento.textContent = Math.round(valorAtual);
    }, 16);
};

// Dashboard aprimorado com seletor de competência
const carregarDashboard = async (competenciaSelecionada = null) => {
    try {
        // Se não foi passada competência, usar a atual
        const competencia = competenciaSelecionada || getCompetenciaAtual();

        // Buscar dados do dashboard com a competência
        const dados = await api(`/dashboard?competencia=${competencia}`);

        // Criar/atualizar seletor de competência
        let seletorContainer = document.querySelector('.seletor-competencia-container');
        if (!seletorContainer) {
            // Criar container do seletor apenas se não existir
            const dashboardContainer = document.querySelector('.dashboard');
            seletorContainer = document.createElement('div');
            seletorContainer.className = 'seletor-competencia-container';
            dashboardContainer.parentNode.insertBefore(seletorContainer, dashboardContainer);
        }

        // Sempre atualizar o conteúdo do seletor
        seletorContainer.innerHTML = `
            <div class="seletor-competencia">
                <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <label for="selectCompetencia" style="margin: 0;">Competência:</label>
                    <select id="selectCompetencia" onchange="carregarDashboard(this.value)">
                        ${dados.competencias_disponiveis.map(comp => 
                            `<option value="${comp}" ${comp === competencia ? 'selected' : ''}>${comp}</option>`
                        ).join('')}
                    </select>
                    <button onclick="atualizarDashboardManual()" id="btnAtualizarDashboard" 
                            style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                                   color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
                                   cursor: pointer; font-weight: 500; transition: all 0.2s ease;
                                   display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <span id="iconAtualizarDashboard">🔄</span>
                        <span id="textoAtualizarDashboard">Atualizar Agora</span>
                    </button>
                    <span class="competencia-info">📅 Visualizando dados de ${competencia}</span>
                </div>
                <div id="statusAtualizacao" style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b; text-align: center; min-height: 20px;">
                    <span id="ultimaAtualizacao">Última atualização: ${new Date().toLocaleTimeString('pt-BR')}</span>
                </div>
            </div>
        `;

        // Atualizar cards do dashboard
        const dashboard = document.querySelector('.dashboard');
        dashboard.innerHTML = `
            <!-- Card 1: Em Processamento na Competência -->
            <div class="stat-card clickable-card" onclick="visualizarAIHsPorCategoria('em_processamento', '${competencia}')" 
                 style="cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">📊</div>
                <h3>Em Processamento</h3>
                <p class="stat-number" id="emProcessamentoCompetencia">${dados.em_processamento_competencia}</p>
                <p class="stat-subtitle">AIHs em análise em ${competencia}</p>
                <p class="stat-detail">📋 Estas AIHs estão na Auditoria SUS em processamento</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>

            <!-- Card 2: Finalizadas na Competência -->
            <div class="stat-card success clickable-card" onclick="visualizarAIHsPorCategoria('finalizadas', '${competencia}')"
                 style="cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">✅</div>
                <h3>Finalizadas</h3>
                <p class="stat-number" id="finalizadasCompetencia">${dados.finalizadas_competencia}</p>
                <p class="stat-subtitle">AIHs concluídas em ${competencia}</p>
                <p class="stat-detail">🤝 Estas AIHs já tiveram sua auditoria concluída com concordância de ambas auditorias</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>

            <!-- Card 3: Com Pendências na Competência -->
            <div class="stat-card warning clickable-card" onclick="visualizarAIHsPorCategoria('com_pendencias', '${competencia}')"
                 style="cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">⚠️</div>
                <h3>Com Pendências</h3>
                <p class="stat-number" id="comPendenciasCompetencia">${dados.com_pendencias_competencia}</p>
                <p class="stat-subtitle">AIHs com glosas em ${competencia}</p>
                <p class="stat-detail">🔄 Estas AIHs estão com alguma pendência passível de recurso e discussão pelas partes envolvidas</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>

            <!-- Card 4: Total Geral em Processamento -->
            <div class="stat-card info clickable-card" onclick="visualizarAIHsPorCategoria('total_processamento', 'geral')"
                 style="cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">🏥</div>
                <h3>Total em Processamento</h3>
                <p class="stat-number" id="totalProcessamentoGeral">${dados.total_em_processamento_geral}</p>
                <p class="stat-subtitle">Desde o início do sistema</p>
                <p class="stat-detail">📊 Total: ${dados.total_entradas_sus} entradas - ${dados.total_saidas_hospital} saídas</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>

            <!-- Card 5: Total Finalizadas (Histórico Geral) -->
            <div class="stat-card success clickable-card" onclick="visualizarAIHsPorCategoria('total_finalizadas', 'geral')" 
                 style="border-left: 4px solid #10b981; cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">🎯</div>
                <h3>Total Finalizadas</h3>
                <p class="stat-number" id="totalFinalizadasGeral">${dados.total_finalizadas_geral}</p>
                <p class="stat-subtitle">Desde o início do sistema</p>
                <p class="stat-detail">✅ AIHs concluídas com auditoria finalizada</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>

            <!-- Card 6: Total Geral Cadastradas -->
            <div class="stat-card clickable-card" onclick="visualizarAIHsPorCategoria('total_cadastradas', 'geral')" 
                 style="border-left: 4px solid #6366f1; cursor: pointer; transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <div class="stat-icon">📈</div>
                <h3>Total Cadastradas</h3>
                <p class="stat-number" id="totalAIHsGeral">${dados.total_aihs_geral}</p>
                <p class="stat-subtitle">Desde o início do sistema</p>
                <p class="stat-detail">📋 Todas as AIHs registradas no sistema</p>
                <p class="stat-extra">✨ Clique para ver a lista detalhada</p>
            </div>
        `;

        // Adicionar seção de resumo financeiro
        const resumoFinanceiro = document.createElement('div');
        resumoFinanceiro.className = 'resumo-financeiro';
        resumoFinanceiro.innerHTML = `
            <h3>💰 Resumo Financeiro - ${competencia}</h3>
            <div class="resumo-cards">
                <div class="resumo-card">
                    <span class="resumo-label">Valor Inicial Total</span>
                    <span class="resumo-valor">R$ ${dados.valores_competencia.inicial.toFixed(2)}</span>
                </div>
                <div class="resumo-card">
                    <span class="resumo-label">Valor Atual Total</span>
                    <span class="resumo-valor">R$ ${dados.valores_competencia.atual.toFixed(2)}</span>
                </div>
                <div class="resumo-card">
                    <span class="resumo-label">Diferença Total (Glosas)</span>
                    <span class="resumo-valor" style="color: var(--danger)">R$ ${(dados.valores_competencia.inicial - dados.valores_competencia.atual).toFixed(2)}</span>
                </div>
                <div class="resumo-card">
                    <span class="resumo-label">Total de AIHs</span>
                    <span class="resumo-valor">${dados.total_aihs_competencia}</span>
                </div>
            </div>
        `;

        // Adicionar após o dashboard
        const dashboardContainer = document.querySelector('.dashboard');
        const resumoExistente = document.querySelector('.resumo-financeiro');
        if (resumoExistente) {
            resumoExistente.remove();
        }
        dashboardContainer.parentNode.insertBefore(resumoFinanceiro, dashboardContainer.nextSibling);

        // Animar números (opcional)
        animarNumeros();

        // Iniciar atualização automática apenas se estivermos na tela principal
        const telaPrincipal = document.getElementById('telaPrincipal');
        if (telaPrincipal && telaPrincipal.classList.contains('ativa')) {
            iniciarAtualizacaoAutomatica();
        }

    } catch (err) {
        console.error('Erro ao carregar dashboard:', {
            competencia: competenciaSelecionada,
            error: err.message,
            stack: err.stack
        });

        // Mostrar mensagem de erro no dashboard
        const dashboardElement = document.querySelector('.dashboard');
        if (dashboardElement) {
            dashboardElement.innerHTML = `
                <div class="erro-dashboard">
                    <p>⚠️ Erro ao carregar dados do dashboard</p>
                    <p style="font-size: 0.875rem; color: #64748b;">Erro: ${err.message}</p>
                    <button onclick="carregarDashboard()">Tentar novamente</button>
                </div>
            `;
        }
    }
};

// Sistema de atualização automática do dashboard
let intervaloDashboard = null;

const iniciarAtualizacaoAutomatica = () => {
    // Limpar intervalo anterior se existir
    if (intervaloDashboard) {
        clearInterval(intervaloDashboard);
    }

    // Configurar novo intervalo para atualizar a cada 30 segundos
    intervaloDashboard = setInterval(async () => {
        try {
            // Verificar se estamos na tela principal
            const telaPrincipal = document.getElementById('telaPrincipal');
            if (telaPrincipal && telaPrincipal.classList.contains('ativa')) {
                console.log('🔄 Atualizando dashboard automaticamente...');

                // Pegar competência atual selecionada
                const selectCompetencia = document.getElementById('selectCompetencia');
                const competenciaAtual = selectCompetencia ? selectCompetencia.value : getCompetenciaAtual();

                // Recarregar dashboard com a competência atual
                await carregarDashboard(competenciaAtual);

                console.log('✅ Dashboard atualizado automaticamente');
            }
        } catch (error) {
            console.error('❌ Erro na atualização automática:', error);
        }
    }, 30000); // 30 segundos

    console.log('🔄 Atualização automática do dashboard iniciada (30s)');
};

const pararAtualizacaoAutomatica = () => {
    if (intervaloDashboard) {
        clearInterval(intervaloDashboard);
        intervaloDashboard = null;
        console.log('⏹️ Atualização automática do dashboard parada');
    }
};

// Carregar dados para movimentação
const carregarDadosMovimentacao = async () => {
    try {
        console.log('Carregando dados da movimentação...');

        // Carregar profissionais para os selects
        const profissionais = await api('/profissionais');

        if (profissionais && profissionais.profissionais) {
            const especialidades = {
                'Medicina': 'movProfMedicina',
                'Enfermagem': 'movProfEnfermagem', 
                'Fisioterapia': 'movProfFisioterapia',
                'Bucomaxilo': 'movProfBucomaxilo'
            };

            // Limpar e preencher selects de profissionais
            Object.entries(especialidades).forEach(([especialidade, selectId]) => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Verificar se existe primeira opção, senão criar
                    const primeiraOpcao = select.querySelector('option');
                    const opcaoInicial = primeiraOpcao ? primeiraOpcao.outerHTML : `<option value="">Selecione - ${especialidade}</option>`;
                    select.innerHTML = opcaoInicial;

                    // Adicionar profissionais da especialidade
                    profissionais.profissionais
                        .filter(p => p.especialidade === especialidade)
                        .forEach(prof => {
                            const option = document.createElement('option');
                            option.value = prof.nome;
                            option.textContent = prof.nome;
                            select.appendChild(option);
                        });
                }
            });
        }

        // Buscar e pré-selecionar profissionais da última movimentação desta AIH
        if (state.aihAtual && state.aihAtual.id) {
            try {
                const ultimaMovimentacao = await api(`/aih/${state.aihAtual.id}/ultima-movimentacao`);

                if (ultimaMovimentacao && ultimaMovimentacao.movimentacao) {
                    const mov = ultimaMovimentacao.movimentacao;

                    // Pré-selecionar profissionais baseado na última movimentação
                    if (mov.prof_medicina) {
                        const selectMedicina = document.getElementById('movProfMedicina');
                        if (selectMedicina) {
                            selectMedicina.value = mov.prof_medicina;
                        }
                    }

                    if (mov.prof_enfermagem) {
                        const selectEnfermagem = document.getElementById('movProfEnfermagem');
                        if (selectEnfermagem) {
                            selectEnfermagem.value = mov.prof_enfermagem;
                        }
                    }

                    if (mov.prof_fisioterapia) {
                        const selectFisioterapia = document.getElementById('movProfFisioterapia');
                        if (selectFisioterapia) {
                            selectFisioterapia.value = mov.prof_fisioterapia;
                        }
                    }

                    if (mov.prof_bucomaxilo) {
                        const selectBucomaxilo = document.getElementById('movProfBucomaxilo');
                        if (selectBucomaxilo) {```text
                            selectBucomaxilo.value = mov.prof_bucomaxilo;
                        }
                    }

                    console.log('Profissionais pré-selecionados da última movimentação:', {
                        medicina: mov.prof_medicina,
                        enfermagem: mov.prof_enfermagem,
                        fisioterapia: mov.prof_fisioterapia,
                        bucomaxilo: mov.prof_bucomaxilo
                    });
                }
            } catch (err) {
                console.log('Não foi possível carregar profissionais anteriores:', err.message);
                // Não é um erro crítico, continua sem pré-seleção
            }
        }

        // Carregar glosas atuais se existirem
        if (state.aihAtual && state.aihAtual.id) {
            const glosas = await api(`/aih/${state.aihAtual.id}/glosas`);

            const listaGlosas = document.getElementById('listaGlosas');
            if (listaGlosas && glosas && glosas.glosas) {
                if (glosas.glosas.length > 0) {
                    // Ordenar glosas por data de criação (mais recente primeira)
                    const glosasOrdenadas = glosas.glosas.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

                    // Cabeçalho das colunas + conteúdo das glosas
                    listaGlosas.innerHTML = `
                        <div style="padding: 0.75rem 0; border-bottom: 2px solid #d1d5db; display: grid; grid-template-columns: 80px 100px 120px 1fr 40px; gap: 1rem; align-items: center; background: #f9fafb; margin: -1rem -1rem 1rem -1rem; padding-left: 1rem; padding-right: 1rem;">
                            <div style="font-size: 0.75rem; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                Data
                            </div>
                            <div style="font-size: 0.75rem; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                Linha do Item
                            </div>
                            <div style="font-size: 0.75rem; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                Profissional
                            </div>
                            <div style="font-size: 0.75rem; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                Tipo de Glosa/Pendência
                            </div>
                            <div style="font-size: 0.75rem; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">
                                Quantidade
                            </div>
                        </div>
                        ${glosasOrdenadas.map((g, index) => `
                            <div style="padding: 0.75rem 0; ${index < glosasOrdenadas.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''} display: grid; grid-template-columns: 80px 100px 120px 1fr 40px; gap: 1rem; align-items: center;">
                                <div style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">
                                    ${new Date(g.criado_em).toLocaleDateString('pt-BR')}
                                </div>
                                <div style="font-weight: 600; color: #92400e;">
                                    ${g.linha}
                                </div>
                                <div style="color: #374151; font-weight: 500;">
                                    ${g.profissional}
                                </div>
                                <div style="color: #7c2d12;">
                                    ${g.tipo}
                                </div>
                                <div style="text-align: center; font-weight: 600; color: #92400e;">
                                    ${g.quantidade || 1}
                                </div>
                            </div>
                        `).join('')}
                    `;
                } else {
                    listaGlosas.innerHTML = `
                        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 2rem; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 0.5rem;">✅</div>
                            <p style="color: #166534; font-weight: 600; margin: 0; font-size: 1.125rem;">
                                Nenhuma glosa ativa para esta AIH
                            </p>
                            <p style="color: #22c55e; font-size: 0.875rem; margin: 0.5rem 0 0 0; font-style: italic;">
                                Esta AIH está livre de pendências
                            </p>
                        </div>
                    `;
                }
            }
        }

        // Mostrar status atual da AIH
        const statusAtualDiv = document.getElementById('statusAtualAIH');
        if (statusAtualDiv && state.aihAtual) {
            statusAtualDiv.innerHTML = `
                <div style="background: #f0f9ff; border: 1px solid #0284c7; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <h4 style="color: #0284c7; margin-bottom: 0.5rem;">📋 Status Atual da AIH</h4>
                    <p style="margin: 0;">
                        <strong>AIH:</strong> ${state.aihAtual.numero_aih} | 
                        <strong>Status:</strong> <span class="status-badge status-${state.aihAtual.status}">${getStatusDescricao(state.aihAtual.status)}</span> | 
                        <strong>Valor Atual:</strong> R$ ${state.aihAtual.valor_atual.toFixed(2)}
                    </p>
                </div>
            `;
        }

        // Mostrar lembrete sobre status
        const lembreteDiv = document.getElementById('lembreteStatus');
        if (lembreteDiv) {
            lembreteDiv.innerHTML = `
                <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <h5 style="color: #92400e; margin-bottom: 0.5rem;">💡 Lembrete sobre Status</h5>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #92400e;">
                        <li><strong>Status 1:</strong> Finalizada com aprovação direta</li>
                        <li><strong>Status 2:</strong> Ativa com aprovação indireta</li>
                        <li><strong>Status 3:</strong> Ativa em discussão</li>
                        <li><strong>Status 4:</strong> Finalizada após discussão</li>
                    </ul>
                </div>
            `;
        }

        // Configurar event listeners dos botões após carregar todos os dados
        setTimeout(() => {
            configurarEventListenersMovimentacao();
        }, 300);

    } catch (err) {
        console.error('Erro ao carregar dados da movimentação:', err);
        alert('Erro ao carregar dados: ' + err.message);
    }
};

// Função auxiliar para animar os números
const animarNumeros = () => {
    const numeros = document.querySelectorAll('.stat-number');
    numeros.forEach(elemento => {
        const valorFinal = parseInt(elemento.textContent);
        let valorAtual = 0;
        const incremento = valorFinal / 30;

        const timer = setInterval(() => {
            valorAtual += incremento;
            if (valorAtual >= valorFinal) {
                valorAtual = valorFinal;
                clearInterval(timer);
            }
            elemento.textContent = Math.round(valorAtual);
        }, 30);
    });
};

// Mostrar informações da AIH
const mostrarInfoAIH = (aih) => {
    const content = document.getElementById('infoAIHContent');

    // Calcular diferença de valor
    const diferencaValor = aih.valor_inicial - aih.valor_atual;
    const percentualDiferenca = ((diferencaValor / aih.valor_inicial) * 100).toFixed(1);
    const valorGlosas = aih.valor_inicial - aih.valor_atual;

    content.innerHTML = `
        <div class="info-card">
            <h3>📋 AIH ${aih.numero_aih}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <p><strong>Status:</strong> <span class="status-badge status-${aih.status}">${getStatusDescricao(aih.status)}</span></p>
                <p><strong>Competência:</strong> ${aih.competencia}</p>
                <p><strong>Valor Inicial:</strong> R$ ${aih.valor_inicial.toFixed(2)}</p>
                <p><strong>Valor Atual:</strong> R$ ${aih.valor_atual.toFixed(2)}</p>
                <p><strong>Diferença:</strong> <span style="color: ${diferencaValor > 0 ? '#ef4444' : '#10b981'}">
                    R$ ${Math.abs(diferencaValor).toFixed(2)} (${percentualDiferenca}%)
                </span></p>
                <p><strong>Atendimentos:</strong> ${aih.atendimentos.length}</p>
            </div>
            <div style="margin-top: 1rem;">
                <strong>Números de Atendimento:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                    ${aih.atendimentos.map(at => `
                        <span style="background: #e0e7ff; color: #4f46e5; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">
                            ${at}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>

        ${aih.glosas.length > 0 ? `
            <div style="margin-top: 2rem; background: #fef3c7; padding: 1.5rem; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <h4 style="color: #92400e; margin: 0;">
                        ⚠️ Glosas Ativas (${aih.glosas.length})
                    </h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                        <button onclick="gerenciarGlosasFromInfo()" 
                                style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                                       color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; 
                                       cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;
                                       transition: all 0.2s ease; font-weight: 600; margin-right: 0.5rem;"
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            📋 Gerenciar Glosas
                        </button>
                        <button onclick="exportarGlosasAIH('csv')" 
                                style="background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                                       color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
                                       cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;
                                       transition: all 0.2s ease; min-width: 80px; justify-content: center;"
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            📄 CSV
                        </button>
                        <button onclick="exportarGlosasAIH('excel')" 
                                style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); 
                                       color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
                                       cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;
                                       transition: all 0.2s ease; min-width: 100px; justify-content: center;"
                                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            📊 Excel
                        </button>
                    </div>
                </div>

                <!-- Cabeçalho das colunas -->
                <div style="padding: 0.75rem 0; border-bottom: 2px solid #f59e0b; display: grid; grid-template-columns: 100px 120px 1fr 80px 100px; gap: 1rem; align-items: center; background: #fbbf24; margin: -1.5rem -1.5rem 1rem -1.5rem; padding-left: 1.5rem; padding-right: 1.5rem;">
                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        Linha Item
                    </div>
                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        Profissional
                    </div>
                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        Tipo de Glosa/Pendência
                    </div>
                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">
                        Quantidade
                    </div>
                    <div style="font-size: 0.75rem; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">
                        Data
                    </div>
                </div>

                <!-- Dados das glosas -->
                <div style="display: grid; gap: 0.5rem;">
                    ${aih.glosas.map((g, index) => `
                        <div style="background: white; padding: 1rem; border-radius: 8px; display: grid; grid-template-columns: 100px 120px 1fr 80px 100px; gap: 1rem; align-items: center; border: 1px solid #fbbf24;">
                            <div style="font-weight: 600; color: #92400e; font-size: 0.875rem;">
                                ${g.linha}
                            </div>
                            <div style="color: #374151; font-weight: 500; font-size: 0.875rem;">
                                ${g.profissional}
                            </div>
                            <div style="color: #7c2d12; font-size: 0.875rem;">
                                ${g.tipo}
                            </div>
                            <div style="text-align: center; font-weight: 600; color: #92400e;">
                                ${g.quantidade || 1}
                            </div>
                            <div style="text-align: center; font-size: 0.75rem; color: #92400e;">
                                ${new Date(g.criado_em).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div style="margin-top: 2rem;">
            <h4 style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                    📊 Histórico de Movimentações
                    <span style="background: #6366f1; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem;">
                        ${aih.movimentacoes.length}
                    </span>
                </span>
                <div style="display: flex; gap: 0.5rem; margin-left: auto; flex-wrap: wrap;">
                    <button onclick="exportarHistoricoMovimentacoes('csv')" 
                            style="background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                                   color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
                                   cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;
                                   transition: all 0.2s ease; min-width: 80px; justify-content: center;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        📄 CSV
                    </button>
                    <button onclick="exportarHistoricoMovimentacoes('xlsx')" 
                            style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); 
                                   color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
                                   cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;
                                   transition: all 0.2s ease; min-width: 100px; justify-content: center;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        📊 Excel (XLS)
                    </button>
                </div>
            </h4>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th>Profissionais</th>
                    </tr>
                </thead>
                <tbody>
                    ${aih.movimentacoes.map(mov => {
                        const profissionais = [];
                        if (mov.prof_medicina) profissionais.push(`Med: ${mov.prof_medicina}`);
                        if (mov.prof_enfermagem) profissionais.push(`Enf: ${mov.prof_enfermagem}`);
                        if (mov.prof_fisioterapia) profissionais.push(`Fis: ${mov.prof_fisioterapia}`);
                        if (mov.prof_bucomaxilo) profissionais.push(`Buco: ${mov.prof_bucomaxilo}`);

                        return `
                            <tr>
                                <td>${new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                                        ${mov.tipo === 'entrada_sus' ? '📥' : '📤'}
                                        ${mov.tipo === 'entrada_sus' ? 'Entrada SUS' : 'Saída Hospital'}
                                    </span>
                                </td>
                                <td><span class="status-badge status-${mov.status_aih}">${getStatusDescricao(mov.status_aih)}</span></td>
                                <td>R$ ${(mov.valor_conta || 0).toFixed(2)}</td>
                                <td style="font-size: 0.875rem;">${profissionais.join(' | ') || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    mostrarTela('telaInfoAIH');
};

// Carregar profissionais para o campo de pesquisa
const carregarProfissionaisPesquisa = async () => {
    try {
        const response = await api('/profissionais');
        const selectProfissional = document.getElementById('pesquisaProfissional');

        if (response && response.profissionais && selectProfissional) {
            // Limpar opções existentes exceto a primeira
            selectProfissional.innerHTML = '<option value="">Todos os profissionais</option>';

            // Adicionar profissionais
            response.profissionais.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.nome;
                option.textContent = `${prof.nome} (${prof.especialidade})`;
                selectProfissional.appendChild(option);
            });

            console.log('Profissionais carregados na pesquisa:', response.profissionais.length);
        }
    } catch (err) {
        console.error('Erro ao carregar profissionais para pesquisa:', err);
    }
};

// Menu Principal
document.getElementById('btnInformarAIH').addEventListener('click', () => {
    mostrarTela('telaInformarAIH');
    // Limpar campo do número da AIH sempre que acessar a tela
    setTimeout(() => {
        const campoNumeroAIH = document.getElementById('numeroBuscarAIH');
        if (campoNumeroAIH) {
            campoNumeroAIH.value = '';
        }
    }, 100);
});

document.getElementById('btnBuscarAIH').addEventListener('click', () => {
    mostrarTela('telaPesquisa');
    // Carregar profissionais quando abrir a tela de pesquisa
    setTimeout(() => {
        carregarProfissionaisPesquisa();
    }, 100);
});

document.getElementById('btnBackup').addEventListener('click', async () => {
    const modal = document.getElementById('modal');

    if (!modal) {
        console.error('Modal não encontrado');
        // Se não existir modal, chamar backup diretamente
        await fazerBackup();
        return;
    }

    const modalContent = modal.querySelector('.modal-content');

    if (!modalContent) {
        console.error('Modal content não encontrado');
        // Se não existir modal content, chamar backup diretamente
        await fazerBackup();
        return;
    }

    modalContent.innerHTML = `
        <h3>💾 Backup da Base de Dados</h3>
        <p style="margin-bottom: 2rem; color: #64748b;">Faça o backup completo do banco de dados do sistema:</p>

        <div style="display: grid; gap: 1rem; margin-top: 1rem;">
            <button onclick="fazerBackup()" 
                    style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                           color: white; border: none; border-radius: 8px; cursor: pointer;
                           padding: 1.5rem; font-size: 1.1rem; display: flex; align-items: center; gap: 1rem;
                           transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
                <span style="font-size: 2rem;">💾</span>
                <div style="text-align: left;">
                    <strong>Fazer Backup Completo</strong>
                    <br>
                    <span style="font-size: 0.875rem; opacity: 0.9;">Arquivo SQLite (.db) - Contém todos os dados do sistema</span>
                </div>
            </button>

            <button onclick="document.getElementById('modal').classList.remove('ativo')" 
                    style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); 
                           color: white; border: none; border-radius: 8px; cursor: pointer;
                           padding: 1rem; font-size: 1rem; margin-top: 1rem;
                           transition: all 0.2s ease;">
                ❌ Cancelar
            </button>
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0284c7;">
            <h4 style="color: #0284c7; margin: 0 0 0.5rem 0; font-size: 0.9rem;">ℹ️ Sobre o backup:</h4>
            <ul style="margin: 0; padding-left: 1.5rem; color: #64748b; font-size: 0.85rem;">
                <li><strong>Arquivo SQLite (.db):</strong> Backup completo de todo o sistema</li>
                <li><strong>Contém:</strong> Todas as AIHs, movimentações, glosas, usuários e configurações</li>
                <li><strong>Uso:</strong> Para restaurar o sistema ou migrar para outro servidor</li>
                <li><strong>Segurança:</strong> Mantenha o arquivo em local seguro</li>
            </ul>
        </div>
    `;

    modal.classList.add('ativo');
});

document.getElementById('btnConfiguracoes').addEventListener('click', () => {
    mostrarTela('telaConfiguracoes');
    carregarProfissionais();
    carregarTiposGlosaConfig();
});

// Buscar AIH
document.getElementById('formBuscarAIH').addEventListener('submit', async (e) => {
    e.preventDefault();

    const numero = document.getElementById('numeroBuscarAIH').value;

    try {
        const aih = await api(`/aih/${numero}`);
        state.aihAtual = aih;

        if (aih.status === 1 || aih.status === 4) {
            const continuar = await mostrarModal(
                'AIH Finalizada',
                'Esta AIH está finalizada. É uma reassinatura/reapresentação?'
            );

            if (!continuar) {
                document.getElementById('numeroBuscarAIH').value = '';
                return;
            }
        }

        // Definir tela anterior para poder voltar
        state.telaAnterior = 'telaInformarAIH';

        // Limpar campo antes de navegar
        document.getElementById('numeroBuscarAIH').value = '';

        mostrarInfoAIH(aih);
    } catch (err) {
        if (err.message.includes('não encontrada')) {
            // Nova AIH
            document.getElementById('cadastroNumeroAIH').value = numero;
            document.getElementById('cadastroNumeroAIH').removeAttribute('readonly');
            state.telaAnterior = 'telaInformarAIH';

            // Limpar campo antes de navegar
            document.getElementById('numeroBuscarAIH').value = '';

            mostrarTela('telaCadastroAIH');
            // Garantir que sempre tenha pelo menos um campo de atendimento
            setTimeout(garantirCampoAtendimento, 100);
        } else {
            alert('Erro: ' + err.message);
        }
    }
});

// Cadastrar AIH
document.getElementById('btnAddAtendimento').addEventListener('click', () => {
    const container = document.getElementById('atendimentosContainer');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'atendimento-input';
    input.placeholder = 'Número do atendimento';
    container.appendChild(input);
});

// Garantir que sempre tenha pelo menos um campo de atendimento
const garantirCampoAtendimento = () => {
    const container = document.getElementById('atendimentosContainer');
    if (container) {
        const inputs = container.querySelectorAll('.atendimento-input');
        if (inputs.length === 0) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'atendimento-input';
            input.placeholder = 'Número do atendimento';
            container.appendChild(input);
        }
    }
};

// Cadastrar AIH
document.getElementById('formCadastroAIH').addEventListener('submit', async (e) => {
    e.preventDefault();

    const numeroAIH = document.getElementById('cadastroNumeroAIH').value.trim();

    // Validação do número da AIH (deve ter 13 dígitos)
    if (numeroAIH.length !== 13) {
        const continuar = await mostrarModal(
            'Atenção - Número da AIH',
            `O número da AIH informado tem ${numeroAIH.length} dígitos, mas o padrão são 13 dígitos. Deseja continuar o cadastro mesmo assim?`
        );

        if (!continuar) {
            return;
        }
    }

    // Coleta CORRIGIDA dos atendimentos
    const atendimentosInputs = document.querySelectorAll('#atendimentosContainer .atendimento-input');
    const atendimentos = [];

    // Usar for...of para garantir que percorra todos os elementos
    for (const input of atendimentosInputs) {
        const valor = input.value ? input.value.trim() : '';
        if (valor && valor.length > 0) {
            atendimentos.push(valor);
            console.log('Atendimento adicionado:', valor);
        }
    }

    console.log('Total de inputs encontrados:', atendimentosInputs.length);
    console.log('Atendimentos coletados:', atendimentos);
    console.log('Quantidade de atendimentos:', atendimentos.length);

    if (atendimentos.length === 0) {
        alert('Informe pelo menos um número de atendimento');
        return;
    }

    try {
        const dados = {
            numero_aih: numeroAIH,
            valor_inicial: parseFloat(document.getElementById('cadastroValor').value),
            competencia: document.getElementById('cadastroCompetencia').value,
            atendimentos: atendimentos
        };

        console.log('Dados que serão enviados:', JSON.stringify(dados, null, 2));

        const result = await api('/aih', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('AIH cadastrada com sucesso!');

        // Limpar formulário após sucesso
        document.getElementById('formCadastroAIH').reset();

        // Limpar especificamente o campo do número da AIH
        document.getElementById('cadastroNumeroAIH').value = '';
        document.getElementById('cadastroNumeroAIH').removeAttribute('readonly');

        // Limpar container de atendimentos e adicionar um campo limpo
        const container = document.getElementById('atendimentosContainer');
        container.innerHTML = '';
        const novoInput = document.createElement('input');
        novoInput.type = 'text';
        novoInput.className = 'atendimento-input';
        novoInput.placeholder = 'Número do atendimento';
        container.appendChild(novoInput);

        // Voltar para a tela de informar AIH
        mostrarTela('telaInformarAIH');

    } catch (err) {
        console.error('Erro ao cadastrar AIH:', err);
        alert('Erro ao cadastrar AIH: ' + err.message);
    }
});

// Configurar competência padrão no campo
document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const competenciaAtual = `${mes}/${ano}`;

    const campoCadastroCompetencia = document.getElementById('cadastroCompetencia');
    if (campoCadastroCompetencia && !campoCadastroCompetencia.value) {
        campoCadastroCompetencia.value = competenciaAtual;
    }
});

// Funções de backup e exportação melhoradas
window.fazerBackup = async () => {
    try {
        console.log('🔄 Iniciando backup do banco de dados...');

        // Verificar se há token válido        if (!state.token) {
            console.error('❌ Token não encontrado no state:', state);
            alert('❌ Erro: Usuário não autenticado. Faça login novamente.');
            return;
        }

        console.log('✅ Token encontrado, continuando com backup...');

        // Criar modal de loading customizado
        const loadingModal = document.createElement('div');
        loadingModal.id = 'backup-loading-modal';
        loadingModal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
            background: rgba(0,0,0,0.7); display: flex; align-items: center; 
            justify-content: center; z-index: 9999;
        `;
        loadingModal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; text-align: center; min-width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                <h3 style="color: #0369a1; margin-bottom: 1rem; font-size: 1.25rem;">💾 Fazendo Backup...</h3>
                <p style="color: #64748b; margin-bottom: 1.5rem;">Aguarde enquanto o backup é criado...</p>
                <div style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 1rem;">Isso pode levar alguns segundos...</p>
            </div>
        `;

        // Adicionar ao DOM
        document.body.appendChild(loadingModal);

        // Fazer requisição para backup
        console.log('📡 Fazendo requisição para /api/backup...');

        const response = await fetch('/api/backup', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        console.log(`📡 Resposta recebida: Status ${response.status}`);

        if (!response.ok) {
            let errorText;
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = `Erro ao ler resposta: ${e.message}`;
            }
            console.error('❌ Erro na resposta do servidor:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText
            });
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        // Verificar content-type da resposta
        const contentType = response.headers.get('content-type');
        console.log('📄 Content-Type da resposta:', contentType);

        // Aceitar tanto application/octet-stream quanto outros tipos de arquivo
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('❌ Servidor retornou JSON ao invés de arquivo:', errorData);
            throw new Error(errorData.error || 'Servidor retornou erro ao invés de arquivo de backup');
        }

        // Criar blob e fazer download
        console.log('💾 Criando blob para download...');
        const blob = await response.blob();

        if (blob.size === 0) {
            throw new Error('Arquivo de backup está vazio');
        }

        console.log(`💾 Blob criado com tamanho: ${blob.size} bytes`);

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Definir nome do arquivo
        const dataAtual = new Date().toISOString().split('T')[0];
        link.download = `backup-aih-${dataAtual}.db`;

        // Configurar link invisível
        link.style.display = 'none';
        link.style.visibility = 'hidden';

        // Adicionar ao DOM temporariamente
        document.body.appendChild(link);

        // Forçar clique
        console.log('🖱️ Iniciando download...');
        link.click();

        // Limpar recursos
        setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
            window.URL.revokeObjectURL(url);
            console.log('🧹 Recursos de download limpos');
        }, 100);

        console.log('✅ Download do backup iniciado com sucesso');

        // Fechar modal de loading
        if (document.body.contains(loadingModal)) {
            document.body.removeChild(loadingModal);
        }

        // Mostrar mensagem de sucesso
        alert('✅ Backup do banco de dados realizado com sucesso!\n\nO arquivo SQLite foi baixado e contém todos os dados do sistema.');

    } catch (err) {
        console.error('❌ Erro completo ao fazer backup:', {
            message: err.message,
            stack: err.stack,
            token: state.token ? `Presente (${state.token.length} chars)` : 'Ausente',
            url: window.location.href,
            userAgent: navigator.userAgent
        });

        // Remover modal de loading se existir
        const loadingModal = document.getElementById('backup-loading-modal');
        if (loadingModal && document.body.contains(loadingModal)) {
            document.body.removeChild(loadingModal);
        }

        // Mostrar erro detalhado
        alert(`❌ Erro ao fazer backup: ${err.message}\n\nDetalhes técnicos foram registrados no console.`);
    }
};

// Função para exportar resultados da pesquisa
window.exportarResultadosPesquisa = async (formato) => {
    if (!window.ultimosResultadosPesquisa || window.ultimosResultadosPesquisa.length === 0) {
        alert('Nenhum resultado disponível para exportação');
        return;
    }

    try {
        // Criar dados formatados para exportação
        const dadosExportacao = window.ultimosResultadosPesquisa.map(aih => ({
            'Número AIH': aih.numero_aih || '',
            'Status': getStatusDescricao(aih.status),
            'Competência': aih.competencia || '',
            'Valor Inicial': `R$ ${(aih.valor_inicial || 0).toFixed(2)}`,
            'Valor Atual': `R$ ${(aih.valor_atual || 0).toFixed(2)}`,
            'Diferença': `R$ ${((aih.valor_inicial || 0) - (aih.valor_atual || 0)).toFixed(2)}`,
            'Total Glosas': aih.total_glosas || 0,
            'Cadastrado em': new Date(aih.criado_em).toLocaleDateString('pt-BR')
        }));

        const dataAtual = new Date().toISOString().split('T')[0];

        if (formato === 'csv') {
            // Gerar CSV
            const cabecalhos = Object.keys(dadosExportacao[0]);
            const linhasCsv = [
                cabecalhos.join(','),
                ...dadosExportacao.map(linha => 
                    cabecalhos.map(cabecalho => `"${linha[cabecalho]}"`).join(',')
                )
            ];

            const csvContent = '\ufeff' + linhasCsv.join('\n'); // BOM para UTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `resultados-pesquisa-${dataAtual}.csv`;
            link.click();

            URL.revokeObjectURL(link.href);

        } else if (formato === 'excel') {
            // Para Excel, vamos usar a API do servidor
            const response = await fetch('/api/export/excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    dados: dadosExportacao,
                    titulo: 'Resultados da Pesquisa',
                    tipo: 'resultados-pesquisa'
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `resultados-pesquisa-${dataAtual}.xls`;
                link.click();
                URL.revokeObjectURL(link.href);
            } else {
                throw new Error('Erro ao gerar arquivo Excel');
            }
        }

        alert(`Exportação ${formato.toUpperCase()} realizada com sucesso!`);

    } catch (err) {
        console.error('Erro na exportação:', err);
        alert('Erro ao exportar resultados: ' + err.message);
    }
};

// Função para ir para gerenciar glosas a partir da tela de informações
window.gerenciarGlosasFromInfo = () => {
    if (!state.aihAtual) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    // Definir tela anterior como a tela de informações da AIH
    state.telaAnterior = 'telaInfoAIH';

    // Ir para tela de pendências
    mostrarTela('telaPendencias');
    carregarGlosas();
};

// Função para exportar glosas da AIH atual
window.exportarGlosasAIH = async (formato) => {
    if (!state.aihAtual) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    try {
        // Buscar glosas atuais
        const response = await api(`/aih/${state.aihAtual.id}/glosas`);
        const glosas = response.glosas || [];

        if (glosas.length === 0) {
            alert('Esta AIH não possui glosas ativas para exportar');
            return;
        }

        // Preparar dados para exportação
        const dadosExportacao = glosas.map((glosa, index) => ({
            'Sequência': index + 1,
            'AIH': state.aihAtual.numero_aih,
            'Linha da Glosa': glosa.linha,
            'Tipo de Glosa': glosa.tipo,
            'Profissional Responsável': glosa.profissional,
            'Quantidade': glosa.quantidade || 1,
            'Data de Criação': new Date(glosa.criado_em).toLocaleString('pt-BR'),
            'Status': glosa.ativa ? 'Ativa' : 'Inativa'
        }));

        const dataAtual = new Date().toISOString().split('T')[0];
        const nomeArquivo = `glosas-AIH-${state.aihAtual.numero_aih}-${dataAtual}`;

        if (formato === 'csv') {
            // Gerar CSV
            const cabecalhos = Object.keys(dadosExportacao[0]);
            const linhasCsv = [
                cabecalhos.join(','),
                ...dadosExportacao.map(linha => 
                    cabecalhos.map(cabecalho => `"${linha[cabecalho]}"`).join(',')
                )
            ];

            const csvContent = '\ufeff' + linhasCsv.join('\n'); // BOM para UTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${nomeArquivo}.csv`;
            link.click();

            URL.revokeObjectURL(link.href);

        } else if (formato === 'excel') {
            // Para Excel, usar a API do servidor
            const responseExcel = await fetch('/api/export/excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    dados: dadosExportacao,
                    titulo: `Glosas da AIH ${state.aihAtual.numero_aih}`,
                    tipo: 'glosas-aih'
                })
            });

            if (responseExcel.ok) {
                const blob = await responseExcel.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${nomeArquivo}.xls`;
                link.click();
                URL.revokeObjectURL(link.href);
            } else {
                throw new Error('Erro ao gerar arquivo Excel');
            }
        }

        alert(`Glosas da AIH ${state.aihAtual.numero_aih} exportadas com sucesso em formato ${formato.toUpperCase()}!`);

    } catch (err) {
        console.error('Erro ao exportar glosas:', err);
        alert('Erro ao exportar glosas: ' + err.message);
    }
};

// Função para limpar filtros
const limparFiltros = () => {
    // Limpar filtros da pesquisa avançada
    document.getElementById('pesquisaNumeroAIH').value = '';
    document.getElementById('pesquisaNumeroAtendimento').value = '';
    document.getElementById('pesquisaCompetencia').value = '';
    document.getElementById('pesquisaDataInicio').value = '';
    document.getElementById('pesquisaDataFim').value = '';
    document.getElementById('pesquisaValorMin').value = '';
    document.getElementById('pesquisaValorMax').value = '';
    document.getElementById('pesquisaProfissional').value = '';

    // Desmarcar todos os checkboxes de status
    document.querySelectorAll('input[name="status"]').forEach(cb => cb.checked = false);

    // Limpar resultados se existirem
    const resultados = document.getElementById('resultadosPesquisa');
    if (resultados) {
        resultados.innerHTML = '';
    }

    console.log('Filtros limpos');
};

// Pesquisa avançada
document.getElementById('formPesquisa').addEventListener('submit', async (e) => {
    e.preventDefault();

    const filtros = {
        status: Array.from(document.querySelectorAll('input[name="status"]:checked')).map(cb => parseInt(cb.value)),
        competencia: document.getElementById('pesquisaCompetencia').value,
        data_inicio: document.getElementById('pesquisaDataInicio').value,
        data_fim: document.getElementById('pesquisaDataFim').value,
        valor_min: document.getElementById('pesquisaValorMin').value,
        valor_max: document.getElementById('pesquisaValorMax').value,
        numero_aih: document.getElementById('pesquisaNumeroAIH').value,
        numero_atendimento: document.getElementById('pesquisaNumeroAtendimento').value,
        profissional: document.getElementById('pesquisaProfissional').value
    };

    // Remover filtros vazios
    Object.keys(filtros).forEach(key => {
        if (!filtros[key] || (Array.isArray(filtros[key]) && filtros[key].length === 0)) {
            delete filtros[key];
        }
    });

    try {
        const response = await api('/pesquisar', {
            method: 'POST',
            body: JSON.stringify({ filtros })
        });

        exibirResultadosPesquisa(response.resultados);
    } catch (err) {
        alert('Erro na pesquisa: ' + err.message);
    }
});

// Exportar histórico de movimentações
window.exportarHistoricoMovimentacoes = async (formato) => {
    if (!state.aihAtual) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    try {
        console.log(`Iniciando exportação do histórico da AIH ${state.aihAtual.numero_aih} em formato ${formato}`);

        // Mostrar indicador de carregamento
        const botoes = document.querySelectorAll('button[onclick*="exportarHistoricoMovimentacoes"]');
        botoes.forEach(btn => {
            btn.disabled = true;
            const textoOriginal = btn.textContent;
            btn.setAttribute('data-texto-original', textoOriginal);
            btn.textContent = '⏳ Exportando...';
        });

        const response = await fetch(`/api/aih/${state.aihAtual.id}/movimentacoes/export/${formato}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        console.log(`Resposta da API: Status ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', errorText);
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        // Criar blob com o conteúdo da resposta
        const blob = await response.blob();
        console.log(`Blob criado com tamanho: ${blob.size} bytes`);

        // Determinar o nome do arquivo
        const dataAtual = new Date().toISOString().split('T')[0];
        let fileName;
        if (formato === 'csv') {
            fileName = `historico-movimentacoes-AIH-${state.aihAtual.numero_aih}-${dataAtual}.csv`;
        } else if (formato === 'xlsx') {
            fileName = `historico-movimentacoes-AIH-${state.aihAtual.numero_aih}-${dataAtual}.xls`;
        } else {
            throw new Error('Formato não suportado');
        }

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        // Adicionar ao DOM temporariamente e clicar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpar URL do blob
        window.URL.revokeObjectURL(url);

        console.log(`Exportação concluída: ${fileName}`);
        alert(`Histórico exportado com sucesso em formato ${formato.toUpperCase()}!\nArquivo: ${fileName}`);

    } catch (err) {
        console.error('Erro ao exportar histórico:', err);
        alert(`Erro ao exportar histórico: ${err.message || 'Erro desconhecido'}`);
    } finally {
        // Restaurar botões
        setTimeout(() => {
            const botoes = document.querySelectorAll('button[onclick*="exportarHistoricoMovimentacoes"]');
            botoes.forEach(btn => {
                btn.disabled = false;
                const textoOriginal = btn.getAttribute('data-texto-original');
                if (textoOriginal) {
                    btn.textContent = textoOriginal;
                    btn.removeAttribute('data-texto-original');
                } else {
                    // Fallback caso não tenha o atributo
                    if (btn.textContent.includes('CSV') || btn.textContent.includes('Exportando')) {
                        btn.textContent = '📄 CSV';
                    } else {
                        btn.textContent = '📊 Excel (XLS)';
                    }
                }
            });
        }, 500);
    }
};

// Adicionar funcionalidades de configuração
const carregarProfissionais = async () => {
    try {
        const response = await api('/profissionais');
        const container = document.getElementById('listaProfissionais');

        if (response && response.profissionais) {
            container.innerHTML = response.profissionais.map(prof => `
                <div class="glosa-item">
                    <div>
                        <strong>${prof.nome}</strong> - ${prof.especialidade}
                    </div>
                    <button onclick="excluirProfissional(${prof.id})" class="btn-danger">Excluir</button>
                </div>
            `).join('') || '<p>Nenhum profissional cadastrado</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar profissionais:', err);
    }
};

const carregarTiposGlosaConfig = async () => {
    try {
        const response = await api('/tipos-glosa');
        const container = document.getElementById('listaTiposGlosa');

        if (response && response.tipos) {
            container.innerHTML = response.tipos.map(tipo => `
                <div class="glosa-item">
                    <div>${tipo.descricao}</div>
                    <button onclick="excluirTipoGlosa(${tipo.id})" class="btn-danger">Excluir</button>
                </div>
            `).join('') || '<p>Nenhum tipo de glosa cadastrado</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar tipos de glosa:', err);
    }
};

// Event listener para Nova Movimentação
document.getElementById('btnNovaMovimentacao').addEventListener('click', async () => {
    if (!state.aihAtual) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    try {
        // Buscar próxima movimentação possível
        const proximaMovimentacao = await api(`/aih/${state.aihAtual.id}/proxima-movimentacao`);

        // NÃO definir tela anterior aqui - deixar que os botões funcionem independentemente
        // state.telaAnterior = 'telaInfoAIH';

        // Ir para tela de movimentação
        mostrarTela('telaMovimentacao');

        // Carregar dados da movimentação
        await carregarDadosMovimentacao();

        // Garantir que os event listeners estão configurados
        setTimeout(() => {
            configurarEventListenersMovimentacao();
        }, 600);

        // Configurar campos com base na próxima movimentação
        if (proximaMovimentacao) {
            const tipoSelect = document.getElementById('movTipo');
            const explicacaoDiv = document.getElementById('explicacaoMovimentacao');

            if (tipoSelect) {
                tipoSelect.value = proximaMovimentacao.proximo_tipo;
                tipoSelect.disabled = true; // Bloquear alteração
            }

            if (explicacaoDiv) {
                explicacaoDiv.innerHTML = `
                    <div style="background: #e0f2fe; border: 1px solid #0284c7; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: #0284c7; margin-bottom: 0.5rem;">
                            ℹ️ ${proximaMovimentacao.descricao}
                        </h4>
                        <p style="color: #0369a1; margin: 0;">
                            ${proximaMovimentacao.explicacao}
                        </p>
                    </div>
                `;
            }
        }

        // Preencher competência padrão
        const competenciaField = document.getElementById('movCompetencia');
        if (competenciaField && !competenciaField.value) {
            competenciaField.value = getCompetenciaAtual();
        }

        // Preencher valor atual da AIH
        const valorField = document.getElementById('movValor');
        if (valorField && state.aihAtual.valor_atual) {
            valorField.value = state.aihAtual.valor_atual;
        }

    } catch (err) {
        console.error('Erro ao iniciar nova movimentação:', err);
        alert('Erro ao iniciar nova movimentação: ' + err.message);
    }
});

// Event listeners para configurações
document.getElementById('formNovoProfissional').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const dados = {
            nome: document.getElementById('profNome').value,
            especialidade: document.getElementById('profEspecialidade').value
        };

        await api('/profissionais', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('Profissional adicionado com sucesso!');
        document.getElementById('formNovoProfissional').reset();
        carregarProfissionais();
    } catch (err) {
        alert('Erro ao adicionar profissional: ' + err.message);
    }
});

document.getElementById('formNovoTipoGlosa').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const dados = {
            descricao: document.getElementById('tipoGlosaDescricao').value
        };

        await api('/tipos-glosa', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('Tipo de glosa adicionado com sucesso!');
        document.getElementById('formNovoTipoGlosa').reset();
        carregarTiposGlosaConfig();
    } catch (err) {
        alert('Erro ao adicionar tipo de glosa: ' + err.message);
    }
});

window.excluirProfissional = async (id) => {
    const confirmar = confirm('Tem certeza que deseja excluir este profissional?');
    if (!confirmar) return;

    try {
        await api(`/profissionais/${id}`, { method: 'DELETE' });
        alert('Profissional excluído com sucesso!');
        carregarProfissionais();
    } catch (err) {
        alert('Erro ao excluir profissional: ' + err.message);
    }
};

window.excluirTipoGlosa = async (id) => {
    const confirmar = confirm('Tem certeza que deseja excluir este tipo de glosa?');
    if (!confirmar) return;

    try {
        await api(`/tipos-glosa/${id}`, { method: 'DELETE' });
        alert('Tipo de glosa excluído com sucesso!');
        carregarTiposGlosaConfig();
    } catch (err) {
        alert('Erro ao excluir tipo de glosa: ' + err.message);
    }
};

// Event listeners para movimentação

// Função global para gerenciar glosas na movimentação
window.gerenciarGlosasMovimentacao = () => {
    state.telaAnterior = 'telaMovimentacao';
    mostrarTela('telaPendencias');
    carregarGlosas();
};

// Função global para cancelar movimentação
window.cancelarMovimentacao = () => {
    voltarTelaAnterior();
};

// Event listeners para os botões na tela de movimentação
const configurarEventListenersMovimentacao = () => {
    // Event listeners configurados silenciosamente para melhor performance

    // Aguardar um pouco para garantir que os elementos estejam no DOM
    setTimeout(() => {
        const btnCancelar = document.getElementById('btnCancelarMovimentacao');
        const btnGerenciarGlosas = document.getElementById('btnGerenciarGlosas');

        if (btnCancelar) {
            // Limpar todos os event listeners existentes
            btnCancelar.onclick = null;
            btnCancelar.replaceWith(btnCancelar.cloneNode(true));

            // Referenciar o novo elemento
            const novoBtnCancelar = document.getElementById('btnCancelarMovimentacao');

            // Configurar event listener principal
            novoBtnCancelar.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão cancelar clicado - voltando para tela anterior');

                // Voltar para tela de informações da AIH
                if (state.aihAtual) {
                    try {
                        // Recarregar AIH atualizada antes de mostrar
                        const aihAtualizada = await api(`/aih/${state.aihAtual.numero_aih}`);
                        state.aihAtual = aihAtualizada;
                        mostrarInfoAIH(aihAtualizada);
                        console.log('AIH recarregada ao cancelar movimentação');
                    } catch (err) {
                        console.error('Erro ao recarregar AIH:', err);
                        // Se der erro, mostrar a AIH atual mesmo
                        mostrarInfoAIH(state.aihAtual);
                    }
                } else {
                    voltarTelaPrincipal();
                }
            });

            console.log('Event listener do botão cancelar configurado');
        } else {
            console.warn('Botão cancelar não encontrado');
        }

        if (btnGerenciarGlosas) {
            // Limpar todos os event listeners existentes
            btnGerenciarGlosas.onclick = null;
            btnGerenciarGlosas.replaceWith(btnGerenciarGlosas.cloneNode(true));

            // Referenciar o novo elemento
            const novoBtnGerenciarGlosas = document.getElementById('btnGerenciarGlosas');

            // Configurar event listener principal
            novoBtnGerenciarGlosas.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Botão gerenciar glosas clicado');

                // Definir tela anterior antes de navegar
                state.telaAnterior = 'telaMovimentacao';
                mostrarTela('telaPendencias');
                carregarGlosas();
            });

            console.log('Event listener do botão gerenciar glosas configurado');
        } else {
            console.warn('Botão gerenciar glosas não encontrado');
        }
    }, 100);
};

// Chamar configuração quando a página carregar
document.addEventListener('DOMContentLoaded', configurarEventListenersMovimentacao);

// Função para validar profissionais obrigatórios
const validarProfissionaisObrigatorios = () => {
    const profEnfermagem = document.getElementById('movProfEnfermagem').value.trim();
    const profMedicina = document.getElementById('movProfMedicina').value.trim();
    const profBucomaxilo = document.getElementById('movProfBucomaxilo').value.trim();

    const erros = [];

    // Validação 1: Enfermagem é SEMPRE obrigatória
    if (!profEnfermagem) {
        erros.push('• Profissional de Enfermagem é obrigatório');
    }

    // Validação 2: Pelo menos um entre Medicina ou Bucomaxilo deve ser selecionado
    if (!profMedicina && !profBucomaxilo) {
        erros.push('• É necessário selecionar pelo menos um profissional de Medicina OU Cirurgião Bucomaxilo');
    }

    return erros;
};

// Formulário de movimentação
document.getElementById('formMovimentacao')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.aihAtual) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    // Validar profissionais obrigatórios
    const errosValidacao = validarProfissionaisObrigatorios();
    if (errosValidacao.length > 0) {
        const mensagemErro = `❌ Profissionais Auditores Obrigatórios não preenchidos:\n\n${errosValidacao.join('\n')}\n\n📋 Regra: Enfermagem é SEMPRE obrigatório + pelo menos um entre Medicina ou Cirurgião Bucomaxilo.\n\n🔬 Fisioterapia é opcional.`;
        alert(mensagemErro);
        return;
    }

    try {
        const dados = {
            tipo: document.getElementById('movTipo').value,
            status_aih: parseInt(document.getElementById('movStatus').value),
            valor_conta: parseFloat(document.getElementById('movValor').value),
            competencia: document.getElementById('movCompetencia').value,
            prof_medicina: document.getElementById('movProfMedicina').value || null,
            prof_enfermagem: document.getElementById('movProfEnfermagem').value || null,
            prof_fisioterapia: document.getElementById('movProfFisioterapia').value || null,
            prof_bucomaxilo: document.getElementById('movProfBucomaxilo').value || null,
            observacoes: document.getElementById('movObservacoes').value || null
        };

        await api(`/aih/${state.aihAtual.id}/movimentacao`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('Movimentação salva com sucesso!');

        // Recarregar AIH atualizada
        const aihAtualizada = await api(`/aih/${state.aihAtual.numero_aih}`);
        state.aihAtual = aihAtualizada;

        // Voltar para informações da AIH
        mostrarInfoAIH(aihAtualizada);

    } catch (err) {
        console.error('Erro ao salvar movimentação:', err);
        alert('Erro ao salvar movimentação: ' + err.message);
    }
});

// Formulário para adicionar nova glosa
document.getElementById('formNovaGlosa')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.aihAtual || !state.aihAtual.id) {
        alert('Nenhuma AIH selecionada');
        return;
    }

    try {
        const dados = {
            linha: document.getElementById('glosaLinha').value,
            tipo: document.getElementById('glosaTipo').value,
            profissional: document.getElementById('glosaProfissional').value,
            quantidade: parseInt(document.getElementById('glosaQuantidade').value) || 1
        };

        await api(`/aih/${state.aihAtual.id}/glosas`, {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        alert('Glosa adicionada com sucesso!');
        document.getElementById('formNovaGlosa').reset();
        carregarGlosas();
    } catch (err) {
        alert('Erro ao adicionar glosa: ' + err.message);
    }
});

// Remover glosa
window.removerGlosa = async (id) => {
    const confirmar = await mostrarModal(
        'Remover Glosa',
        'Tem certeza que deseja remover esta glosa/pendência?'
    );

    if (!confirmar) return;

    try {
        await api(`/glosas/${id}`, { method: 'DELETE' });
        alert('Glosa removida com sucesso!');
        carregarGlosas();
    } catch (err) {
        alert('Erro ao remover glosa: ' + err.message);
    }
};

// Salvar glosas e voltar
document.getElementById('btnSalvarGlosas')?.addEventListener('click', async () => {
    console.log('Salvando glosas e voltando...');

    // Se veio da tela de movimentação, voltar para lá
    if (state.telaAnterior === 'telaMovimentacao') {
        console.log('Voltando para tela de movimentação...');
        mostrarTela('telaMovimentacao');

        // Recarregar dados da movimentação para mostrar glosas atualizadas
        setTimeout(() => {
            carregarDadosMovimentacao();
            setTimeout(() => {
                configurarEventListenersMovimentacao();
            }, 300);
        }, 150);
    } else if (state.telaAnterior === 'telaInfoAIH' && state.aihAtual) {
        // Se voltando para tela de informações, recarregar AIH com glosas atualizadas
        console.log('Voltando para tela de informações da AIH e recarregando glosas...');
        try {
            const aihAtualizada = await api(`/aih/${state.aihAtual.numero_aih}`);
            state.aihAtual = aihAtualizada;
            mostrarInfoAIH(aihAtualizada);
            console.log('Glosas atualizadas na tela de informações');
        } catch (err) {
            console.error('Erro ao recarregar AIH:', err);
            // Se der erro, usar função padrão
            voltarTelaAnterior();
        }
    } else {
        // Caso contrário, usar função padrão
        voltarTelaAnterior();
    }
});

// Adicionar funcionalidade de clique nos cards de status e integração com o seletor
window.selecionarStatusCard = (status) => {
    // Alterar valor do seletor
    const seletor = document.getElementById('movStatus');
    if (seletor) {
        seletor.value = status;
    }

    // Remover classe de todos os cards
    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('selecionado');
    });

    // Adicionar classe ao card selecionado
    const card = document.querySelector(`.status-card[data-status="${status}"]`);
    if (card) {
        card.classList.add('selecionado');
    }
};

// Event listener para o seletor de status
document.getElementById('movStatus').addEventListener('change', (e) => {
    const status = e.target.value;

    // Remover classe de todos os cards
    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('selecionado');
    });

    // Adicionar classe ao card correspondente
    const card = document.querySelector(`.status-card[data-status="${status}"]`);
    if (card) {
        card.classList.add('selecionado');
    }
});

// Adicionar funcionalidade para solicitar confirmação de valor
const valorAnterior = null; // Manter valor anterior em cache

document.getElementById('movValor').addEventListener('focusout', async (e) => {
    const valorAtual = parseFloat(e.target.value);

    if (valorAnterior !== null && valorAtual === valorAnterior) {
        const confirmar = await mostrarModal(
            'Confirmar Valor',
            `O valor atual (R$ ${valorAtual.toFixed(2)}) é o mesmo que o anterior. Tem certeza que deseja mantê-lo?`
        );

        if (!confirmar) {
            e.target.value = ''; // Limpar campo se o usuário não confirmar
        }
    }
    // Atualizar valor anterior
    valorAnterior = valorAtual;
});

// Executar ao carregar
document.addEventListener('DOMContentLoaded', () => {
    // Lembrete sobre os status com design melhorado
    const lembreteStatus = document.getElementById('lembreteStatus');

    if (lembreteStatus) {
        lembreteStatus.innerHTML = `
            <!-- Lembrete sobre os status com design melhorado -->
            <div class="status-guia-completo">
                <h4>📋 Guia Completo dos Status de AIH</h4>
                <div class="status-grid-detalhado">
                    <div class="status-card status-1-card clickable" data-status="1" onclick="selecionarStatusCard('1')">
                        <div class="status-header">
                            <span class="status-numero">1</span>
                            <h5>✅ Finalizada - Aprovação Direta</h5>
                        </div>
                        <p><strong>Significado:</strong> Auditoria do SUS aprovou diretamente a conta sem glosas ou pendências.</p>
                        <p><strong>Ação:</strong> Processo concluído com sucesso. Concordância entre auditorias.</p>
                    </div>

                    <div class="status-card status-2-card clickable" data-status="2" onclick="selecionarStatusCard('2')">
                        <div class="status-header">
                            <span class="status-numero">2</span>
                            <h5>🔄 Ativa - Aprovação Indireta</h5>
                        </div>
                        <p><strong>Significado:</strong> Auditoria SUS aprovou, porém com pendências e/ou glosas. Cabe recurso a ser apresentado pela Auditoria do Hospital.</p>
                        <p><strong>Ação:</strong> Conta ja auditada pela Auditoria do SUS, porém com status de ativa por possibilidade de retorno com recurso solicitado pela auditoria do hospital.</p>
                    </div>

                    <div class="status-card status-3-card clickable" data-status="3" onclick="selecionarStatusCard('3')">
                        <div class="status-header">
                            <span class="status-numero">3</span>
                            <h5>⚠️ Ativa - Em Discussão</h5>
                        </div>
                        <p><strong>Significado:</strong> Há divergências entre auditorias que precisam ser resolvidas antes da aprovação desta conta.</p>
                        <p><strong>Ação:</strong> Resolução de pendências e glosas em andamento entre as Auditorias.</p>
                    </div>

                    <div class="status-card status-4-card clickable" data-status="4" onclick="selecionarStatusCard('4')">
                        <div class="status-header">
                            <span class="status-numero">4</span>
                            <h5>✅ Finalizada - Após Discussão</h5>
                        </div>
                        <p><strong>Significado:</strong> Discussões concluídas entre ambas auditorias. AIH finalizada.</p>
                        <p><strong>Ação:</strong> Processo concluído após concordância entre as auditorias.</p>
                    </div>
                </div>
            </div>
        `;
    }
});