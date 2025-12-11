# 🚀 DEPLOY NO RENDER - PASSO A PASSO

## ✅ Projeto já preparado!

Git configurado, código commitado, pronto para deploy.

---

## 📋 PASSOS PARA DEPLOY

### 1️⃣ Criar Repositório GitHub (se ainda não existe)

1. Acesse: https://github.com/CarolineBarbosaReis/Nutricao
2. Se o repositório não existir, crie:
   - Clique no **+** (canto superior direito) → **New repository**
   - Nome: `Nutricao`
   - **NÃO** marque "Initialize with README"
   - Clique em **Create repository**

### 2️⃣ Fazer Push do Código

No terminal do VS Code, rode:

```powershell
cd "c:\Users\pedro\OneDrive\Documentos\Nutrição\project"
git push -u origin main
```

Se pedir autenticação:
- Use seu token de acesso pessoal do GitHub (Settings → Developer settings → Personal access tokens)

### 3️⃣ Deploy no Render

1. **Acesse:** https://render.com
2. **Login** com GitHub
3. Clique em **New +** → **Web Service**
4. **Conecte** o repositório `CarolineBarbosaReis/Nutricao`
5. **Configure:**
   - **Name:** `nutricao-bot`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free

### 4️⃣ Adicionar Variáveis de Ambiente

No Render, vá em **Environment** e adicione:

```
BOT_TOKEN=seu_bot_token_aqui
ADMIN_TELEGRAM_ID=seu_telegram_id_aqui

SUPABASE_URL=sua_supabase_url_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
SUPABASE_PATIENTS_TABLE=patients
SUPABASE_FILES_TABLE=patient_files
SUPABASE_PAYMENTS_TABLE=payments
SUPABASE_STORAGE_BUCKET=patient-files

MERCADOPAGO_ACCESS_TOKEN=seu_mercadopago_token_aqui
MERCADOPAGO_PUBLIC_KEY=sua_mercadopago_public_key_aqui

WEBHOOK_PATH=/telegram/webhook

OPENAI_API_KEY=sua_openai_key_aqui
OPENAI_MODEL=gpt-4o-mini
```

**⚠️ NÃO adicione `WEBHOOK_DOMAIN` ainda!** (vamos adicionar depois)

### 5️⃣ Deploy Inicial

1. Clique em **Create Web Service**
2. Aguarde o build e deploy (3-5 minutos)
3. **Copie a URL** gerada (exemplo: `https://nutricao-bot.onrender.com`)

### 6️⃣ Adicionar WEBHOOK_DOMAIN

1. Volte em **Environment**
2. Adicione nova variável:
   ```
   WEBHOOK_DOMAIN=https://nutricao-bot.onrender.com
   ```
   (Use a URL que o Render te deu)
3. **Salve** (vai fazer redeploy automático)

### 7️⃣ Configurar Webhook do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/notifications/webhooks
2. Clique em **Criar webhook**
3. Configure:
   - **URL:** `https://nutricao-bot.onrender.com/webhook/mercadopago`
   - **Eventos:** Marque "Pagamentos"
4. **Salve**

### 8️⃣ Testar

1. **No Telegram**, envie `/start` para o bot
2. Bot deve responder normalmente
3. Teste gerando um link de pagamento
4. Verifique os **logs** no Render (aba "Logs")

---

## 📊 Monitoramento

- **Logs em tempo real:** https://dashboard.render.com → seu serviço → Logs
- **Métricas:** CPU, RAM, requests
- **Alerts:** Configure email para falhas

---

## ⚠️ Importante sobre Render Free Tier

**Limitação:** Serviço **dorme** após **15 minutos** de inatividade

**Soluções:**
1. **Upgrade para Paid ($7/mês):** Serviço sempre ativo
2. **Ping externo:** Use serviço como UptimeRobot para fazer ping a cada 10min
3. **Aceitar:** Primeira interação pode demorar ~30s (cold start)

---

## 🆘 Solução de Problemas

### Erro no build
- Verifique logs no Render
- Confirme que `package.json` está correto

### Bot não responde
- Verifique logs: procure por erros
- Teste a URL: `curl https://nutricao-bot.onrender.com/`
- Confirme que `WEBHOOK_DOMAIN` está correto

### Pagamentos não processam
- Verifique webhook no Mercado Pago
- Teste: envie notificação manual de teste
- Confirme que URL do webhook termina com `/webhook/mercadopago`

---

## ✅ Checklist Final

- [ ] Código no GitHub (push feito)
- [ ] Web Service criado no Render
- [ ] Todas variáveis de ambiente configuradas
- [ ] `WEBHOOK_DOMAIN` definido com URL do Render
- [ ] Webhook do Mercado Pago configurado
- [ ] Bot testado no Telegram (`/start`)
- [ ] Pagamento testado

---

**Próximos passos:** Siga os passos acima em ordem. Quando chegar no passo 2 (push), me avise se der erro.
