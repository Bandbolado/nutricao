-- Tabela para armazenar lembretes programados
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

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_reminders_telegram_id ON reminders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(sent, scheduled_for);

-- Comentários explicativos
COMMENT ON TABLE reminders IS 'Armazena lembretes programados para pacientes';
COMMENT ON COLUMN reminders.type IS 'Tipo do lembrete: plan_renewal, weight_check, appointment, custom';
COMMENT ON COLUMN reminders.scheduled_for IS 'Data e hora agendada para envio do lembrete';
COMMENT ON COLUMN reminders.sent IS 'Indica se o lembrete já foi enviado';
