
# 🗄️ Estrutura do Banco de Dados - Sistema AIH

## 📊 Visão Geral

O sistema utiliza **SQLite** como banco de dados principal, otimizado para alta performance com:
- Índices estratégicos para consultas rápidas
- WAL Mode (Write-Ahead Logging) para concorrência
- Connection pooling para múltiplos usuários
- Sistema de cache em memória
- Backup automático e arquivamento

## 📋 Tabelas Principais

### 1. usuarios
Gerencia os usuários do sistema com autenticação segura.
```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,                    -- Nome único do usuário
    senha_hash TEXT NOT NULL,                     -- Senha criptografada com bcrypt
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP  -- Data de criação
);
```
**Relacionamentos:** 
- `aihs.usuario_cadastro_id` → `usuarios.id`
- `movimentacoes.usuario_id` → `usuarios.id`
- `logs_acesso.usuario_id` → `usuarios.id`

### 2. aihs
Tabela principal que armazena as Autorizações de Internação Hospitalar.
```sql
CREATE TABLE aihs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_aih TEXT UNIQUE NOT NULL,              -- Número único da AIH
    valor_inicial REAL NOT NULL CHECK(valor_inicial >= 0), -- Valor inicial
    valor_atual REAL NOT NULL CHECK(valor_atual >= 0),     -- Valor após movimentações
    status INTEGER NOT NULL DEFAULT 3 CHECK(status IN (1,2,3,4)), -- Status (1-4)
    competencia TEXT NOT NULL,                    -- Formato: MM/YYYY
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data de criação
    usuario_cadastro_id INTEGER,                  -- Usuário que cadastrou
    FOREIGN KEY (usuario_cadastro_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
```

**Status da AIH:**
- **1**: Finalizada com aprovação direta
- **2**: Ativa com aprovação indireta  
- **3**: Ativa em discussão (padrão)
- **4**: Finalizada após discussão

### 3. atendimentos
Armazena os números de atendimento associados a cada AIH.
```sql
CREATE TABLE atendimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aih_id INTEGER NOT NULL,                      -- Referência à AIH
    numero_atendimento TEXT NOT NULL,             -- Número do atendimento
    FOREIGN KEY (aih_id) REFERENCES aihs(id) ON DELETE CASCADE
);
```

### 4. movimentacoes
Registra todas as movimentações das AIHs no processo de auditoria.
```sql
CREATE TABLE movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aih_id INTEGER NOT NULL,                      -- Referência à AIH
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada_sus', 'saida_hospital')), -- Tipo
    data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data da movimentação
    usuario_id INTEGER NOT NULL,                  -- Usuário responsável
    valor_conta REAL CHECK(valor_conta >= 0),     -- Valor da conta
    competencia TEXT,                             -- Competência (MM/YYYY)
    prof_medicina TEXT,                           -- Profissional de medicina
    prof_enfermagem TEXT,                         -- Profissional de enfermagem
    prof_fisioterapia TEXT,                       -- Profissional de fisioterapia
    prof_bucomaxilo TEXT,                         -- Profissional bucomaxilo
    status_aih INTEGER NOT NULL CHECK(status_aih IN (1,2,3,4)), -- Status da AIH
    FOREIGN KEY (aih_id) REFERENCES aihs(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);
```

**Tipos de Movimentação:**
- **entrada_sus**: Entrada na auditoria do SUS
- **saida_hospital**: Saída da auditoria hospitalar

### 5. glosas
Gerencia as glosas (pendências) identificadas nas AIHs.
```sql
CREATE TABLE glosas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aih_id INTEGER NOT NULL,                      -- Referência à AIH
    linha TEXT NOT NULL,                          -- Linha/item da glosa
    tipo TEXT NOT NULL,                           -- Tipo da glosa
    profissional TEXT NOT NULL,                   -- Profissional responsável
    quantidade INTEGER DEFAULT 1 CHECK(quantidade > 0), -- Quantidade (se aplicável)
    ativa BOOLEAN DEFAULT 1 CHECK(ativa IN (0,1)), -- Se a glosa está ativa
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data de criação
    FOREIGN KEY (aih_id) REFERENCES aihs(id) ON DELETE CASCADE
);
```

### 6. tipos_glosa
Catálogo de tipos de glosa configuráveis.
```sql
CREATE TABLE tipos_glosa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT UNIQUE NOT NULL               -- Descrição do tipo
);
```

**Tipos padrão:**
- Quantidade
- Valor
- Procedimento
- Documentação
- Medicamento
- Material

### 7. profissionais
Cadastro de profissionais que atuam nas auditorias.
```sql
CREATE TABLE profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,                          -- Nome do profissional
    especialidade TEXT NOT NULL                  -- Especialidade/área
);
```

**Especialidades principais:**
- Medicina
- Enfermagem  
- Fisioterapia
- Bucomaxilo
- Administração

