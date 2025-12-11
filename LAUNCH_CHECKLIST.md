# 🚀 Checklist de Lançamento do Bot

## ✅ Antes do Lançamento

### 1️⃣ Configuração do Supabase

#### Criar Tabelas (Execute nesta ordem):

```sql
-- 1. Tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  height INTEGER NOT NULL,
  gender CHAR(1) NOT NULL,
  objective TEXT NOT NULL,
  restrictions TEXT,
  plan_end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_telegram_id ON patients(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patients_plan_end_date ON patients(plan_end_date);

-- 2. Tabela de arquivos
CREATE TABLE IF NOT EXISTS patient_files (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name TEXT,
  original_name TEXT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_files_telegram_id ON patient_files(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_uploaded ON patient_files(uploaded_at);

-- 3. Tabela de histórico de peso
CREATE TABLE IF NOT EXISTS weight_history (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_weight_history_telegram_id ON weight_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_weight_history_recorded ON weight_history(recorded_at);

-- 4. Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_telegram_id ON reminders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(sent, scheduled_for);
```

#### Criar Bucket de Storage:

1. Acesse **Supabase Dashboard** → **Storage**
2. Clique em **"New Bucket"**
3. Nome: `patient-files`
4. **Public bucket**: ✅ Marque como público
5. Clique em **"Create bucket"**

### 2️⃣ Configuração do .env

Certifique-se que todas as variáveis estão configuradas:

```env
# Bot do Telegram
BOT_TOKEN=seu_bot_token_aqui

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Admin
ADMIN_TELEGRAM_ID=973133558

# Tabelas (opcional, já tem valores padrão)
SUPABASE_PATIENTS_TABLE=patients
SUPABASE_FILES_TABLE=patient_files
SUPABASE_STORAGE_BUCKET=patient-files

# Webhook (para produção)
# WEBHOOK_DOMAIN=https://seu-dominio.com
# WEBHOOK_PATH=/telegram/webhook

# Porta do servidor
PORT=3000
```

### 3️⃣ Resetar Dados (se necessário)

⚠️ **CUIDADO**: Isso apaga todos os dados!

Execute no Supabase SQL Editor:

```sql
-- Limpa todos os dados
DELETE FROM reminders;
DELETE FROM patient_files;
DELETE FROM weight_history;
DELETE FROM patients;

-- Reseta IDs
ALTER SEQUENCE reminders_id_seq RESTART WITH 1;
ALTER SEQUENCE patient_files_id_seq RESTART WITH 1;
ALTER SEQUENCE weight_history_id_seq RESTART WITH 1;
ALTER SEQUENCE patients_id_seq RESTART WITH 1;
```

### 4️⃣ Testar Localmente

```bash
cd project
npm install
npm run dev
```

**Teste todas as funcionalidades:**
- ✅ Cadastro de paciente
- ✅ Calculadora nutricional
- ✅ Registro de peso
- ✅ Upload de arquivos (foto e documento)
- ✅ Lembretes
- ✅ Chat com nutricionista
- ✅ Painel admin completo
- ✅ Mensagens em massa
- ✅ Visualização individual de pacientes

## 🌐 Deploy em Produção

### Opção 1: Render

1. Crie conta no [Render](https://render.com)
2. Novo Web Service
3. Conecte seu repositório GitHub
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: Copie todas do `.env`
   - Adicione: `WEBHOOK_DOMAIN=https://seu-app.onrender.com`
5. Deploy!

### Opção 2: Railway

1. Crie conta no [Railway](https://railway.app)
2. New Project → Deploy from GitHub
3. Adicione variáveis de ambiente
4. Configure: `WEBHOOK_DOMAIN=https://seu-app.railway.app`
5. Deploy automático!

### Opção 3: VPS (DigitalOcean, AWS, etc)

```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar projeto
git clone seu-repositorio
cd project

# Instalar dependências
npm install

# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start server.js --name "nutribot"
pm2 startup
pm2 save
```

## 🔧 Manutenção

### Ver logs do bot:
```bash
pm2 logs nutribot
```

### Reiniciar bot:
```bash
pm2 restart nutribot
```

### Atualizar código:
```bash
git pull
npm install
pm2 restart nutribot
```

## 📊 Monitoramento

### Verificar saúde do bot:
```
https://seu-dominio.com/
```

Resposta esperada:
```json
{"status":"ok","message":"Telegram bot operando."}
```

### Comandos úteis SQL:

```sql
-- Ver total de pacientes
SELECT COUNT(*) FROM patients;

-- Ver pacientes ativos
SELECT COUNT(*) FROM patients WHERE plan_end_date > NOW();

-- Ver lembretes pendentes
SELECT COUNT(*) FROM reminders WHERE sent = false;

-- Ver total de arquivos
SELECT COUNT(*) FROM patient_files;
```

## 🎯 Funcionalidades Implementadas

- ✅ Sistema de cadastro completo (6 etapas)
- ✅ Calculadora nutricional (IMC, TMB, calorias, macros)
- ✅ Histórico de peso com estatísticas
- ✅ Upload e histórico de arquivos
- ✅ Sistema de lembretes automáticos
- ✅ Chat paciente ↔ nutricionista
- ✅ Painel administrativo completo
- ✅ Mensagens em massa (todos/ativos/vencendo)
- ✅ Análise individual de pacientes
- ✅ Navegação paginada de pacientes
- ✅ Notificações para admin

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs: `pm2 logs nutribot`
2. Verificar variáveis de ambiente
3. Testar conexão com Supabase
4. Verificar se bucket existe e é público
5. Verificar se tabelas foram criadas

---

**Bot pronto para lançamento!** 🚀
