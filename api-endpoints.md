# 📚 API Endpoints - Sistema AIH

**Última atualização**: Implementações mais recentes incluem:
- ⭐ Sistema de health check avançado
- ⭐ Endpoints de logs de exclusão  
- ⭐ Validação de senhas para exclusões
- ⭐ Novos relatórios com filtros por competência/período
- ⭐ Exportação de histórico de movimentações
- ⭐ Sistema de limpeza e reset de base

## 🔐 Autenticação

### POST /api/login
Realiza login no sistema.
```json
Request: { 
    "nome": "usuario", 
    "senha": "senha123" 
}
Response: { 
    "token": "jwt_token", 
    "nome": "usuario" 
}
Errors: 401 - Credenciais inválidas
```

### POST /api/cadastrar
Cria novo usuário (requer permissões de admin).
```json
Request: { 
    "nome": "novo_usuario", 
    "senha": "senha123" 
}
Response: { 
    "success": true, 
    "message": "Usuário criado com sucesso" 
}
Errors: 400 - Dados inválidos, 409 - Usuário já existe
```

## 👥 Gestão de Usuários

### GET /api/usuarios
Lista todos os usuários (admin apenas).
```json
Response: {
    "usuarios": [
        {
            "id": 1,


### POST /api/validar-senha ⭐ NOVO
Valida senha do usuário logado (para operações sensíveis).
```json
Request: { 
    "senha": "senha_atual_usuario" 
}
Response: { 
    "success": true 
}
Headers: Authorization: Bearer <token>
Errors: 401 - Senha incorreta, 404 - Usuário não encontrado
```

### DELETE /api/admin/deletar-movimentacao ⭐ NOVO
Deleta movimentação específica com justificativa obrigatória.
```json
Request: { 
    "movimentacao_id": 123,
    "justificativa": "Motivo detalhado da exclusão (min 10 chars)" 
}
Response: { 
    "success": true,
    "message": "Movimentação deletada com sucesso",
    "movimentacao_deletada": {
        "id": 123,
        "aih": "12345",
        "tipo": "entrada_sus"
    }
}
Headers: Authorization: Bearer <token>
Errors: 400 - Justificativa obrigatória, 403 - Sem permissão, 404 - Não encontrada
```

### DELETE /api/admin/deletar-aih ⭐ NOVO
Deleta AIH completa com todos os dados relacionados.
```json
Request: { 
    "numero_aih": "12345",
    "justificativa": "Motivo detalhado da exclusão (min 10 chars)" 
}
Response: { 
    "success": true,
    "message": "AIH deletada completamente com sucesso",
    "aih_deletada": {
        "numero_aih": "12345",
        "movimentacoes_removidas": 5,
        "glosas_removidas": 3,
        "atendimentos_removidos": 2
    }
}
Headers: Authorization: Bearer <token>
Errors: 400 - Justificativa obrigatória, 404 - AIH não encontrada
```


            "nome": "admin",
            "criado_em": "2024-01-01T10:00:00Z"
        }
    ]
}
Headers: Authorization: Bearer <token>
```

### DELETE /api/usuarios/:id
Remove usuário do sistema (admin apenas).
```json
Response: { "success": true }
Errors: 403 - Sem permissão, 404 - Usuário não encontrado
```

## 🏥 AIH (Autorização de Internação Hospitalar)

### GET /api/dashboard
Retorna estatísticas do dashboard principal.
```json
Response: {
    "total_cadastradas": 150,
    "em_processamento": 45,
    "finalizada_aprovacao_direta": 30,
    "ativa_aprovacao_indireta": 25,
    "ativa_discussao": 20,
    "finalizada_discussao": 75,
    "por_status": {
        "1": 30,
        "2": 25,
        "3": 20,
        "4": 75
    },
    "ultimas_movimentacoes": [...],
    "valor_total_processamento": 125000.50
}
Cache: 2 minutos
```

