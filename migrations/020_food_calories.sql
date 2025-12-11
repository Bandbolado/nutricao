-- Registro de calorias consumidas por paciente
CREATE TABLE IF NOT EXISTS food_calories (
  id bigint generated always as identity primary key,
  telegram_id bigint not null,
  entry_date date not null,
  entry_text text not null,
  items jsonb,
  total_kcal numeric not null,
  created_at timestamptz not null default now()
);

-- Índice para somas diárias por paciente
CREATE INDEX IF NOT EXISTS idx_food_calories_telegram_date ON food_calories(telegram_id, entry_date);
