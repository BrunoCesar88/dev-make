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

**Projeto Supabase dedicado ao Captura:** rode as migrations `001` … `014` em `public` (como no README).

**Projeto Supabase compartilhado** (já tem tabelas legadas em `public`, ex. planilha/n8n): use o schema isolado `captura`:

1. SQL Editor → `supabase/remote/01-captura-schema-install.sql` → **Run** (não altera `public.leads`, `Lente-Medicos`, etc.)
2. **Settings** → **API** → **Exposed schemas** → adicione `captura` e salve

O app usa `db: { schema: 'captura' }` nos clients Supabase.

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

## Passo 7 — Auth no app

1. Crie o usuário admin (passo 6)
2. Acesse `/login` com email e senha
3. Rotas protegidas por middleware — webhooks permanecem públicos

**Perfis:**
- `admin` — acesso total, gestão de colunas e médicos
- `doctor` — vê/edita leads do seu médico, reconecta WhatsApp
- `secretary` — vê/edita leads dos médicos atribuídos em `secretary_assignments`

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
