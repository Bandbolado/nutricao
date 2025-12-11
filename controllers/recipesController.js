const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');
const { getPatientByTelegramId } = require('../services/patientService');
const OpenAI = require('openai');
const { getDailyStats } = require('./calorieController');

const openaiClient = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Estado para fluxo de "o que tenho em casa"
const pantryState = new Map();

/**
 * Mostra o menu de receitas
 */
async function showRecipesMenu(ctx) {
    const telegramId = ctx.from.id;

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.reply('❌ Você precisa estar cadastrado para acessar as receitas.');
        }

        const message = `🍽️ *Receita Inteligente*\n\n` +
            `Gere uma receita automática com base nas kcal que faltam para sua meta de hoje.`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🤖 Gerar receita com minhas kcal restantes', 'recipes_generate_remaining')],
            [Markup.button.callback('🍳 Gerar com o que tenho em casa', 'recipes_generate_pantry')],
            [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
        ]);

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao mostrar menu de receitas:', error);
        ctx.reply('❌ Erro ao carregar receitas. Tente novamente.');
    }
}

async function generateRecipeWithRemaining(ctx) {
    try {
        if (!openaiClient) {
            await ctx.reply('❌ OPENAI_API_KEY não configurada.');
            return;
        }

        const stats = await getDailyStats(ctx.from.id);
        if (!stats) {
            await ctx.reply('❌ Dados insuficientes para calcular sua meta. Atualize peso, altura, idade, sexo e nível de atividade.');
            return;
        }

        const remaining = Math.max(0, Math.round(stats.remaining));
        if (remaining < 50) {
            await ctx.replyWithMarkdown('✅ Você já atingiu sua meta de hoje ou está muito próximo.');
            return;
        }

        await ctx.reply('⏳ Gerando receita personalizada...');

        const prompt = [
            {
                role: 'system',
                content: 'Você é um nutricionista. Gere uma receita única em português, organizada e didática. Formate assim: TÍTULO em maiúsculas, linha "━━━━━━━━━━━━━━━━", seção INGREDIENTES em lista, seção MODO DE PREPARO numerada, seção INFO NUTRICIONAL ESTIMADA (kcal aproximada por porção) e seção DICAS curtas. Use linguagem clara, sem floreios.'
            },
            {
                role: 'user',
                content: `Quero uma receita com cerca de ${remaining} kcal para ajudar a fechar minha meta diária.`
            }
        ];

        const completion = await openaiClient.chat.completions.create({
            model: MODEL,
            messages: prompt,
            temperature: 0.4,
            max_tokens: 400
        });

        const text = completion.choices?.[0]?.message?.content || '';
        await ctx.replyWithMarkdown(
            `🍽️ *Receita para ~${remaining} kcal restantes*\n\n${text}`
        );
    } catch (error) {
        console.error('Erro ao gerar receita dinâmica:', error);
        await ctx.reply('❌ Erro ao gerar receita. Tente novamente.');
    }
}

// Inicia fluxo para o paciente enviar o que tem em casa
async function startPantryFlow(ctx) {
    pantryState.set(ctx.from.id, { startedAt: Date.now() });
    await ctx.replyWithMarkdown(
        '🍳 *Gerar receita com o que você tem*\n\n' +
        'Envie uma lista dos ingredientes disponíveis (ex: arroz, frango, cenoura, ovos).\n' +
        'Vou criar uma receita prática usando esses itens. Se quiser, informe também utensílios ou restrições.'
    );
}

// Trata a mensagem de ingredientes do paciente
async function handlePantryInput(ctx) {
    const state = pantryState.get(ctx.from.id);
    if (!state) return false;

    // Expira em 10 minutos
    if (Date.now() - state.startedAt > 10 * 60 * 1000) {
        pantryState.delete(ctx.from.id);
        await ctx.reply('⏱️ Sessão expirada. Toque em Receitas e escolha novamente.');
        return true;
    }

    if (!openaiClient) {
        await ctx.reply('❌ OPENAI_API_KEY não configurada.');
        pantryState.delete(ctx.from.id);
        return true;
    }

    const stats = await getDailyStats(ctx.from.id);
    const remaining = stats ? Math.max(0, Math.round(stats.remaining)) : null;

    await ctx.reply('⏳ Gerando receita com seus ingredientes...');

    const prompt = [
        {
            role: 'system',
            content:
                'Você é um nutricionista. Gere uma receita única em português usando apenas os ingredientes fornecidos (se possível). Se faltar algo, sugira substituições simples. Formato: TÍTULO, linha "━━━━━━━━━━━━━━━━", INGREDIENTES em lista, MODO DE PREPARO numerado, INFO NUTRICIONAL ESTIMADA (kcal aproximada por porção), DICAS com 2 bullets. Seja conciso, direto e organizado.'
        },
        {
            role: 'user',
            content:
                `Ingredientes disponíveis: ${ctx.message.text}.
` + (remaining ? `Tente aproximar ~${remaining} kcal no total se der.` : 'Use calorias moderadas.')
        }
    ];

    try {
        const completion = await openaiClient.chat.completions.create({
            model: MODEL,
            messages: prompt,
            temperature: 0.35,
            max_tokens: 500
        });

        const text = completion.choices?.[0]?.message?.content || '';
        await ctx.replyWithMarkdown(text);
    } catch (error) {
        console.error('Erro ao gerar receita com ingredientes:', error);
        await ctx.reply('❌ Erro ao gerar receita. Tente novamente.');
    } finally {
        pantryState.delete(ctx.from.id);
    }

    return true;
}

