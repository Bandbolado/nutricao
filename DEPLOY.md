# 🚀 Deploy do Bot de Nutrição

## Passo a Passo - Railway (Recomendado)

### 1. Criar Conta e Projeto
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Escolha "Deploy from GitHub repo"
5. Conecte seu repositório (ou faça upload via CLI)

### 2. Configurar Variáveis de Ambiente
No Railway, vá em "Variables" e adicione:

```env
BOT_TOKEN=seu_bot_token_aqui
ADMIN_TELEGRAM_ID=seu_telegram_id_aqui

SUPABASE_URL=sua_url_supabase_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
SUPABASE_PATIENTS_TABLE=patients
SUPABASE_FILES_TABLE=patient_files
SUPABASE_PAYMENTS_TABLE=payments
SUPABASE_STORAGE_BUCKET=patient-files

MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=sua_public_key_aqui

WEBHOOK_DOMAIN=https://SEU_PROJETO.up.railway.app
WEBHOOK_PATH=/telegram/webhook
PORT=3000

OPENAI_API_KEY=sua_openai_key_aqui
OPENAI_MODEL=gpt-4o-mini
```

### 3. Obter URL Pública
1. Após deploy, Railway gera uma URL pública tipo `https://nutricao-bot-production.up.railway.app`
2. Copie essa URL
3. Volte em "Variables" e atualize `WEBHOOK_DOMAIN` com essa URL
4. Salve e aguarde redeploy automático

### 4. Configurar Webhook do Mercado Pago
1. Acesse: https://www.mercadopago.com.br/developers/panel/notifications/webhooks
2. Crie novo webhook:
   - **URL:** `https://SEU_PROJETO.up.railway.app/webhook/mercadopago`
   - **Eventos:** Selecione "Pagamentos"
3. Salve

### 5. Testar
- Envie `/start` no Telegram
- Bot deve responder normalmente
- Teste um pagamento

---

## Alternativa - Render

### 1. Criar Serviço
1. Acesse https://render.com
2. Faça login com GitHub
3. "New" → "Web Service"
4. Conecte o repositório

### 2. Configurar
- **Name:** nutricao-bot
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Plan:** Free

### 3. Variáveis de Ambiente
Adicione as mesmas variáveis acima, ajustando:
```
WEBHOOK_DOMAIN=https://nutricao-bot.onrender.com
```

### 4. Deploy e Webhook
- Aguarde deploy
- Configure webhook do Mercado Pago com a URL do Render

---

## Via Railway CLI (Alternativa Rápida)

### 1. Instalar CLI
```powershell
npm install -g @railway/cli
```

### 2. Login e Deploy
```powershell
cd "c:\Users\pedro\OneDrive\Documentos\Nutrição\project"
railway login
railway init
railway up
```

### 3. Configurar Variáveis
```powershell
railway variables set BOT_TOKEN="8518395142:AAG5WD46RB2DepFWBYQzPflEaJh3n1fuPQI"
railway variables set ADMIN_TELEGRAM_ID="973133558"
# ... adicione todas as outras
```

### 4. Obter Domínio
```powershell
railway domain
```
Use o domínio retornado para atualizar `WEBHOOK_DOMAIN`:
```powershell
railway variables set WEBHOOK_DOMAIN="https://SEU_DOMINIO.up.railway.app"
```

---

## Monitoramento

### Railway
- Logs em tempo real: https://railway.app/dashboard
- Métricas de CPU/RAM
- Restart automático em caso de crash

### Render
- Logs: https://dashboard.render.com
- Health checks automáticos
- Emails de alerta

---

## Solução de Problemas

### Bot não responde
1. Verifique logs no Railway/Render
2. Confirme que `WEBHOOK_DOMAIN` está correto
3. Teste: `curl https://SEU_DOMINIO.up.railway.app/`

### Pagamentos não processam
1. Confirme webhook no Mercado Pago
2. Verifique logs para erros de webhook
3. Teste: `node scripts/check-payments.js` localmente

### Erro de porta
- Railway/Render definem `PORT` automaticamente
- Certifique-se que server.js usa `process.env.PORT || 3000`

---

## Segurança

✅ **Nunca commite `.env`** (já está no `.gitignore`)  
✅ Use variáveis de ambiente do provedor  
✅ Rotacione tokens periodicamente  
✅ Monitore logs de acessos suspeitos  

---

## Custos

### Railway
- **Free Tier:** $5 de crédito/mês
- Estimativa: ~$3-5/mês para este bot
- Após free tier: ~$10/mês

### Render
- **Free Tier:** Limitado
- Serviço dorme após 15min inativo
- Paid: $7/mês para sempre ativo

### Recomendação
Railway é melhor custo-benefício para este projeto.