### GET /api/aih/:numero
Busca AIH específica por número.
```json
Response: {
    "id": 1,
    "numero_aih": "12345",
    "valor_inicial": 1500.00,
    "valor_atual": 1200.00,
    "status": 2,
    "competencia": "12/2024",
    "criado_em": "2024-12-01T10:00:00Z",
    "usuario_cadastro": "admin",
    "atendimentos": ["A001", "A002"],
    "movimentacoes": [...],
    "glosas": [...],
    "total_glosas_ativas": 3
}
Errors: 404 - AIH não encontrada
```

### POST /api/aih
Cadastra nova AIH no sistema.
```json
Request: {
    "numero_aih": "12345",
    "valor_inicial": 1500.00,
    "competencia": "12/2024",
    "atendimentos": ["A001", "A002"]
}
Response: { 
    "success": true, 
    "id": 1,
    "numero_aih": "12345"
}
Errors: 400 - Dados inválidos, 409 - AIH já existe
```

### DELETE /api/aih/:numero
Exclui AIH completa com justificativa.
```json
Request: {
    "justificativa": "Motivo detalhado da exclusão"
}
Response: { 
    "success": true,
    "message": "AIH excluída com sucesso"
}
Errors: 400 - Justificativa obrigatória, 404 - AIH não encontrada
```

## 🔄 Movimentações

### GET /api/movimentacoes/:aihId
Lista movimentações de uma AIH.
```json
Response: {
    "movimentacoes": [
        {
            "id": 1,
            "tipo": "entrada_sus",
            "data_movimentacao": "2024-12-01T14:30:00Z",
            "usuario": "auditor1",
            "valor_conta": 1200.00,
            "competencia": "12/2024",
            "prof_medicina": "Dr. Silva",
            "status_aih": 2
        }
    ]
}
```

### POST /api/aih/:id/movimentacao
Cria nova movimentação para AIH.
```json
Request: {
    "tipo": "entrada_sus",
    "status_aih": 2,
    "valor_conta": 1200.00,
    "competencia": "12/2024",
    "prof_medicina": "Dr. Silva",
    "prof_enfermagem": "Enf. Maria",
    "prof_fisioterapia": "",
    "prof_bucomaxilo": ""
}
Response: { 
    "success": true,
    "movimentacao_id": 15
}
Validations: Valor deve ser positivo, status entre 1-4
```

### DELETE /api/movimentacoes/:id
Exclui movimentação específica com justificativa.
```json
Request: {
    "justificativa": "Motivo da exclusão da movimentação"
}
Response: { 
    "success": true,
    "message": "Movimentação excluída com sucesso"
}
```

## 📝 Glosas e Pendências

### GET /api/aih/:id/glosas
Lista glosas de uma AIH específica.
```json
Response: {
    "glosas": [
        {
            "id": 1,
            "linha": "Material cirúrgico",
            "tipo": "Quantidade",
            "profissional": "Dr. Silva",
            "quantidade": 2,
            "ativa": true,
            "criado_em": "2024-12-01T15:00:00Z"
        }
    ],
    "total_ativas": 1
}
```

### POST /api/aih/:id/glosas
Adiciona nova glosa à AIH.
```json
Request: {
    "linha": "Material cirúrgico",
    "tipo": "Quantidade", 
    "profissional": "Dr. Silva",
    "quantidade": 2
}
Response: { 
    "success": true,
    "glosa_id": 10
}
```

### DELETE /api/glosas/:id
Remove glosa específica.
```json
Response: { 
    "success": true,
    "message": "Glosa removida com sucesso"
}
```

### GET /api/tipos-glosa
Lista tipos de glosa configurados.
```json
Response: {
    "tipos": [
        { "id": 1, "descricao": "Quantidade" },
        { "id": 2, "descricao": "Valor" },
        { "id": 3, "descricao": "Procedimento" }
    ]
}
```

### POST /api/tipos-glosa
Adiciona novo tipo de glosa.
```json
Request: { "descricao": "Novo Tipo" }
Response: { "success": true, "id": 4 }
```

### DELETE /api/tipos-glosa/:id
Remove tipo de glosa.
```json
Response: { "success": true }
```

## 👨‍⚕️ Profissionais

### GET /api/profissionais
Lista profissionais cadastrados.
```json
Response: {
    "profissionais": [
        { 
            "id": 1, 
            "nome": "Dr. Silva", 
            "especialidade": "Medicina" 
        },
        { 
            "id": 2, 
            "nome": "Enf. Maria", 
            "especialidade": "Enfermagem" 
        }
    ]
}
```