/**
 * Lista receitas por categoria
 */
async function showRecipesByCategory(ctx, category) {
    try {
        const { data: recipes, error } = await supabase
            .from('recipes')
            .select('*')
            .eq('category', category)
            .order('name');

        if (error) throw error;

        if (!recipes || recipes.length === 0) {
            return ctx.editMessageText(
                `🍽️ Nenhuma receita encontrada nesta categoria ainda.\n\n` +
                `Em breve adicionaremos mais receitas! 🎉`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Voltar', 'recipes_menu')]
                ])
            );
        }

        const categoryNames = {
            cafe_manha: '☕ Café da Manhã',
            almoco: '🍽️ Almoço',
            jantar: '🌙 Jantar',
            lanche: '🍎 Lanches',
            sobremesa: '🍰 Sobremesas',
            suco: '🥤 Sucos',
            salada: '🥗 Saladas'
        };

        let message = `${categoryNames[category]}\n\n`;
        message += `📚 ${recipes.length} receita(s) disponível(is):\n\n`;

        const buttons = recipes.map(recipe => [
            Markup.button.callback(
                `${recipe.name} (${recipe.calories_per_serving || 0} kcal)`,
                `recipe_view_${recipe.id}`
            )
        ]);

        buttons.push([Markup.button.callback('🔙 Voltar', 'recipes_menu')]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });

    } catch (error) {
        console.error('Erro ao buscar receitas:', error);
        ctx.reply('❌ Erro ao buscar receitas. Tente novamente.');
    }
}

/**
 * Mostra detalhes de uma receita
 */
async function showRecipeDetails(ctx, recipeId) {
    const telegramId = ctx.from.id;

    try {
        const { data: recipe, error } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', recipeId)
            .single();

        if (error) throw error;

        if (!recipe) {
            return ctx.editMessageText('❌ Receita não encontrada.');
        }

        // Verificar se é favorita
        const patient = await getPatientByTelegramId(telegramId);
        let isFavorite = false;

        if (patient) {
            const { data: fav } = await supabase
                .from('favorite_recipes')
                .select('id')
                .eq('patient_id', patient.id)
                .eq('recipe_id', recipeId)
                .single();

            isFavorite = !!fav;
        }

        // Montar mensagem
        let message = `🍽️ *${recipe.name}*\n\n`;

        // Badges
        const badges = [];
        if (recipe.is_vegetarian) badges.push('🌱 Vegetariano');
        if (recipe.is_vegan) badges.push('🌾 Vegano');
        if (recipe.is_gluten_free) badges.push('🚫 Sem Glúten');
        if (recipe.is_lactose_free) badges.push('🥛 Sem Lactose');
        if (badges.length > 0) message += `${badges.join(' | ')}\n\n`;

        // Informações
        message += `⏱️ *Tempo:* ${recipe.prep_time_minutes || 0} minutos\n`;
        message += `👥 *Porções:* ${recipe.servings || 1}\n`;
        message += `📊 *Dificuldade:* ${recipe.difficulty === 'facil' ? 'Fácil' : recipe.difficulty === 'media' ? 'Média' : 'Difícil'}\n\n`;

        // Informações nutricionais
        message += `📊 *Informações Nutricionais* (por porção):\n`;
        message += `• Calorias: ${recipe.calories_per_serving || 0} kcal\n`;
        if (recipe.protein_grams) message += `• Proteínas: ${recipe.protein_grams}g\n`;
        if (recipe.carbs_grams) message += `• Carboidratos: ${recipe.carbs_grams}g\n`;
        if (recipe.fat_grams) message += `• Gorduras: ${recipe.fat_grams}g\n`;
        if (recipe.fiber_grams) message += `• Fibras: ${recipe.fiber_grams}g\n`;

        // Ingredientes
        message += `\n🛒 *Ingredientes:*\n`;
        recipe.ingredients.forEach(ing => {
            message += `• ${ing}\n`;
        });

        // Modo de preparo
        message += `\n👨‍🍳 *Modo de Preparo:*\n${recipe.instructions}\n`;

        // Tags (escapar # para evitar erro de parsing do Markdown)
        if (recipe.tags && recipe.tags.length > 0) {
            message += `\n🏷️ ${recipe.tags.map(t => `\\#${t}`).join(' ')}`;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    isFavorite ? '⭐ Remover dos Favoritos' : '⭐ Adicionar aos Favoritos',
                    `recipe_fav_toggle_${recipeId}`
                )
            ],
            [Markup.button.callback('📋 Gerar Lista de Compras', `recipe_shopping_${recipeId}`)],
            [Markup.button.callback('🔙 Voltar', `recipes_cat_${recipe.category}`)]
        ]);

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao mostrar receita:', error);
        ctx.reply('❌ Erro ao carregar receita. Tente novamente.');
    }
}

