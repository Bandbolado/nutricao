# 💳 Guia de Configuração - Mercado Pago

## 📋 Pré-requisitos

1. ✅ Conta no Mercado Pago (gratuita)
2. ✅ CPF ou CNPJ
3. ✅ Dados bancários cadastrados

---

## 🔧 Passo a Passo

### 1️⃣ Criar Conta Mercado Pago

1. Acesse: https://www.mercadopago.com.br
2. Clique em "Criar conta"
3. Complete o cadastro com seus dados
4. Valide seu email

### 2️⃣ Obter Access Token

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Clique em "Criar aplicação"
3. Nome: "Bot Nutrição Telegram"
4. Selecione: "Pagamentos online"
5. Após criar, vá em **"Credenciais de produção"**
6. Copie o **"Access Token"**

⚠️ **NUNCA compartilhe seu Access Token!**

### 3️⃣ Configurar .env

Adicione no arquivo `.env`:

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEBHOOK_DOMAIN=https://seu-dominio.com
```

**Importante:**
- `WEBHOOK_DOMAIN`: URL pública do seu bot (Render, Railway, etc)
- Em desenvolvimento local, use `ngrok` para ter URL pública

### 4️⃣ Criar Tabela no Supabase

Execute este SQL no **SQL Editor** do Supabase:

```sql
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  plan_days INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_id VARCHAR(255),
  preference_id VARCHAR(255),
  payment_link TEXT,
  payment_method VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_preference_id ON payments(preference_id);
CREATE INDEX idx_payments_created ON payments(created_at);
```

### 5️⃣ Testar em Desenvolvimento (Local)

Para testar localmente, use **ngrok**:

```bash
# Instalar ngrok
npm install -g ngrok

# Iniciar ngrok na porta 3000
ngrok http 3000
```

Copie a URL gerada (ex: `https://abc123.ngrok.io`) e configure:

```env
WEBHOOK_DOMAIN=https://abc123.ngrok.io
```

### 6️⃣ Configurar Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em sua aplicação
3. Clique em **"Webhooks"**
4. URL de notificação: `https://seu-dominio.com/webhook/mercadopago`
5. Eventos: Selecione **"payment"**
6. Clique em "Salvar"

---

## 🧪 Testar Pagamento

### Modo Sandbox (Teste):

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **"Credenciais de teste"**
3. Copie o **Access Token de teste**
4. Use no `.env` temporariamente para testes

**Cartões de teste:**
- Aprovado: `5031 4332 1540 6351` (CVV: 123, Validade: 11/25)
- Rejeitado: `5031 7557 3453 0604`

### Modo Produção:

1. Use **Access Token de produção**
2. Faça um pagamento real de R$ 1,00 para testar
3. Verifique se o webhook foi chamado
4. Confirme se o plano foi renovado

---

## 🎯 Fluxo Completo

```
1. Paciente → Menu → 💰 Renovar Plano
2. Bot mostra planos (Mensal/Trimestral/Semestral)
3. Paciente escolhe plano
4. Bot gera link de pagamento Mercado Pago
5. Paciente clica → abre página Mercado Pago
6. Paciente paga com PIX/Cartão
7. Mercado Pago aprova pagamento
8. Webhook notifica bot
9. Bot renova plano automaticamente
10. Bot envia confirmação ao paciente
```

---

## ⚙️ Valores dos Planos

Edite em `services/paymentService.js`:

```javascript
const PLANS = {
  monthly: {
    name: 'Plano Mensal',
    days: 30,
    price: 150.00, // ← ALTERE AQUI
    description: 'Acompanhamento nutricional por 30 dias',
  },
  // ...
};
```

---

## 🔍 Monitoramento

### Ver pagamentos recebidos:
```sql
SELECT * FROM payments WHERE status = 'approved' ORDER BY paid_at DESC;
```

### Ver pagamentos pendentes:
```sql
SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at DESC;
```

### Receita total:
```sql
SELECT SUM(amount) as total FROM payments WHERE status = 'approved';
```

---

## ❓ Problemas Comuns

### Webhook não funciona:
- ✅ Certifique-se que `WEBHOOK_DOMAIN` está correto
- ✅ Verifique se a URL é pública (não `localhost`)
- ✅ Teste webhook em: https://www.mercadopago.com.br/developers/panel/app

### Pagamento não renova plano:
- ✅ Verifique logs do servidor
- ✅ Confirme que webhook foi recebido
- ✅ Veja se há erros no Supabase

### Access Token inválido:
- ✅ Use Access Token de **produção**
- ✅ Verifique se não tem espaços extras
- ✅ Confirme que a aplicação está ativa

---

## 📊 Taxas do Mercado Pago

- **PIX**: 0.99%
- **Cartão de crédito**: 4.99% + R$ 0.40
- **Cartão de débito**: 3.99%
- **Boleto**: R$ 3.49 (fixo)

💡 **Dica**: Incentive pagamentos via PIX para menor taxa!

---

## 🚀 Deploy em Produção

1. Faça deploy no Render/Railway
2. Copie URL do app (ex: `https://seu-app.onrender.com`)
3. Configure no `.env`: `WEBHOOK_DOMAIN=https://seu-app.onrender.com`
4. Configure webhook no painel Mercado Pago
5. Teste com pagamento real

**Pronto!** Sistema de pagamentos funcionando! 💚
