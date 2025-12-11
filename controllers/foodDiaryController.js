const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');
const { getPatientByTelegramId } = require('../services/patientService');

// Estado para rastrear o processo de envio de foto
const diaryState = new Map();

// Tipos de refeição
const MEAL_TYPES = {
    cafe: '☕ Café da Manhã',
    lanche_manha: '🥐 Lanche da Manhã',
    almoco: '🍽️ Almoço',
    lanche_tarde: '🍎 Lanche da Tarde',
    jantar: '🌙 Jantar',
    ceia: '🌜 Ceia'
};

/**
 * Mostra o menu principal do diário alimentar
 */
async function showFoodDiaryMenu(ctx) {
    const telegramId = ctx.from.id;
    
    try {
        const patient = await getPatientByTelegramId(telegramId);
        
        if (!patient) {
            return ctx.reply('❌ Você precisa estar cadastrado para usar esta funcionalidade.');
        }

        // Buscar estatísticas
        const { data: stats } = await supabase
            .from('food_diary')
            .select('id', { count: 'exact' })
            .eq('telegram_id', telegramId);

        const totalEntries = stats?.length || 0;

        const message = `📸 *Diário Alimentar*\n\n` +
            `📊 Total de registros: ${totalEntries}\n\n` +
            `Use o diário para registrar suas refeições com fotos. ` +
            `Isso ajuda a nutricionista a acompanhar sua alimentação de forma visual!\n\n` +
            `Escolha uma opção:`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📷 Registrar Refeição', 'diary_add')],
            [Markup.button.callback('📅 Ver Histórico (Hoje)', 'diary_today')],
            [Markup.button.callback('📊 Histórico Completo', 'diary_history')],
            [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
        ]);

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao mostrar menu do diário:', error);
        ctx.reply('❌ Erro ao carregar o diário alimentar. Tente novamente.');
    }
}

/**
 * Inicia o processo de registro de refeição
 */
async function startDiaryEntry(ctx) {
    const telegramId = ctx.from.id;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('☕ Café da Manhã', 'diary_type_cafe'),
            Markup.button.callback('🥐 Lanche Manhã', 'diary_type_lanche_manha')
        ],
        [
            Markup.button.callback('🍽️ Almoço', 'diary_type_almoco'),
            Markup.button.callback('🍎 Lanche Tarde', 'diary_type_lanche_tarde')
        ],
        [
            Markup.button.callback('🌙 Jantar', 'diary_type_jantar'),
            Markup.button.callback('🌜 Ceia', 'diary_type_ceia')
        ],
        [Markup.button.callback('🔙 Cancelar', 'diary_menu')]
    ]);

    await ctx.editMessageText(
        '📸 *Registrar Refeição*\n\n' +
        'Selecione o tipo de refeição:',
        { parse_mode: 'Markdown', ...keyboard }
    );
}

/**
 * Define o tipo de refeição e solicita a foto
 */
async function setMealType(ctx, mealType) {
    const telegramId = ctx.from.id;

    // Salvar estado
    diaryState.set(telegramId, {
        mealType,
        step: 'awaiting_photo'
    });

    await ctx.editMessageText(
        `📸 *${MEAL_TYPES[mealType]}*\n\n` +
        `Envie uma foto da sua refeição.\n\n` +
        `💡 *Dica:* Tire a foto de cima para mostrar todos os alimentos no prato!`,
        { parse_mode: 'Markdown' }
    );

    // Timeout de 5 minutos
    setTimeout(() => {
        if (diaryState.has(telegramId) && diaryState.get(telegramId).step === 'awaiting_photo') {
            diaryState.delete(telegramId);
            ctx.reply('⏱️ Tempo expirado. Use /menu para tentar novamente.');
        }
    }, 5 * 60 * 1000);
}

/**
 * Processa a foto enviada
 */
async function handleDiaryPhoto(ctx) {
    const telegramId = ctx.from.id;
    const state = diaryState.get(telegramId);

    if (!state || state.step !== 'awaiting_photo') {
        return; // Ignora fotos fora do contexto
    }

    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Maior resolução
        const fileId = photo.file_id;
        const fileUniqueId = photo.file_unique_id;

        // Atualizar estado
        diaryState.set(telegramId, {
            ...state,
            fileId,
            fileUniqueId,
            step: 'awaiting_observation'
        });

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✅ Sem Observação', 'diary_no_obs')],
            [Markup.button.callback('🔙 Cancelar', 'diary_menu')]
        ]);

        await ctx.reply(
            `✅ Foto recebida!\n\n` +
            `Quer adicionar alguma observação? (Ex: "Comi tudo", "Fiquei com fome depois", "Muito tempero")\n\n` +
            `Envie o texto ou clique em "Sem Observação".`,
            keyboard
        );

    } catch (error) {
        console.error('Erro ao processar foto do diário:', error);
        diaryState.delete(telegramId);
        ctx.reply('❌ Erro ao processar a foto. Tente novamente.');
    }
}

/**
 * Processa observação de texto
 */
async function handleDiaryObservation(ctx) {
    const telegramId = ctx.from.id;
    const state = diaryState.get(telegramId);

    if (!state || state.step !== 'awaiting_observation') {
        return; // Ignora mensagens fora do contexto
    }

    const observation = ctx.message.text;
    await saveDiaryEntry(ctx, observation);
}

/**
 * Salva sem observação
 */
async function saveDiaryWithoutObs(ctx) {
    await saveDiaryEntry(ctx, null);
}

/**
 * Salva o registro no banco
 */
