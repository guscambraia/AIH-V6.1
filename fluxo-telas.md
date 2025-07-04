# 🎨 Fluxo de Telas - Sistema AIH

**Última atualização**: Interface aprimorada com:
- ⭐ Validações frontend mais rigorosas
- ⭐ Cache de dados no cliente  
- ⭐ Navegação otimizada com limpeza automática de campos
- ⭐ Modais de confirmação avançados
- ⭐ Sistema de loading states
- ⭐ Interface responsiva melhorada

## Mapa de Navegação

## 📱 Visão Geral da Interface

O sistema é uma **Single Page Application (SPA)** que utiliza navegação dinâmica entre telas. Todas as telas estão carregadas no DOM e apenas uma é visível por vez (classe `ativa`).

### 🎨 Características da Interface
- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Navegação Fluida**: Transições suaves entre telas
- **Cache Inteligente**: Dados são mantidos em cache para performance
- **Validação em Tempo Real**: Feedback imediato nos formulários
- **Sistema de Modais**: Confirmações e alertas elegantes

## 🔐 1. TELA LOGIN (`telaLogin`)

**Layout:**
- Formulário centralizado com logo/título
- Campos de usuário e senha
- Botão de login principal
- Link para cadastro de usuário

**Campos:**
- **Usuário**: Input texto (obrigatório)
- **Senha**: Input password (obrigatório)
- **Botão Login**: Validação e autenticação
- **"Cadastrar novo usuário"**: Link modal para cadastro

**Fluxos:**
- Login bem-sucedido (usuário comum) → **TELA PRINCIPAL**
- Login bem-sucedido (admin) → **TELA GESTÃO USUÁRIOS** 
- Cadastro → Modal de cadastro inline
- Erro → Mensagem de erro inline

**Validações:**
- Campos obrigatórios
- Tentativas de login limitadas
- Token JWT válido salvo no localStorage

---

## 🏠 2. TELA PRINCIPAL (`telaPrincipal`)

**Layout:**
- Header com nome do usuário e logout
- Cards de estatísticas em grid responsivo
- Menu de navegação principal
- Área de últimas movimentações

**Seções:**

### Dashboard de Estatísticas
- **Total AIH Cadastradas**: Contador animado
- **AIH em Processamento**: Status 2 e 3
- **Distribuição por Status**: 
  - Status 1: Finalizada aprovação direta
  - Status 2: Ativa aprovação indireta  
  - Status 3: Ativa em discussão
  - Status 4: Finalizada após discussão
- **Valores Totais**: Inicial vs Atual

### Menu Principal
- **📝 Informar AIH**: Busca e cadastro
- **🔍 Pesquisar**: Pesquisa avançada
- **📊 Relatórios**: Relatórios e análises
- **⚙️ Configurações**: Profissionais e tipos de glosa
- **👥 Gestão Usuários**: Apenas para admin
- **🗑️ Alteração BD**: Exclusões com justificativas
- **💾 Backup/Exportar**: Backup e exportação

### Últimas Movimentações
- Lista das 10 últimas movimentações
- Link direto para a AIH
- Status e data/hora

**Cache**: Dashboard atualizado a cada 2 minutos

---

## 📝 3. TELA INFORMAR AIH (`telaInformarAIH`)

**Layout:**
- Campo de busca centralizado
- Botão de busca destacado
- Área de resultados/feedback

**Funcionamento:**
- **Campo**: Número da AIH (input text com máscara)
- **Botão Buscar**: Consulta no banco

**Fluxos:**
1. **AIH não existe** → **TELA CADASTRO AIH**
2. **AIH existe (status 1 ou 4)** → Modal de confirmação
   - "AIH finalizada. Deseja reassinar?" 
   - Sim → **TELA INFORMAÇÕES AIH**
   - Não → Permanece na tela
3. **AIH existe (status 2 ou 3)** → **TELA INFORMAÇÕES AIH**

**Validações:**
- Número da AIH obrigatório
- Formato válido
- Feedback visual para carregamento

---

## ➕ 4. TELA CADASTRO AIH (`telaCadastroAIH`)

**Layout:**
- Formulário estruturado em seções
- Campos organizados logicamente
- Botões de ação no final