### 8. logs_acesso
Registra todas as ações dos usuários para auditoria e segurança.
```sql
CREATE TABLE logs_acesso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,                 -- Usuário que fez a ação
    acao TEXT NOT NULL,                          -- Descrição da ação
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp da ação
    detalhes TEXT,                               -- Detalhes adicionais (JSON)
    ip_address TEXT,                             -- IP do usuário
    user_agent TEXT,                             -- User agent do browser
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

**Tipos de ações registradas:**
- login
- logout
- criar_aih
- excluir_aih
- criar_movimentacao
- excluir_movimentacao
- criar_glosa
- excluir_glosa
- gerar_relatorio
- exportar_dados
- backup_sistema

## 🚀 Índices para Performance

### Índices Principais
Otimizam as consultas mais frequentes do sistema:

```sql
-- AIHs
CREATE INDEX idx_aih_numero ON aihs(numero_aih);
CREATE INDEX idx_aih_status ON aihs(status);
CREATE INDEX idx_aih_competencia ON aihs(competencia);
CREATE INDEX idx_aih_criado_em ON aihs(criado_em DESC);
CREATE INDEX idx_aih_usuario_cadastro ON aihs(usuario_cadastro_id);

-- Movimentações
CREATE INDEX idx_movimentacoes_aih ON movimentacoes(aih_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data_movimentacao DESC);
CREATE INDEX idx_movimentacoes_usuario ON movimentacoes(usuario_id);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes(tipo);
CREATE INDEX idx_movimentacoes_competencia ON movimentacoes(competencia);

-- Atendimentos
CREATE INDEX idx_atendimentos_aih ON atendimentos(aih_id);
CREATE INDEX idx_atendimentos_numero ON atendimentos(numero_atendimento);

-- Glosas
CREATE INDEX idx_glosas_aih ON glosas(aih_id);
CREATE INDEX idx_glosas_ativa ON glosas(ativa);
CREATE INDEX idx_glosas_tipo ON glosas(tipo);
CREATE INDEX idx_glosas_criado_em ON glosas(criado_em DESC);

-- Logs
CREATE INDEX idx_logs_usuario ON logs_acesso(usuario_id);
CREATE INDEX idx_logs_data ON logs_acesso(data_hora DESC);
CREATE INDEX idx_logs_acao ON logs_acesso(acao);

-- Profissionais
CREATE INDEX idx_profissionais_especialidade ON profissionais(especialidade);
```

### Índices Compostos
Para consultas complexas e relatórios:

```sql
-- Dashboard e estatísticas
CREATE INDEX idx_aih_status_competencia ON aihs(status, competencia);
CREATE INDEX idx_movimentacoes_data_tipo ON movimentacoes(data_movimentacao, tipo);
CREATE INDEX idx_glosas_ativa_tipo ON glosas(ativa, tipo);

-- Pesquisas avançadas
CREATE INDEX idx_movimentacoes_aih_data ON movimentacoes(aih_id, data_movimentacao DESC);
CREATE INDEX idx_logs_usuario_data ON logs_acesso(usuario_id, data_hora DESC);
```

## 📊 Views para Relatórios

### vw_dashboard_stats
Estatísticas rápidas para o dashboard:
```sql
CREATE VIEW vw_dashboard_stats AS
SELECT 
    COUNT(*) as total_aihs,
    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as status_1,
    SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as status_2,
    SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as status_3,
    SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as status_4,
    SUM(valor_inicial) as valor_total_inicial,
    SUM(valor_atual) as valor_total_atual
FROM aihs;
```

### vw_aih_completa
Visão completa da AIH com dados relacionados:
```sql
CREATE VIEW vw_aih_completa AS
SELECT 
    a.id,
    a.numero_aih,
    a.valor_inicial,
    a.valor_atual,
    a.status,
    a.competencia,
    a.criado_em,
    u.nome as usuario_cadastro,
    COUNT(DISTINCT at.id) as total_atendimentos,
    COUNT(DISTINCT m.id) as total_movimentacoes,
    COUNT(DISTINCT CASE WHEN g.ativa = 1 THEN g.id END) as glosas_ativas
FROM aihs a
LEFT JOIN usuarios u ON a.usuario_cadastro_id = u.id
LEFT JOIN atendimentos at ON a.id = at.aih_id
LEFT JOIN movimentacoes m ON a.id = m.aih_id
LEFT JOIN glosas g ON a.id = g.aih_id
GROUP BY a.id;
```

## 🔧 Configurações do Banco

### Configuração WAL Mode
Para melhor concorrência:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB mmap
```

### Configurações de Performance
```sql
PRAGMA optimize;              -- Otimização automática
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA page_size = 4096;
PRAGMA foreign_keys = ON;     -- Integridade referencial
```

## 📈 Triggers para Auditoria

