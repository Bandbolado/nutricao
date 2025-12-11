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

-- 3. Tabela de histÃ³rico de peso
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

-- 7. Tabela de questionÃ¡rios alimentares
CREATE TABLE IF NOT EXISTS food_records (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_records_telegram_id ON food_records(telegram_id);

-- ComentÃ¡rios
COMMENT ON TABLE patients IS 'Cadastro de pacientes com plano e dados bÃ¡sicos';
COMMENT ON TABLE patient_files IS 'Arquivos enviados pelos pacientes';
COMMENT ON TABLE weight_history IS 'HistÃ³rico de peso dos pacientes';
COMMENT ON TABLE reminders IS 'Lembretes agendados para pacientes';
COMMENT ON TABLE chat_messages IS 'Mensagens do chat entre paciente e nutricionista';
COMMENT ON TABLE payments IS 'HistÃ³rico de pagamentos e assinaturas';
COMMENT ON TABLE food_records IS 'QuestionÃ¡rios alimentares preenchidos';
-- Migration: Novas funcionalidades (DiÃ¡rio Alimentar, Receitas, Referrals)
-- Data: 2025-11-20

-- Tabela para DiÃ¡rio Alimentar com Fotos
CREATE TABLE IF NOT EXISTS food_diary (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia')),
    photo_file_id TEXT NOT NULL,
    photo_file_unique_id TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_diary_telegram_id ON food_diary(telegram_id);
CREATE INDEX IF NOT EXISTS idx_food_diary_created_at ON food_diary(created_at DESC);

-- Tabela para Receitas SaudÃ¡veis
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('cafe_manha', 'almoco', 'jantar', 'lanche', 'sobremesa', 'suco', 'salada')),
    ingredients TEXT[] NOT NULL,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER,
    servings INTEGER DEFAULT 1,
    calories_per_serving INTEGER,
    protein_grams DECIMAL(5,1),
    carbs_grams DECIMAL(5,1),
    fat_grams DECIMAL(5,1),
    fiber_grams DECIMAL(5,1),
    image_url TEXT,
    tags TEXT[],
    difficulty VARCHAR(20) CHECK (difficulty IN ('facil', 'media', 'dificil')),
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_lactose_free BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

-- Tabela para Receitas Favoritas dos Pacientes
CREATE TABLE IF NOT EXISTS favorite_recipes (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(telegram_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_recipes_telegram_id ON favorite_recipes(telegram_id);

-- Tabela para Sistema de IndicaÃ§Ãµes (Referral)
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_telegram_id BIGINT NOT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_telegram_id BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
    discount_amount DECIMAL(10,2) DEFAULT 20.00,
    discount_applied BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_telegram_id ON referrals(referrer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_telegram_id ON referrals(referred_telegram_id);

-- Tabela para EstatÃ­sticas de Engajamento
CREATE TABLE IF NOT EXISTS patient_engagement (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    total_weight_logs INTEGER DEFAULT 0,
    total_food_diary_entries INTEGER DEFAULT 0,
    total_questionnaires INTEGER DEFAULT 0,
    total_files_uploaded INTEGER DEFAULT 0,
    login_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_weight_log_at TIMESTAMPTZ,
    last_diary_entry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_telegram_id ON patient_engagement(telegram_id);
CREATE INDEX IF NOT EXISTS idx_engagement_last_activity ON patient_engagement(last_activity_at DESC);

-- Função para atualizar engagement automaticamente
CREATE OR REPLACE FUNCTION update_patient_engagement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO patient_engagement (telegram_id, last_activity_at, updated_at)
  VALUES (NEW.telegram_id, NOW(), NOW())
  ON CONFLICT (telegram_id)
  DO UPDATE SET
    last_activity_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar engagement
DROP TRIGGER IF EXISTS trg_food_diary_engagement ON food_diary;
CREATE TRIGGER trg_food_diary_engagement
AFTER INSERT ON food_diary
FOR EACH ROW
EXECUTE FUNCTION update_patient_engagement();

-- Inserir receitas iniciais (10 receitas exemplo)
INSERT INTO recipes (name, category, ingredients, instructions, prep_time_minutes, servings, calories_per_serving, protein_grams, carbs_grams, fat_grams, fiber_grams, difficulty, is_vegetarian, tags) VALUES

('Omelete de Claras com Espinafre', 'cafe_manha', 
ARRAY['3 claras de ovo', '1 xÃ­cara de espinafre', '1 tomate picado', 'Sal e pimenta', '1 colher (chÃ¡) de azeite'],
'1. Bata as claras com sal e pimenta. 2. AqueÃ§a o azeite na frigideira. 3. Adicione o espinafre e refogue. 4. Despeje as claras e adicione o tomate. 5. Cozinhe atÃ© firmar e dobre ao meio.',
10, 1, 120, 18.5, 6.2, 4.1, 2.8, 'facil', true,
ARRAY['proteina', 'baixa_caloria', 'rapido']),

('Tapioca com Queijo e Tomate', 'cafe_manha',
ARRAY['3 colheres (sopa) de goma de tapioca', '2 fatias de queijo branco', '3 rodelas de tomate', 'OrÃ©gano'],
'1. Espalhe a tapioca em frigideira quente. 2. Quando comeÃ§ar a firmar, adicione o queijo e tomate. 3. Polvilhe orÃ©gano. 4. Dobre e sirva.',
5, 1, 180, 12.0, 28.0, 4.5, 1.2, 'facil', true,
ARRAY['sem_gluten', 'rapido', 'vegetariano']),

('Salada de GrÃ£o de Bico', 'almoco',
ARRAY['1 xÃ­cara de grÃ£o de bico cozido', '1 pepino picado', '1 tomate picado', '1/2 cebola roxa', 'Suco de 1 limÃ£o', '2 colheres (sopa) de azeite', 'HortelÃ£ fresca'],
'1. Misture o grÃ£o de bico com os vegetais. 2. Tempere com limÃ£o, azeite, sal e pimenta. 3. Adicione hortelÃ£ picada. 4. Deixe na geladeira por 30 minutos.',
40, 2, 220, 9.5, 32.0, 7.8, 8.5, 'facil', true,
ARRAY['vegetariano', 'sem_gluten', 'proteina_vegetal']),

('Frango Grelhado com Legumes', 'almoco',
ARRAY['1 filÃ© de frango (150g)', '1 abobrinha', '1 cenoura', '1 pimentÃ£o', '2 colheres (sopa) de azeite', 'Alho e ervas'],
'1. Tempere o frango com alho, sal e ervas. 2. Grelhe o frango atÃ© dourar. 3. Corte os legumes em tiras. 4. Refogue com azeite. 5. Sirva junto.',
25, 1, 280, 38.0, 15.0, 9.2, 4.5, 'facil', false,
ARRAY['proteina', 'baixa_caloria', 'sem_gluten']),

('SalmÃ£o ao Forno com BrÃ³colis', 'jantar',
ARRAY['1 filÃ© de salmÃ£o (180g)', '2 xÃ­caras de brÃ³colis', '1 limÃ£o', '2 colheres (sopa) de azeite', 'Alho e ervas'],
'1. Tempere o salmÃ£o com limÃ£o, alho e ervas. 2. Coloque em assadeira com brÃ³colis. 3. Regue com azeite. 4. Asse a 200Â°C por 20 minutos.',
30, 1, 350, 42.0, 12.0, 18.5, 4.2, 'media', false,
ARRAY['omega3', 'proteina', 'sem_gluten']),

('Wrap Integral de Atum', 'lanche',
ARRAY['1 wrap integral', '1 lata de atum em Ã¡gua', '2 folhas de alface', '1 tomate', '1 colher (sopa) de iogurte natural'],
'1. Escorra o atum e misture com iogurte. 2. Espalhe sobre o wrap. 3. Adicione alface e tomate. 4. Enrole e sirva.',
5, 1, 210, 22.0, 25.0, 4.8, 5.0, 'facil', false,
ARRAY['proteina', 'rapido', 'pratico']),

('Vitamina de Banana com Aveia', 'lanche',
ARRAY['1 banana', '1 copo de leite desnatado', '2 colheres (sopa) de aveia', '1 colher (chÃ¡) de mel', 'Canela'],
'1. Bata todos os ingredientes no liquidificador. 2. Adicione gelo se desejar. 3. Polvilhe canela.',
5, 1, 195, 8.5, 38.0, 2.8, 4.2, 'facil', true,
ARRAY['pre_treino', 'energia', 'vegetariano']),

('Mousse de Chocolate Fit', 'sobremesa',
ARRAY['1 abacate maduro', '2 colheres (sopa) de cacau em pÃ³', '2 colheres (sopa) de mel', '1 colher (chÃ¡) de essÃªncia de baunilha'],
'1. Bata o abacate no liquidificador atÃ© cremoso. 2. Adicione cacau, mel e baunilha. 3. Bata atÃ© homogÃªneo. 4. Leve Ã  geladeira por 2 horas.',
125, 4, 110, 2.1, 15.0, 6.5, 4.8, 'facil', true,
ARRAY['sem_acucar', 'vegetariano', 'chocolate']),

('Suco Verde Detox', 'suco',
ARRAY['1 folha de couve', '1/2 pepino', '1 maÃ§Ã£ verde', 'Suco de 1 limÃ£o', '1 copo de Ã¡gua de coco'],
'1. Lave bem todos os ingredientes. 2. Bata no liquidificador. 3. Coe se preferir. 4. Sirva gelado imediatamente.',
5, 1, 85, 2.2, 18.5, 0.5, 3.8, 'facil', true,
ARRAY['detox', 'baixa_caloria', 'vegano']),

('Bowl de Quinoa com Legumes', 'almoco',
ARRAY['1 xÃ­cara de quinoa cozida', '1/2 xÃ­cara de grÃ£o de bico', '1 cenoura ralada', '1/2 beterraba ralada', '1 punhado de rÃºcula', '2 colheres (sopa) de azeite', 'LimÃ£o'],
'1. Cozinhe a quinoa conforme embalagem. 2. Monte o bowl com quinoa como base. 3. Adicione grÃ£o de bico e legumes. 4. Tempere com azeite e limÃ£o. 5. Finalize com rÃºcula.',
35, 1, 320, 14.5, 48.0, 10.2, 9.5, 'facil', true,
ARRAY['vegetariano', 'proteina_vegetal', 'completo', 'sem_gluten']);

-- ComentÃ¡rios Ãºteis
COMMENT ON TABLE food_diary IS 'Armazena fotos das refeiÃ§Ãµes dos pacientes com timestamp e observaÃ§Ãµes';
COMMENT ON TABLE recipes IS 'Banco de receitas saudÃ¡veis com informaÃ§Ãµes nutricionais completas';
COMMENT ON TABLE favorite_recipes IS 'Receitas favoritas de cada paciente';
COMMENT ON TABLE referrals IS 'Sistema de indicaÃ§Ãµes com cÃ³digo Ãºnico e rastreamento de conversÃµes';
COMMENT ON TABLE patient_engagement IS 'EstatÃ­sticas de engajamento e uso do bot por paciente';
