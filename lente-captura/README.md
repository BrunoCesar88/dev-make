# Lente — Captura de Leads

Sistema de gestão de captura de leads via WhatsApp (Uazapi) para médicos e clínicas. Substitui o fluxo n8n com painel web, banco Supabase e sincronização automática com Google Sheets.

## Médicos ativos importados

**34 médicos** com status `Ativada` e API `UazApi`, extraídos da planilha de controle:

| Gestor | Qtd |
|--------|-----|
| Alison | 14 |
| Klaus  | 9  |
| Soraya | 12 |

## Funcionalidades (Fase 1)

- Dashboard com visão geral de conexões e leads
- Lista de médicos agrupada por gestor
- Página por médico: status WhatsApp, QR Code para reconectar, configuração de token Uazapi
- Webhook que recebe mensagens → salva no Supabase → append na planilha Google Sheets
- Histórico de leads e logs de conexão

## Stack

- **Frontend:** Next.js 16 + Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco:** Supabase (PostgreSQL)
- **WhatsApp:** Uazapi GO V2
- **Planilhas:** Google Sheets API (Service Account)

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, execute `supabase/migrations/001_initial_schema.sql`
3. Copie URL, anon key e service role key

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha todas as variáveis.

### 3. Seed dos médicos

```bash
npm install
npm run seed
```

### 4. Google Sheets

1. Crie Service Account no Google Cloud
2. Ative Google Sheets API
3. Compartilhe **cada planilha de médico** com o e-mail da service account (Editor)
4. Colunas appendidas: Data, Nome, Telefone, Mensagem, Médico, Origem

### 5. Uazapi — por médico

1. Acesse `/medicos` → clique em **Gerenciar**
2. Cole o **token** da instância Uazapi
3. Clique **Salvar + configurar webhook**
4. Use **Conectar WhatsApp** para exibir QR Code

Webhook gerado automaticamente:
```
https://SEU-DOMINIO/api/webhook/uazapi?instance=NOME-INSTANCIA
```

### 6. Rodar local

```bash
npm run dev
```

Acesse http://localhost:3000

## Deploy

- **Frontend/API:** Vercel (grátis)
- **Banco:** Supabase (grátis para começar; Pro ~US$25/mês para produção sem pausa)

Configure `NEXT_PUBLIC_APP_URL` com a URL de produção.

## Estrutura

```
lente-captura/
├── data/active-doctors.json    # 34 médicos da planilha
├── supabase/migrations/        # Schema SQL
├── scripts/seed-doctors.ts     # Import médicos
├── src/
│   ├── app/                    # Páginas e API routes
│   ├── components/             # UI
│   └── lib/                    # Uazapi, Sheets, Supabase
```

## Próximas fases

- [ ] Login por médico (portal self-service)
- [ ] Alertas quando conexão cair
- [ ] Filtro por gestor
- [ ] Migração completa do workflow n8n

## Plano Supabase gratuito

Funciona para testes e poucos médicos. Limite principal: projeto pausa após 7 dias sem atividade. Para produção com 34 médicos, recomenda-se **Supabase Pro**.