### POST /api/profissionais
Adiciona novo profissional.
```json
Request: { 
    "nome": "Dr. Costa", 
    "especialidade": "Medicina" 
}
Response: { 
    "success": true, 
    "id": 3 
}
```

### DELETE /api/profissionais/:id
Remove profissional.
```json
Response: { "success": true }
```

## 🔍 Pesquisa Avançada

### POST /api/pesquisar
Pesquisa AIHs com filtros avançados.
```json
Request: {
    "filtros": {
        "status": [2, 3],
        "competencia": "12/2024",
        "data_inicio": "2024-12-01",
        "data_fim": "2024-12-31",
        "profissional_medicina": "Dr. Silva",
        "valor_minimo": 1000,
        "valor_maximo": 5000,
        "numero_aih": "12345",
        "numero_atendimento": "A001"
    },
    "ordenacao": "data_desc",
    "limite": 50,
    "pagina": 1
}
Response: {
    "resultados": [...],
    "total": 150,
    "paginas": 3,
    "pagina_atual": 1
}
```

## 📊 Relatórios Avançados

### GET /api/relatorios/:tipo
Gera relatório específico.
**Tipos disponíveis:**
- `acessos` - Relatório de acessos dos usuários
- `glosas-profissional` - Glosas agrupadas por profissional
- `aihs-profissional` - AIHs por profissional auditor
- `aprovacoes` - Relatório de aprovações por período
- `tipos-glosa` - Análise por tipos de glosa
- `analise-preditiva` - Análise de tendências
- `produtividade-auditores` - Produtividade dos auditores
- `detalhamento-status` - Detalhamento por status
- `estatisticas-periodo` - Estatísticas gerais do período
- `analise-temporal-cadastros` - Análise temporal de cadastros
- `ranking-glosas-frequentes` - Ranking de glosas mais frequentes
- `analise-valores-glosas` - Análise de valores das glosas

```json
Query Parameters:
- data_inicio (opcional): Data inicial do período
- data_fim (opcional): Data final do período
- competencia (opcional): Competência específica

Response: {
    "dados": [...],
    "metadados": {
        "titulo": "Nome do Relatório",
        "periodo": "01/12/2024 a 31/12/2024",
        "total_registros": 100,
        "gerado_em": "2024-12-15T10:30:00Z"
    }
}
Cache: 15 minutos
```

### POST /api/relatorios/:tipo/export
Exporta relatório com filtros personalizados.
```json
Request: {
    "filtros": {
        "data_inicio": "2024-12-01",
        "data_fim": "2024-12-31",
        "status": [2, 3]
    },
    "formato": "excel"
}
Response: Arquivo para download
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

## 📥📤 Exportação e Backup

### GET /api/export/:formato
Exporta dados gerais do sistema.
**Formatos suportados:** `csv`, `excel`, `json`
```json
Query Parameters:
- filtros (opcional): JSON com filtros de exportação
- incluir_glosas (opcional): true/false
- incluir_movimentacoes (opcional): true/false

