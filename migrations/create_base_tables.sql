-- ========================================
-- SCHEMA BASE DO BOT - EXECUTAR PRIMEIRO
-- ========================================

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
  plan_status TEXT DEFAULT 'inactive',
  plan_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_files_telegram_id ON patient_files(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_uploaded ON patient_files(uploaded_at);

-- 3. Tabela de histórico de peso
CREATE TABLE IF NOT EXISTS weight_history (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
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
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_telegram_id ON reminders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(sent, scheduled_for);

-- 5. Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient','nutritionist')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text','photo','document','system')),
  message_text TEXT,
  file_id TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_telegram_id ON chat_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_patient_date ON chat_messages(telegram_id, created_at DESC);

-- 6. Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  payment_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  plan_duration_days INTEGER NOT NULL,
  payment_method TEXT,
  payment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 7. Tabela de questionários alimentares
CREATE TABLE IF NOT EXISTS food_records (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_records_telegram_id ON food_records(telegram_id);
CREATE INDEX IF NOT EXISTS idx_food_records_submitted ON food_records(submitted_at DESC);

-- Comentários
COMMENT ON TABLE patients IS 'Cadastro de pacientes com plano e dados básicos';
COMMENT ON TABLE patient_files IS 'Arquivos enviados pelos pacientes';
COMMENT ON TABLE weight_history IS 'Histórico de peso dos pacientes';
COMMENT ON TABLE reminders IS 'Lembretes agendados para pacientes';
COMMENT ON TABLE chat_messages IS 'Mensagens do chat entre paciente e nutricionista';
COMMENT ON TABLE payments IS 'Histórico de pagamentos e assinaturas';
COMMENT ON TABLE food_records IS 'Questionários alimentares preenchidos';