**Campos Obrigatórios:**
- **Número AIH**: Input text único
- **Números de Atendimento**: 
  - Lista dinâmica
  - Botão "+" para adicionar
  - Botão "×" para remover
  - Mínimo 1 atendimento
- **Competência**: Select MM/YYYY
- **Valor Inicial**: Input number (R$)

**Validações:**
- Número AIH único no sistema
- Atendimentos não podem estar vazios
- Valor deve ser positivo
- Competência no formato correto

**Fluxo:**
- Cadastro bem-sucedido → **TELA INFORMAÇÕES AIH**
- Erro → Mensagem específica inline

---

## ℹ️ 5. TELA INFORMAÇÕES AIH (`telaInfoAIH`)

**Layout:**
- Header com dados principais da AIH
- Seções organizadas em tabs ou accordion
- Botões de ação destacados

**Seções:**

### Dados Principais
- Número da AIH
- Status atual com badge colorido
- Competência
- Valores (inicial vs atual)
- Data de cadastro
- Usuário responsável

### Atendimentos
- Lista dos números de atendimento
- Quantidade total

### Histórico de Movimentações
- Tabela cronológica
- Colunas: Data, Tipo, Usuário, Status, Valor
- Ordenação: Mais recente primeiro
- Paginação se necessário

### Glosas Ativas
- Lista das glosas pendentes
- Total de glosas ativas
- Tipo, profissional, data

**Botões de Ação:**
- **📋 Nova Movimentação**: Principal (destaque)
- **🔍 Ver Todas Glosas**: Secundário
- **⬅️ Voltar**: Navegação

**Cache**: Dados da AIH mantidos em `state.aihAtual`

---

## 🔄 6. TELA MOVIMENTAÇÃO (`telaMovimentacao`)

**Layout:**
- Cabeçalho com dados da AIH atual
- Formulário principal estruturado
- Seção de glosas integrada
- Lembretes e orientações

**Campos do Formulário:**

### Informações Principais
- **Status Atual**: Select (1-4) com descrições
- **Data**: Preenchida automaticamente (hoje)
- **Tipo de Movimentação**: 
  - Radio buttons ou select
  - "Entrada no SUS" / "Saída do Hospital"
  - Lógica automática baseada no último movimento
- **Competência**: Input MM/YYYY (padrão: atual)

### Profissionais Auditores
- **Medicina**: Select com profissionais cadastrados
- **Enfermagem**: Select com profissionais cadastrados  
- **Fisioterapia**: Select com profissionais cadastrados
- **Bucomaxilo**: Select com profissionais cadastrados

### Valores
- **Valor Atual da Conta**: Input number
- **Diferença**: Calculada automaticamente

### Seção Glosas/Pendências
- **Lista Atual**: Glosas ativas da AIH
- **Botão "Gerenciar Glosas"**: Abre modal ou tela específica
- **Contador**: "X glosas ativas"

**Lembretes Visuais:**
- Box colorido com explicação dos status
- Orientações sobre o fluxo
- Alertas para glosas pendentes

**Validações:**
- Status obrigatório
- Valor deve ser positivo
- Pelo menos um profissional informado
- Confirmação se há glosas pendentes

**Fluxos:**
- **Gerenciar Glosas** → **TELA PENDÊNCIAS**
- **Salvar** → **TELA INFORMAÇÕES AIH** (atualizada)
- **Cancelar** → Volta à tela anterior

---

## 📋 7. TELA PENDÊNCIAS (`telaPendencias`)

**Layout:**
- Lista de glosas atual
- Formulário para nova glosa
- Botões de ação para cada item

**Funcionalidades:**

### Lista de Glosas Existentes
- **Tabela/Cards**: Uma glosa por linha
- **Colunas**: Linha, Tipo, Profissional, Quantidade, Data
- **Ações**: Botão "Remover" com confirmação
- **Filtros**: Por tipo, profissional, ativa/inativa

### Adicionar Nova Glosa
- **Linha da Glosa**: Input text ou select pré-definido
- **Tipo**: Select com tipos cadastrados
- **Profissional**: Select com profissionais
- **Quantidade**: Input number (opcional)
- **Botão Adicionar**: Validação e inclusão

