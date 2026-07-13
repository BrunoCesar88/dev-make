# Guia de Configuração — Supabase

Siga estes passos na ordem. Tempo estimado: 15–20 minutos.

---

## Passo 1 — Criar projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique **New project**
3. Preencha:
   - **Name:** `lente-captura`
   - **Database Password:** anote em lugar seguro
   - **Region:** South America (São Paulo) se disponível
4. Aguarde ~2 minutos até o projeto ficar **Active**

---

## Passo 2 — Rodar migrations (SQL)

1. No menu lateral: **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Clique **Run** (deve aparecer "Success")
4. Nova query → cole `supabase/migrations/002_columns_roles_audit.sql`
5. Clique **Run**

---

## Passo 3 — Copiar credenciais

1. **Settings** → **API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ nunca exponha no frontend

---

## Passo 4 — Configurar `.env.local`

No terminal, dentro de `lente-captura/`:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_APP_URL=http://localhost:3000
UAZAPI_BASE_URL=https://free.uazapi.com
```

---

## Passo 5 — Importar os 34 médicos

```bash
cd lente-captura
npm install
npm run seed
```

Deve aparecer: `✅ Concluído: 34 criados, 0 atualizados`

Confira em **Table Editor** → `doctors` (34 linhas).

---

## Passo 6 — Criar primeiro admin

1. **Authentication** → **Users** → **Add user**
2. Email e senha do admin (ex.: seu email)
3. Copie o **User UID**
4. **SQL Editor** → execute:

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'COLE-USER-UID-AQUI',
  'seu@email.com',
  'Admin Lente',
  'admin'
);
```

---

## Passo 7 — Auth no app (próxima implementação)

Na fase atual o painel funciona sem login (service role nas APIs).
Na fase 2 adicionaremos:
- Página `/login`
- Middleware protegendo rotas
- RLS já preparado na migration 002

---

## Passo 8 — Testar local

```bash
npm run dev
```

Abra http://localhost:3000 — dashboard deve carregar dados do Supabase.

---

## Checklist

- [ ] Projeto Supabase criado
- [ ] Migration 001 executada
- [ ] Migration 002 executada
- [ ] `.env.local` configurado
- [ ] `npm run seed` — 34 médicos
- [ ] Primeiro admin criado em `profiles`
- [ ] `npm run dev` funcionando

---

## Problemas comuns

| Erro | Solução |
|------|---------|
| `relation "doctors" does not exist` | Rode migration 001 primeiro |
| Seed falha com auth error | Verifique `SUPABASE_SERVICE_ROLE_KEY` |
| Dashboard vazio | Confirme URL/keys e rode seed |
| Projeto pausado | Dashboard Supabase → **Restore project** |

---

## Próximo: Google Sheets

Depois do Supabase, configure a Service Account (ver README principal).
Compartilhe cada planilha de médico com o email da service account.

Quando estiver pronta, me avise e seguimos com tokens Uazapi e teste de webhook.
