-- Tabela para armazenar pagamentos dos pacientes
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

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_preference_id ON payments(preference_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- Comentários explicativos
COMMENT ON TABLE payments IS 'Armazena histórico de pagamentos e renovações de planos';
COMMENT ON COLUMN payments.status IS 'Status: pending, approved, rejected, cancelled, refunded';
COMMENT ON COLUMN payments.payment_id IS 'ID do pagamento retornado pelo Mercado Pago';
COMMENT ON COLUMN payments.preference_id IS 'ID da preferência de pagamento do Mercado Pago';
COMMENT ON COLUMN payments.payment_link IS 'Link de pagamento gerado para o cliente';