### Tipos de Glosa Disponíveis
- Quantidade
- Valor  
- Procedimento
- Documentação
- Medicamento
- Material
- (Configuráveis via Configurações)

**Validações:**
- Campos obrigatórios preenchidos
- Não duplicar glosas idênticas
- Quantidade deve ser positiva

**Fluxos:**
- **Salvar e Voltar** → **TELA MOVIMENTAÇÃO**
- **Cancelar** → **TELA MOVIMENTAÇÃO** (sem salvar)

---

## 🔍 8. TELA PESQUISA (`telaPesquisa`)

**Layout:**
- Seção de filtros expandível
- Área de resultados com tabela
- Controles de exportação

**Filtros Disponíveis:**

### Filtros Básicos
- **Status**: Checkboxes múltiplas (1,2,3,4)
- **Competência**: Select ou input MM/YYYY
- **Período**: Data início + Data fim

### Filtros Avançados
- **Número AIH**: Input texto
- **Número Atendimento**: Input texto
- **Profissional Auditor**: Select por especialidade
- **Faixa de Valores**: Mínimo + Máximo
- **Usuário Cadastro**: Select de usuários

### Área de Resultados
- **Tabela Responsiva**: 
  - Colunas: AIH, Status, Competência, Valor, Data
  - Paginação: 50 itens por página
  - Ordenação: Clique nos cabeçalhos
- **Total Encontrado**: Contador
- **Ações por Item**: Ver detalhes, Nova movimentação

### Exportação
- **Botões**: CSV, Excel, JSON
- **Opções**: 
  - Incluir glosas
  - Incluir movimentações
  - Apenas resultados filtrados

**Performance:**
- Cache de 5 minutos para mesma pesquisa
- Limite de 1000 resultados por consulta
- Loading indicators

---

## ⚙️ 9. TELA CONFIGURAÇÕES (`telaConfiguracoes`)

**Layout:**
- Tabs ou seções para diferentes configurações
- Listas editáveis inline
- Formulários de adição

**Seções:**

### Gerenciar Profissionais
- **Lista Atual**: Tabela com Nome + Especialidade
- **Ações**: Editar, Remover (com confirmação)
- **Adicionar Novo**:
  - Nome (obrigatório)
  - Especialidade (select: Medicina, Enfermagem, etc.)

### Gerenciar Tipos de Glosa
- **Lista Atual**: Tipos cadastrados
- **Uso**: Quantas glosas usam cada tipo
- **Adicionar Novo**: Input texto + validação
- **Remover**: Só se não estiver em uso

### Configurações do Sistema
- **Backup Automático**: Ativar/desativar
- **Frequência**: Diário, semanal
- **Retenção**: Número de backups a manter

**Validações:**
- Nomes únicos para profissionais
- Tipos de glosa únicos
- Não remover itens em uso

---

## 📊 10. TELA RELATÓRIOS (`telaRelatorios`)

**Layout:**
- Menu lateral com tipos de relatório
- Área principal com filtros e resultados
- Controles de exportação

**Tipos de Relatório:**

### Relatórios Operacionais
1. **Acessos dos Usuários**
   - Logs de login/logout
   - Ações por usuário
   - Período de atividade

2. **Glosas por Profissional** 
   - Agrupamento por auditor
   - Tipos mais frequentes
   - Evolução temporal

3. **AIHs por Profissional**
   - Produtividade dos auditores
   - Tempo médio de processamento
   - Status de conclusão

### Relatórios Gerenciais
4. **Aprovações e Status**
   - Distribuição por status
   - Taxa de aprovação
   - Tempo médio por status

5. **Tipos de Glosa**
   - Ranking dos mais frequentes
   - Impacto financeiro
   - Tendências

6. **Análise Preditiva**
   - Tendências por competência
   - Previsão de volume
   - Sazonalidade

### Relatórios Analíticos
7. **Produtividade dos Auditores**
   - Métricas individuais
   - Comparativos
   - Metas vs realizado

8. **Detalhamento por Status**
   - Análise profunda de cada status
   - Valores envolvidos
   - Tempo de permanência

9. **Estatísticas do Período**
   - Resumo executivo
   - KPIs principais
   - Comparativo com períodos anteriores