### Trigger para logs automáticos
```sql
CREATE TRIGGER trg_aih_insert_log 
AFTER INSERT ON aihs
BEGIN
    INSERT INTO logs_acesso (usuario_id, acao, detalhes)
    VALUES (NEW.usuario_cadastro_id, 'criar_aih', 
            json_object('numero_aih', NEW.numero_aih, 'valor', NEW.valor_inicial));
END;

CREATE TRIGGER trg_aih_delete_log 
BEFORE DELETE ON aihs
BEGIN
    INSERT INTO logs_acesso (usuario_id, acao, detalhes)
    VALUES (OLD.usuario_cadastro_id, 'excluir_aih',
            json_object('numero_aih', OLD.numero_aih, 'valor', OLD.valor_atual));
END;
```

### Trigger para atualizar valor atual
```sql
CREATE TRIGGER trg_update_valor_aih
AFTER INSERT ON movimentacoes
BEGIN
    UPDATE aihs 
    SET valor_atual = NEW.valor_conta,
        status = NEW.status_aih
    WHERE id = NEW.aih_id;
END;
```

## 💾 Backup e Manutenção

### Estratégia de Backup
1. **Backup Automático**: Diário às 02:00
2. **Backup Manual**: Via interface web
3. **Retenção**: Últimos 30 backups
4. **Formato**: SQLite + compressão gzip

### Scripts de Manutenção
```sql
-- Otimização semanal
PRAGMA optimize;
PRAGMA incremental_vacuum;

-- Limpeza de logs antigos (> 1 ano)
DELETE FROM logs_acesso 
WHERE data_hora < datetime('now', '-1 year');

-- Estatísticas das tabelas
ANALYZE;
```

## 📊 Consultas de Análise

### Estatísticas de uso
```sql
-- AIHs por mês
SELECT 
    competencia,
    COUNT(*) as total,
    SUM(valor_inicial) as valor_total
FROM aihs 
GROUP BY competencia 
ORDER BY competencia DESC;

-- Glosas mais frequentes
SELECT 
    tipo,
    COUNT(*) as total,
    COUNT(DISTINCT aih_id) as aihs_afetadas
FROM glosas 
WHERE ativa = 1
GROUP BY tipo 
ORDER BY total DESC;

-- Produtividade por usuário
SELECT 
    u.nome,
    COUNT(DISTINCT a.id) as aihs_cadastradas,
    COUNT(DISTINCT m.id) as movimentacoes_feitas
FROM usuarios u
LEFT JOIN aihs a ON u.id = a.usuario_cadastro_id
LEFT JOIN movimentacoes m ON u.id = m.usuario_id
GROUP BY u.id, u.nome;
```

## 🔍 Validações e Constraints

### Validações de Negócio
```sql
-- Valores devem ser positivos
CHECK(valor_inicial >= 0)
CHECK(valor_atual >= 0)
CHECK(valor_conta >= 0)

-- Status válidos
CHECK(status IN (1,2,3,4))
CHECK(status_aih IN (1,2,3,4))

-- Tipos de movimentação válidos
CHECK(tipo IN ('entrada_sus', 'saida_hospital'))

-- Glosas ativas/inativas
CHECK(ativa IN (0,1))

-- Competência no formato correto (MM/YYYY)
CHECK(competencia LIKE '__/____' AND 
      CAST(substr(competencia, 1, 2) AS INTEGER) BETWEEN 1 AND 12)
```

## 📋 Dados Iniciais

### Usuário Admin Padrão
```sql
INSERT INTO usuarios (nome, senha_hash) 
VALUES ('admin', '$2b$10$hash_da_senha_admin');
```

### Tipos de Glosa Padrão
```sql
INSERT INTO tipos_glosa (descricao) VALUES 
('Quantidade'),
('Valor'),
('Procedimento'),
('Documentação'),
('Medicamento'),
('Material');
```

### Profissionais Padrão
```sql
INSERT INTO profissionais (nome, especialidade) VALUES 
('Não informado', 'Geral'),
('Auditoria Medicina', 'Medicina'),
('Auditoria Enfermagem', 'Enfermagem');
```

## 🎯 Métricas de Performance

### Tamanhos Esperados (10 anos de operação)
- **AIHs**: ~300.000 registros (30MB)
- **Movimentações**: ~900.000 registros (120MB)
- **Glosas**: ~600.000 registros (60MB)
- **Logs**: ~2.000.000 registros (300MB)
- **Total**: ~500MB (compactado: ~150MB)

### Performance de Consultas
- Dashboard: < 50ms
- Busca AIH: < 10ms
- Relatórios simples: < 200ms
- Relatórios complexos: < 2s
- Backup completo: < 30s

## 🔧 Manutenção Recomendada

### Diária
- Backup automático
- Verificação de integridade
- Limpeza de cache

### Semanal  
- PRAGMA optimize
- Análise de performance
- Limpeza de logs antigos

### Mensal
- VACUUM completo
- Atualização de estatísticas
- Revisão de índices

### Anual
- Arquivamento de dados antigos
- Revisão da estrutura
- Otimização de consultas

Esta estrutura garante escalabilidade, performance e integridade dos dados para o volume esperado de 2.500 AIHs/mês durante 10+ anos de operação.