Response: Arquivo para download
```

### POST /api/export/:formato
Exporta dados com filtros específicos.
```json
Request: {
    "filtros": {
        "status": [2, 3],
        "competencia": "12/2024"
    },
    "campos": ["numero_aih", "valor_atual", "status"],
    "incluir_relacionados": true
}
Response: Arquivo para download
```

### GET /api/backup
Download do banco de dados completo.
```json
Response: arquivo aih.db
Content-Type: application/x-sqlite3
Content-Disposition: attachment; filename="backup-aih-YYYYMMDD.db"
```

### POST /api/backup/create
Cria backup manual do sistema.
```json
Request: {
    "incluir_logs": true,
    "compactar": true
}
Response: {
    "success": true,
    "arquivo": "backup-20241215-103000.db",
    "tamanho": "2.5MB"
}
```

## 🔧 Sistema e Monitoramento

### GET /api/system/status
Status atual do sistema.
```json
Response: {
    "status": "online",
    "uptime": "5 dias, 14 horas",
    "database": {
        "tamanho_mb": 12.5,
        "total_aihs": 2500,
        "total_movimentacoes": 8750,
        "total_glosas": 1200
    },
    "cache": {
        "hit_rate": 85.2,
        "entradas_ativas": 150
    },
    "memoria": {
        "usado_mb": 45.2,
        "livre_mb": 178.8
    }
}
```

### POST /api/system/cleanup
Executa limpeza do sistema.
```json
Request: {
    "limpar_cache": true,
    "otimizar_banco": true,
    "remover_logs_antigos": true
}
Response: {
    "success": true,
    "acoes_executadas": [
        "Cache limpo",
        "Banco otimizado (VACUUM)",
        "Logs antigos removidos"
    ],
    "espaco_liberado_mb": 15.2
}
```

## 📈 Rate Limiting e Cache

### Rate Limiting
- **Geral**: 100 requisições por minuto por IP
- **Login**: 5 tentativas por minuto por IP
- **Relatórios**: 10 requisições por minuto por usuário
- **Backup**: 2 requisições por hora por usuário

### Cache Headers
```
Cache-Control: public, max-age=120  (Dashboard)
Cache-Control: public, max-age=300  (Listas estáticas)
Cache-Control: public, max-age=900  (Relatórios)
Cache-Control: no-cache             (Dados sensíveis)
```

## 🔒 Segurança

### Headers de Segurança
Todas as respostas incluem:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Autenticação JWT
```
Header: Authorization: Bearer <token>
Expiração: 24 horas
Algoritmo: HS256
```

### Logs de Auditoria
Todas as operações sensíveis são registradas:
- Criação/exclusão de AIHs
- Exclusão de movimentações
- Gestão de usuários
- Acessos ao sistema
- Exportações de dados

## ❌ Códigos de Erro Comuns

- **400** - Bad Request: Dados inválidos ou malformados
- **401** - Unauthorized: Token inválido ou expirado
- **403** - Forbidden: Sem permissão para a operação
- **404** - Not Found: Recurso não encontrado
- **409** - Conflict: Recurso já existe (ex: AIH duplicada)
- **429** - Too Many Requests: Rate limit excedido
- **500** - Internal Server Error: Erro interno do servidor

## 📝 Estrutura Padrão de Resposta

### Sucesso
```json
{
    "success": true,
    "data": {...},
    "message": "Operação realizada com sucesso"
}
```

### Erro
```json
{
    "error": "Descrição do erro",
    "code": "ERROR_CODE",
    "details": {...}
}
```

### Lista com Paginação
```json
{
    "items": [...],
    "total": 150,
    "pagina": 1,
    "total_paginas": 15,
    "itens_por_pagina": 10
}
```

## 🚀 Performance

### Consultas Otimizadas
- Dashboard: < 100ms
- Pesquisa simples: < 200ms
- Relatórios: < 2s
- Exportação: < 10s (dependendo do volume)

### Cache Hit Rates
- Dashboard: ~90%
- Listas estáticas: ~95%
- Relatórios: ~80%

Esta documentação é atualizada automaticamente e reflete o estado atual da API.


## 🏥 Health Check Avançado ⭐ NOVO

### GET /api/health
Endpoint avançado de verificação de saúde do sistema.
```json
Response: {
    "status": "healthy|warning|critical",
    "timestamp": "2024-12-15T10:30:00Z",
    "uptime": 86400,
    "memory": {
        "rss": 45678912,
        "heapTotal": 25165824,
        "heapUsed": 15728640,
        "external": 1024000
    },
    "database": {
        "total_aihs": 2500,
        "db_size_mb": 12.5,
        "connections": 23,
        "available_connections": 27
    },
    "performance": {
        "errorRate": 0.02,
        "avgResponseTime": 150.5,
        "cacheHitRate": 0.85
    },
    "issues": [
        "Nenhum problema detectado"
    ],
    "alerts": [
        {
            "type": "info",
            "message": "Sistema operando normalmente",
            "timestamp": "2024-12-15T10:30:00Z"
        }
    ]
}
Status Codes:
- 200: Sistema saudável ou com warnings
- 503: Sistema em estado crítico
```

