# ✅ PROJETO PREPARADO PARA DEPLOY

O bot está pronto para rodar em produção no Railway!

## 📦 O que foi configurado:

1. ✅ **Git** inicializado e commit feito
2. ✅ **Railway CLI** instalado
3. ✅ **Arquivos de deploy** criados:
   - `railway.json` - Configuração Railway
   - `Procfile` - Para Render/Heroku
   - `.gitignore` - Protege credenciais
   - `DEPLOY.md` - Instruções completas

## 🚀 PRÓXIMOS PASSOS (escolha uma opção):

### OPÇÃO A: Deploy via Railway Dashboard (MAIS FÁCIL)

1. **Acesse:** https://railway.app
2. **Login** com GitHub ou email
3. **New Project** → "Empty Project"
4. **Deploy from Local**
5. Na pasta do projeto, rode:
   ```powershell
   railway login
   railway link
   railway up
   ```
6. **Configure variáveis** (Railway Dashboard → Variables):
   - Copie tudo do seu `.env` EXCETO `WEBHOOK_DOMAIN`
7. **Pegue a URL** gerada (tipo: `nutricao-bot-production.up.railway.app`)
8. **Adicione** `WEBHOOK_DOMAIN=https://sua-url.up.railway.app`
9. **Configure Mercado Pago webhook:**
   - https://www.mercadopago.com.br/developers/panel/notifications/webhooks
   - URL: `https://sua-url.up.railway.app/webhook/mercadopago`

### OPÇÃO B: Deploy via Render (ALTERNATIVA)

1. **Acesse:** https://render.com
2. **New** → **Web Service**
3. **Connect Repository** (crie repo no GitHub primeiro)
4. Configure:
   - Build: `npm install`
   - Start: `node server.js`
5. **Adicione variáveis** do `.env`
6. **Deploy** e configure webhook

---

## 🔧 Comandos Railway (se escolheu Opção A):

```powershell
# 1. Login
railway login

# 2. Criar/linkar projeto
railway init

# 3. Deploy
railway up

# 4. Ver logs
railway logs

# 5. Adicionar variáveis (uma por vez)
railway variables set BOT_TOKEN="seu_token_aqui"
railway variables set ADMIN_TELEGRAM_ID="973133558"
# ... repita para todas do .env

# 6. Ver domínio público
railway domain
```

---

## 📋 Checklist Final

Antes de considerar pronto:

- [ ] Bot deployado no Railway/Render
- [ ] Variáveis de ambiente configuradas
- [ ] `WEBHOOK_DOMAIN` definido com URL pública
- [ ] Webhook do Mercado Pago configurado
- [ ] Teste: envie `/start` no Telegram
- [ ] Teste: gere um link de pagamento
- [ ] Verifique logs: sem erros

---

## 🆘 Suporte

Se tiver dúvida em algum passo, me avise!

**Arquivos importantes:**
- `DEPLOY.md` - Guia completo de deploy
- `.env` - Suas credenciais (NUNCA commite)
- `railway.json` - Config Railway
- `server.js` - Já preparado para webhook

---

**Status:** ✅ Pronto para deploy  
**Próximo:** Escolha Railway (recomendado) ou Render e siga os passos acima