**Controles:**
- **Filtros de Período**: Data início/fim, competência
- **Visualização**: Tabela, gráficos, resumo
- **Exportação**: PDF, Excel, CSV
- **Agendamento**: Relatórios automáticos

---

## 👥 11. TELA GESTÃO USUÁRIOS (`telaGestaoUsuarios`)
**(Apenas para administradores)**

**Layout:**
- Lista de usuários existentes
- Formulário de novo usuário
- Controles administrativos

**Funcionalidades:**
- **Lista de Usuários**: Nome, data cadastro, último acesso
- **Adicionar Usuário**: Nome + senha
- **Remover Usuário**: Com confirmação e transferência de dados
- **Resetar Senha**: Gerar nova senha temporária
- **Logs de Atividade**: Ações de cada usuário

---

## 🗑️ 12. TELA ALTERAÇÃO BD (`telaAlteracaoBD`)

**Layout:**
- Seções separadas para diferentes tipos de exclusão
- Formulários com validação rigorosa
- Confirmações de segurança

**Funcionalidades:**

### Excluir AIH Completa
- Input para número da AIH
- Justificativa obrigatória (mín. 10 caracteres)
- Confirmação com senha do usuário
- Log completo da exclusão

### Excluir Movimentação Específica
- Busca da AIH
- Lista de movimentações disponíveis
- Seleção da movimentação
- Justificativa obrigatória
- Confirmação com senha

**Segurança:**
- Todas exclusões logadas
- Backup automático antes da exclusão
- Confirmação dupla
- Registro de justificativas

---

## 💾 13. TELA BACKUP/EXPORTAR

**Layout:**
- Seções organizadas por função
- Status das operações
- Histórico de backups

**Funcionalidades:**

### Backup Manual
- **Criar Backup**: Botão principal
- **Download Banco**: Link direto
- **Histórico**: Últimos backups criados
- **Espaço Usado**: Métricas de armazenamento

### Exportação de Dados
- **Exportação Completa**: Todos os dados
- **Exportação Filtrada**: Com critérios
- **Formatos**: CSV, Excel, JSON, SQL
- **Agendamento**: Exportações automáticas

---

## 🔄 Fluxo de Navegação Global

```
LOGIN
├─→ PRINCIPAL (dashboard)
    ├─→ INFORMAR AIH
    │   ├─→ CADASTRO AIH → INFO AIH
    │   └─→ INFO AIH → MOVIMENTAÇÃO → PENDÊNCIAS
    ├─→ PESQUISA
    │   └─→ INFO AIH (dos resultados)
    ├─→ RELATÓRIOS
    ├─→ CONFIGURAÇÕES
    ├─→ GESTÃO USUÁRIOS (admin)
    ├─→ ALTERAÇÃO BD
    └─→ BACKUP/EXPORTAR
```

## 📱 Responsividade

### Desktop (> 1024px)
- Layout em colunas
- Sidebar fixa
- Tabelas completas
- Modais centralizados

### Tablet (768px - 1024px)  
- Layout adaptativo
- Menu colapsável
- Tabelas com scroll horizontal
- Cards redimensionados

### Mobile (< 768px)
- Layout em coluna única
- Menu hambúrguer
- Tabelas em cards
- Formulários simplificados
- Botões touch-friendly

## 🎨 Sistema de Design

### Cores e Status
- **Status 1**: Verde (#10b981) - Sucesso
- **Status 2**: Laranja (#f59e0b) - Atenção  
- **Status 3**: Vermelho (#ef4444) - Urgente
- **Status 4**: Azul (#3b82f6) - Informativo

### Componentes Principais
- **Cards**: Sombra sutil, border-radius 8px
- **Botões**: Gradientes, estados hover
- **Modais**: Overlay escuro, animação fade
- **Alerts**: Cores semânticas, ícones
- **Badges**: Pequenos, coloridos por status

### Acessibilidade
- **Navegação por teclado**: Tab order lógico
- **Screen readers**: Roles e labels ARIA
- **Contraste**: WCAG AA compliance
- **Focus indicators**: Visíveis e claros

Este fluxo garante uma experiência de usuário fluida e intuitiva, mantendo a eficiência operacional para o controle de auditoria de AIHs.