async function saveDiaryEntry(ctx, observation) {
    const telegramId = ctx.from.id;
    const state = diaryState.get(telegramId);

    if (!state || !state.fileId) {
        return ctx.reply('❌ Erro: dados incompletos. Tente novamente.');
    }

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            diaryState.delete(telegramId);
            return ctx.reply('❌ Você precisa estar cadastrado.');
        }

        // Salvar no banco
        const { error } = await supabase
            .from('food_diary')
            .insert({
                telegram_id: telegramId,
                meal_type: state.mealType,
                photo_file_id: state.fileId,
                photo_file_unique_id: state.fileUniqueId,
                observations: observation
            });

        if (error) throw error;

        // Limpar estado
        diaryState.delete(telegramId);

        // Notificar admin
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (adminId) {
            try {
                await ctx.telegram.sendPhoto(adminId, state.fileId, {
                    caption: `📸 *Novo Registro no Diário*\n\n` +
                        `👤 *Paciente:* ${patient.name}\n` +
                        `🍽️ *Refeição:* ${MEAL_TYPES[state.mealType]}\n` +
                        `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n` +
                        (observation ? `\n💬 *Observação:* ${observation}` : ''),
                    parse_mode: 'Markdown'
                });
            } catch (err) {
                console.error('Erro ao notificar admin:', err);
            }
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('➕ Registrar Outra', 'diary_add')],
            [Markup.button.callback('📅 Ver Hoje', 'diary_today')],
            [Markup.button.callback('🔙 Menu Principal', 'back_to_menu')]
        ]);

        await ctx.reply(
            `✅ *Registro salvo com sucesso!*\n\n` +
            `${MEAL_TYPES[state.mealType]} foi registrado(a) no seu diário.\n\n` +
            `A nutricionista receberá a notificação! 🎉`,
            { parse_mode: 'Markdown', ...keyboard }
        );

    } catch (error) {
        console.error('Erro ao salvar entrada do diário:', error);
        diaryState.delete(telegramId);
        ctx.reply('❌ Erro ao salvar. Tente novamente.');
    }
}

/**
 * Mostra histórico de hoje
 */
async function showTodayDiary(ctx) {
    const telegramId = ctx.from.id;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: entries, error } = await supabase
            .from('food_diary')
            .select('*')
            .eq('telegram_id', telegramId)
            .gte('created_at', today.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!entries || entries.length === 0) {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📷 Registrar Primeira Refeição', 'diary_add')],
                [Markup.button.callback('🔙 Voltar', 'diary_menu')]
            ]);

            return ctx.editMessageText(
                `📅 *Diário de Hoje*\n\n` +
                `Você ainda não registrou nenhuma refeição hoje.\n\n` +
                `Comece agora!`,
                { parse_mode: 'Markdown', ...keyboard }
            );
        }

        // Enviar cada foto com informações
        for (const entry of entries) {
            const time = new Date(entry.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            await ctx.replyWithPhoto(entry.photo_file_id, {
                caption: `${MEAL_TYPES[entry.meal_type]}\n` +
                    `🕐 ${time}\n` +
                    (entry.observations ? `💬 ${entry.observations}` : ''),
                parse_mode: 'Markdown'
            });
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('➕ Adicionar Mais', 'diary_add')],
            [Markup.button.callback('🔙 Voltar', 'diary_menu')]
        ]);

        await ctx.reply(
            `📊 Total de hoje: ${entries.length} refeição(ões)`,
            keyboard
        );

    } catch (error) {
        console.error('Erro ao buscar diário de hoje:', error);
        ctx.reply('❌ Erro ao buscar registros. Tente novamente.');
    }
}

/**
 * Mostra histórico completo (últimos 7 dias)
 */
async function showFullHistory(ctx) {
    const telegramId = ctx.from.id;

    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: entries, error } = await supabase
            .from('food_diary')
            .select('meal_type, created_at', { count: 'exact' })
            .eq('telegram_id', telegramId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!entries || entries.length === 0) {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📷 Começar Agora', 'diary_add')],
                [Markup.button.callback('🔙 Voltar', 'diary_menu')]
            ]);

            return ctx.editMessageText(
                `📊 *Histórico Completo*\n\n` +
                `Você ainda não tem registros nos últimos 7 dias.\n\n` +
                `Comece a registrar suas refeições hoje!`,
                { parse_mode: 'Markdown', ...keyboard }
            );
        }

        // Agrupar por dia
        const byDay = {};
        entries.forEach(entry => {
            const date = new Date(entry.created_at).toLocaleDateString('pt-BR');
            if (!byDay[date]) byDay[date] = [];
            byDay[date].push(entry);
        });

        let message = `📊 *Histórico dos Últimos 7 Dias*\n\n`;
        message += `📈 Total de registros: ${entries.length}\n\n`;

        Object.keys(byDay).forEach(date => {
            const count = byDay[date].length;
            message += `📅 *${date}*: ${count} refeição(ões)\n`;
        });

        message += `\n💡 Continue registrando para melhores resultados!`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📅 Ver Hoje', 'diary_today')],
            [Markup.button.callback('➕ Adicionar Mais', 'diary_add')],
            [Markup.button.callback('🔙 Voltar', 'diary_menu')]
        ]);

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao buscar histórico completo:', error);
        ctx.reply('❌ Erro ao buscar histórico. Tente novamente.');
    }
}

// Exportar todas as funções
module.exports = {
    showFoodDiaryMenu,
    startDiaryEntry,
    setMealType,
    handleDiaryPhoto,
    handleDiaryObservation,
    saveDiaryWithoutObs,
    showTodayDiary,
    showFullHistory,
    diaryState,
    MEAL_TYPES
};
