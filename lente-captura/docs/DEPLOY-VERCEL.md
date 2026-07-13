# Deploy na Vercel (sem Node no Mac)

Guia passo a passo para colocar o painel Lente online.

---

## Pré-requisitos (já feitos)

- [x] Supabase configurado
- [x] 34 médicos importados (`npm run seed` — já rodou na nuvem)
- [x] Repo no GitHub: `BrunoCesar88/dev-make`
- [x] Branch: `cursor/lente-captura-leads-9aa6`

---

## Passo 1 — Criar conta Vercel

1. Acesse [vercel.com](https://vercel.com)
2. **Sign Up** → **Continue with GitHub**
3. Autorize acesso ao GitHub

---

## Passo 2 — Importar projeto

1. **Add New… → Project**
2. Encontre **dev-make** → **Import**
3. Configure:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Next.js (detecta automaticamente) |
| **Root Directory** | `lente-captura` ← **IMPORTANTE** |
| **Branch** | `cursor/lente-captura-leads-9aa6` |

Clique **Edit** ao lado de Root Directory e selecione `lente-captura`.

---

## Passo 3 — Variáveis de ambiente

Antes de Deploy, em **Environment Variables**, adicione:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dnzoysrccrskuuxxvqpv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua chave anon (Legacy) |
| `SUPABASE_SERVICE_ROLE_KEY` | sua service_role (Legacy) |
| `NEXT_PUBLIC_APP_URL` | deixe vazio por agora — atualize depois |
| `UAZAPI_BASE_URL` | `https://free.uazapi.com` |

Marque **Production**, **Preview** e **Development**.

Clique **Deploy** e aguarde ~2 minutos.

---

## Passo 4 — Atualizar URL do app

Depois do deploy, a Vercel gera uma URL tipo:
```
https://dev-make-xxxxx.vercel.app
```

1. Vercel → projeto → **Settings → Environment Variables**
2. Edite `NEXT_PUBLIC_APP_URL` → cole a URL da Vercel
3. **Deployments → … → Redeploy** (para aplicar)

Essa URL é usada nos webhooks Uazapi.

---

## Passo 5 — Criar admin no Supabase

1. Supabase → **Authentication → Users → Add user**
2. Seu email + senha
3. Copie o **User UID**
4. **SQL Editor**:

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'SEU-UUID-AQUI',
  'brunocesartrabalho8@gmail.com',
  'Bruna',
  'admin'
);
```

---

## Passo 6 — Testar o painel

Abra a URL da Vercel. Deve mostrar:
- Dashboard
- 34 médicos em **Médicos**
- Leads (vazio até configurar Uazapi)

---

## Próximos passos

1. **Google Sheets** — Service Account + compartilhar planilhas
2. **Uazapi** — token por médico + webhook
3. **n8n** — apontar HTTP para `https://SUA-URL.vercel.app/api/webhook/uazapi?instance=NOME`

---

## Problemas comuns

| Erro | Solução |
|------|---------|
| Build failed | Confirme Root Directory = `lente-captura` |
| Dashboard vazio | Verifique env vars na Vercel |
| 404 em /medicos | Redeploy após configurar env vars |
| Webhook não funciona | Atualize `NEXT_PUBLIC_APP_URL` e redeploy |

---

## Webhook Uazapi (referência)

```
https://SUA-URL.vercel.app/api/webhook/uazapi?instance=Dra-Bruna-Lenz
```

Troque `Dra-Bruna-Lenz` pelo `instance_name` de cada médico.
