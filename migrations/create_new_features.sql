-- Migration: Novas funcionalidades (Diário Alimentar, Receitas, Referrals)
-- Data: 2025-11-20

-- Tabela para Diário Alimentar com Fotos
CREATE TABLE IF NOT EXISTS food_diary (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia')),
    photo_file_id TEXT NOT NULL,
    photo_file_unique_id TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_diary_telegram_id ON food_diary(telegram_id);
CREATE INDEX idx_food_diary_created_at ON food_diary(created_at DESC);

-- Tabela para Receitas Saudáveis
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

CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Tabela para Receitas Favoritas dos Pacientes
CREATE TABLE IF NOT EXISTS favorite_recipes (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(telegram_id, recipe_id)
);

CREATE INDEX idx_favorite_recipes_telegram_id ON favorite_recipes(telegram_id);

-- Tabela para Sistema de Indicações (Referral)
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

CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer_telegram_id ON referrals(referrer_telegram_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_referred_telegram_id ON referrals(referred_telegram_id);

-- Tabela para Estatísticas de Engajamento
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

CREATE INDEX idx_engagement_telegram_id ON patient_engagement(telegram_id);
CREATE INDEX idx_engagement_last_activity ON patient_engagement(last_activity_at DESC);

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
CREATE TRIGGER trg_food_diary_engagement
AFTER INSERT ON food_diary
FOR EACH ROW
EXECUTE FUNCTION update_patient_engagement();

-- Inserir receitas iniciais (10 receitas exemplo)
INSERT INTO recipes (name, category, ingredients, instructions, prep_time_minutes, servings, calories_per_serving, protein_grams, carbs_grams, fat_grams, fiber_grams, difficulty, is_vegetarian, tags) VALUES

('Omelete de Claras com Espinafre', 'cafe_manha', 
ARRAY['3 claras de ovo', '1 xícara de espinafre', '1 tomate picado', 'Sal e pimenta', '1 colher (chá) de azeite'],
'1. Bata as claras com sal e pimenta. 2. Aqueça o azeite na frigideira. 3. Adicione o espinafre e refogue. 4. Despeje as claras e adicione o tomate. 5. Cozinhe até firmar e dobre ao meio.',
10, 1, 120, 18.5, 6.2, 4.1, 2.8, 'facil', true,
ARRAY['proteina', 'baixa_caloria', 'rapido']),

('Tapioca com Queijo e Tomate', 'cafe_manha',
ARRAY['3 colheres (sopa) de goma de tapioca', '2 fatias de queijo branco', '3 rodelas de tomate', 'Orégano'],
'1. Espalhe a tapioca em frigideira quente. 2. Quando começar a firmar, adicione o queijo e tomate. 3. Polvilhe orégano. 4. Dobre e sirva.',
5, 1, 180, 12.0, 28.0, 4.5, 1.2, 'facil', true,
ARRAY['sem_gluten', 'rapido', 'vegetariano']),

('Salada de Grão de Bico', 'almoco',
ARRAY['1 xícara de grão de bico cozido', '1 pepino picado', '1 tomate picado', '1/2 cebola roxa', 'Suco de 1 limão', '2 colheres (sopa) de azeite', 'Hortelã fresca'],
'1. Misture o grão de bico com os vegetais. 2. Tempere com limão, azeite, sal e pimenta. 3. Adicione hortelã picada. 4. Deixe na geladeira por 30 minutos.',
40, 2, 220, 9.5, 32.0, 7.8, 8.5, 'facil', true,
ARRAY['vegetariano', 'sem_gluten', 'proteina_vegetal']),

('Frango Grelhado com Legumes', 'almoco',
ARRAY['1 filé de frango (150g)', '1 abobrinha', '1 cenoura', '1 pimentão', '2 colheres (sopa) de azeite', 'Alho e ervas'],
'1. Tempere o frango com alho, sal e ervas. 2. Grelhe o frango até dourar. 3. Corte os legumes em tiras. 4. Refogue com azeite. 5. Sirva junto.',
25, 1, 280, 38.0, 15.0, 9.2, 4.5, 'facil', false,
ARRAY['proteina', 'baixa_caloria', 'sem_gluten']),

('Salmão ao Forno com Brócolis', 'jantar',
ARRAY['1 filé de salmão (180g)', '2 xícaras de brócolis', '1 limão', '2 colheres (sopa) de azeite', 'Alho e ervas'],
'1. Tempere o salmão com limão, alho e ervas. 2. Coloque em assadeira com brócolis. 3. Regue com azeite. 4. Asse a 200°C por 20 minutos.',
30, 1, 350, 42.0, 12.0, 18.5, 4.2, 'media', false,
ARRAY['omega3', 'proteina', 'sem_gluten']),

('Wrap Integral de Atum', 'lanche',
ARRAY['1 wrap integral', '1 lata de atum em água', '2 folhas de alface', '1 tomate', '1 colher (sopa) de iogurte natural'],
'1. Escorra o atum e misture com iogurte. 2. Espalhe sobre o wrap. 3. Adicione alface e tomate. 4. Enrole e sirva.',
5, 1, 210, 22.0, 25.0, 4.8, 5.0, 'facil', false,
ARRAY['proteina', 'rapido', 'pratico']),

('Vitamina de Banana com Aveia', 'lanche',
ARRAY['1 banana', '1 copo de leite desnatado', '2 colheres (sopa) de aveia', '1 colher (chá) de mel', 'Canela'],
'1. Bata todos os ingredientes no liquidificador. 2. Adicione gelo se desejar. 3. Polvilhe canela.',
5, 1, 195, 8.5, 38.0, 2.8, 4.2, 'facil', true,
ARRAY['pre_treino', 'energia', 'vegetariano']),

('Mousse de Chocolate Fit', 'sobremesa',
ARRAY['1 abacate maduro', '2 colheres (sopa) de cacau em pó', '2 colheres (sopa) de mel', '1 colher (chá) de essência de baunilha'],
'1. Bata o abacate no liquidificador até cremoso. 2. Adicione cacau, mel e baunilha. 3. Bata até homogêneo. 4. Leve à geladeira por 2 horas.',
125, 4, 110, 2.1, 15.0, 6.5, 4.8, 'facil', true,
ARRAY['sem_acucar', 'vegetariano', 'chocolate']),

('Suco Verde Detox', 'suco',
ARRAY['1 folha de couve', '1/2 pepino', '1 maçã verde', 'Suco de 1 limão', '1 copo de água de coco'],
'1. Lave bem todos os ingredientes. 2. Bata no liquidificador. 3. Coe se preferir. 4. Sirva gelado imediatamente.',
5, 1, 85, 2.2, 18.5, 0.5, 3.8, 'facil', true,
ARRAY['detox', 'baixa_caloria', 'vegano']),

('Bowl de Quinoa com Legumes', 'almoco',
ARRAY['1 xícara de quinoa cozida', '1/2 xícara de grão de bico', '1 cenoura ralada', '1/2 beterraba ralada', '1 punhado de rúcula', '2 colheres (sopa) de azeite', 'Limão'],
'1. Cozinhe a quinoa conforme embalagem. 2. Monte o bowl com quinoa como base. 3. Adicione grão de bico e legumes. 4. Tempere com azeite e limão. 5. Finalize com rúcula.',
35, 1, 320, 14.5, 48.0, 10.2, 9.5, 'facil', true,
ARRAY['vegetariano', 'proteina_vegetal', 'completo', 'sem_gluten']);

-- Comentários úteis
COMMENT ON TABLE food_diary IS 'Armazena fotos das refeições dos pacientes com timestamp e observações';
COMMENT ON TABLE recipes IS 'Banco de receitas saudáveis com informações nutricionais completas';
COMMENT ON TABLE favorite_recipes IS 'Receitas favoritas de cada paciente';
COMMENT ON TABLE referrals IS 'Sistema de indicações com código único e rastreamento de conversões';
COMMENT ON TABLE patient_engagement IS 'Estatísticas de engajamento e uso do bot por paciente';
