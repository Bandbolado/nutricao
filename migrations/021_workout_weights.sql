-- Tabela para armazenar peso base por grupamento e tipo de treino
create table if not exists workout_weights (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  group_key text not null,
  training_type_key text not null,
  weight_kg numeric not null,
  updated_at timestamptz default now(),
  unique (telegram_id, group_key, training_type_key)
);
