# Arquitetura — Colunas, Permissões, n8n e Google Sheets

## Visão geral

```
WhatsApp → Uazapi → [n8n opcional] → API Lente → Supabase (fonte da verdade)
                                              ↓
                                    Google Sheets (espelho)
                                              ↑
                         Admin altera colunas → replica headers em todas planilhas
```

**Supabase** é a fonte da verdade. **Google Sheets** é espelho sincronizado.
**n8n** pode continuar existindo como "tubo" durante a migração.

## Papéis (roles)

| Papel | Pode fazer | Não pode |
|-------|-----------|----------|
| **Admin** | Criar/editar colunas, replicar para todos, criar médicos, adicionar admins, ver tudo | — |
| **Médico** | Ver/editar leads dele, mudar status, mover cards | Criar colunas, alterar estrutura |
| **Secretária** | Ver/editar leads dos médicos atribuídos, mudar status | Criar colunas, alterar estrutura |

## Colunas padrão

Todas as planilhas seguem o mesmo schema definido em `column_definitions`:

- Data, Nome, Telefone, Mensagem, Status, Origem, Observações
- Admin adiciona/renomeia/reordena → sistema atualiza Supabase + fila sync Sheets

## Sync Google Sheets ao editar colunas

**Sim, é possível.** Quando admin altera colunas:

1. Atualiza `column_definitions` no Supabase
2. Enfileira `sync_headers` para cada médico em `sheets_sync_queue`
3. Worker usa Google Sheets API:
   - Atualiza linha 1 (cabeçalhos)
   - Insere colunas novas se necessário
   - Preserva dados existentes nas linhas

**Limitação:** se alguém editar cabeçalhos manualmente no Sheets, o próximo sync do admin sobrescreve. Por isso só admin edita estrutura.

## Audit log

Toda ação gera registro em `audit_logs`:

- Quem (user_id, email, role)
- O quê (lead, coluna, status)
- Valor anterior → novo valor
- Quando

## n8n — manter ou substituir?

### Opção recomendada (migração gradual)

```
Uazapi webhook → n8n (transformações que já existem) → POST /api/webhook/ingest
                                                      → Supabase + Sheets
```

- n8n continua fazendo o que já faz (filtros, formatação)
- Sistema vira o destino final (banco + planilha + UI)
- Depois de validar, pode remover o node Google Sheets do n8n

### Opção final (sem n8n)

```
Uazapi webhook → /api/webhook/uazapi → Supabase + Sheets
```

- Menos pontos de falha
- Tudo no painel Lente

**Resposta direta:** sim, pode manter o n8n enviando para o sistema. Basta trocar o destino do n8n de "Google Sheets" para "HTTP Request → API Lente".

## Fluxo de edição de status (médico/secretária)

1. Usuário muda status no painel (tipo kanban/planilha)
2. Supabase atualiza `leads.status` + `leads.fields`
3. Registra `audit_logs`
4. Enfileira `update_cell` na planilha Google do médico