/**
 * Adiciona/remove receita dos favoritos
 */
async function toggleFavorite(ctx, recipeId) {
    const telegramId = ctx.from.id;

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.answerCbQuery('❌ Você precisa estar cadastrado.', { show_alert: true });
        }

        // Verificar se já é favorita
        const { data: existing } = await supabase
            .from('favorite_recipes')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('recipe_id', recipeId)
            .single();

        if (existing) {
            // Remover
            await supabase
                .from('favorite_recipes')
                .delete()
                .eq('id', existing.id);

            await ctx.answerCbQuery('❌ Removida dos favoritos!');
        } else {
            // Adicionar
            await supabase
                .from('favorite_recipes')
                .insert({
                    patient_id: patient.id,
                    recipe_id: recipeId
                });

            await ctx.answerCbQuery('⭐ Adicionada aos favoritos!');
        }

        // Recarregar a receita
        await showRecipeDetails(ctx, recipeId);

    } catch (error) {
        console.error('Erro ao alternar favorito:', error);
        ctx.answerCbQuery('❌ Erro ao processar. Tente novamente.');
    }
}

/**
 * Mostra receitas favoritas
 */
async function showFavoriteRecipes(ctx) {
    const telegramId = ctx.from.id;

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.editMessageText('❌ Você precisa estar cadastrado.');
        }

        const { data: favorites, error } = await supabase
            .from('favorite_recipes')
            .select('recipe_id, recipes(*)')
            .eq('patient_id', patient.id);

        if (error) throw error;

        if (!favorites || favorites.length === 0) {
            return ctx.editMessageText(
                `⭐ *Minhas Receitas Favoritas*\n\n` +
                `Você ainda não tem receitas favoritas.\n\n` +
                `Explore as categorias e adicione suas preferidas!`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 Voltar', 'recipes_menu')]
                    ])
                }
            );
        }

        let message = `⭐ *Minhas Receitas Favoritas*\n\n`;
        message += `📚 ${favorites.length} receita(s) favorita(s):\n\n`;

        const buttons = favorites.map(fav => [
            Markup.button.callback(
                `${fav.recipes.name} (${fav.recipes.calories_per_serving || 0} kcal)`,
                `recipe_view_${fav.recipe_id}`
            )
        ]);

        buttons.push([Markup.button.callback('🔙 Voltar', 'recipes_menu')]);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });

    } catch (error) {
        console.error('Erro ao buscar favoritos:', error);
        ctx.reply('❌ Erro ao carregar favoritos. Tente novamente.');
    }
}

/**
 * Gera lista de compras
 */
async function generateShoppingList(ctx, recipeId) {
    try {
        const { data: recipe } = await supabase
            .from('recipes')
            .select('name, ingredients, servings')
            .eq('id', recipeId)
            .single();

        if (!recipe) {
            return ctx.answerCbQuery('❌ Receita não encontrada.');
        }

        let message = `📋 *Lista de Compras*\n`;
        message += `*${recipe.name}*\n`;
        message += `(${recipe.servings} porção/porções)\n\n`;

        recipe.ingredients.forEach((ing, index) => {
            message += `☐ ${ing}\n`;
        });

        message += `\n💡 Marque os itens conforme comprar!`;

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Voltar à Receita', `recipe_view_${recipeId}`)]
            ])
        });

        ctx.answerCbQuery('✅ Lista de compras gerada!');

    } catch (error) {
        console.error('Erro ao gerar lista de compras:', error);
        ctx.answerCbQuery('❌ Erro ao gerar lista.');
    }
}

module.exports = {
    showRecipesMenu,
    showRecipesByCategory,
    showRecipeDetails,
    toggleFavorite,
    showFavoriteRecipes,
    generateShoppingList,
    generateRecipeWithRemaining,
    startPantryFlow,
    handlePantryInput,
};
