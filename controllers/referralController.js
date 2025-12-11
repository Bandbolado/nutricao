const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');
const { getPatientByTelegramId } = require('../services/patientService');

/**
 * Mostra o menu de indicações
 */
async function showReferralMenu(ctx) {
    const telegramId = ctx.from.id;

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.reply('❌ Você precisa estar cadastrado para usar o programa de indicações.');
        }

        // Buscar ou criar código de indicação
        let referralCode = await getReferralCode(patient.id, telegramId);

        if (!referralCode) {
            referralCode = await createReferralCode(patient.id, telegramId);
        }

        // Buscar estatísticas
        const stats = await getReferralStats(patient.id);

        const botUsername = process.env.BOT_USERNAME || 'cbarbosans_bot';
        const referralLink = `https://t.me/${botUsername}?start=ref_${referralCode}`;

        let message = `🎁 *Programa de Indicações*\n\n`;
        message += `Ganhe *R$ 20,00 de desconto* na sua próxima renovação para cada amigo que assinar um plano!\n\n`;
        message += `📊 *Suas Estatísticas:*\n`;
        message += `• Indicações enviadas: ${stats.total}\n`;
        message += `• Convertidas em planos: ${stats.converted}\n`;
        message += `• Desconto acumulado: R$ ${stats.totalDiscount.toFixed(2)}\n`;
        message += `• Desconto disponível: R$ ${stats.availableDiscount.toFixed(2)}\n\n`;
        message += `🔗 *Seu Link Exclusivo:*\n\`${referralLink}\`\n\n`;
        message += `💡 *Como funciona:*\n`;
        message += `1. Compartilhe seu link com amigos\n`;
        message += `2. Quando assinarem um plano, você ganha R$ 20\n`;
        message += `3. Use o desconto na sua renovação!\n\n`;
        message += `_Clique no link acima para copiar_`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('📤 Compartilhar no WhatsApp', `https://wa.me/?text=${encodeURIComponent(`Olá! Conheci a nutricionista Caroline Barbosa e recomendo! Use meu link: ${referralLink}`)}`)],
            [Markup.button.callback('📊 Ver Indicações', 'referral_list')],
            [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
        ]);

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao mostrar menu de indicações:', error);
        ctx.reply('❌ Erro ao carregar programa de indicações. Tente novamente.');
    }
}

/**
 * Busca código de indicação existente
 */
async function getReferralCode(patientId, telegramId) {
    const { data } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', patientId)
        .limit(1)
        .single();

    return data?.referral_code || null;
}

/**
 * Cria novo código de indicação
 */
async function createReferralCode(patientId, telegramId) {
    // Gerar código único
    const code = generateUniqueCode(telegramId);

    const { data, error } = await supabase
        .from('referrals')
        .insert({
            referrer_id: patientId,
            referrer_telegram_id: telegramId,
            referral_code: code,
            status: 'pending'
        })
        .select('referral_code')
        .single();

    if (error) {
        console.error('Erro ao criar código:', error);
        return null;
    }

    return data.referral_code;
}

/**
 * Gera código único
 */
function generateUniqueCode(telegramId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${telegramId}_${timestamp}${random}`.substring(0, 20);
}

/**
 * Busca estatísticas de indicações
 */
async function getReferralStats(patientId) {
    const { data: referrals } = await supabase
        .from('referrals')
        .select('status, discount_amount, discount_applied')
        .eq('referrer_id', patientId);

    const total = referrals?.length || 0;
    const converted = referrals?.filter(r => r.status === 'converted' || r.status === 'rewarded').length || 0;
    const totalDiscount = referrals?.reduce((sum, r) => {
        if (r.status === 'converted' || r.status === 'rewarded') {
            return sum + parseFloat(r.discount_amount || 0);
        }
        return sum;
    }, 0) || 0;
    const availableDiscount = referrals?.reduce((sum, r) => {
        if (r.status === 'converted' && !r.discount_applied) {
            return sum + parseFloat(r.discount_amount || 0);
        }
        return sum;
    }, 0) || 0;

    return {
        total,
        converted,
        totalDiscount,
        availableDiscount
    };
}

/**
 * Lista todas as indicações
 */
async function showReferralList(ctx) {
    const telegramId = ctx.from.id;

    try {
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.editMessageText('❌ Você precisa estar cadastrado.');
        }

        const { data: referrals } = await supabase
            .from('referrals')
            .select('*, referred_patient:patients!referrals_referred_patient_id_fkey(name)')
            .eq('referrer_id', patient.id)
            .order('created_at', { ascending: false });

        if (!referrals || referrals.length === 0) {
            return ctx.editMessageText(
                `📊 *Suas Indicações*\n\n` +
                `Você ainda não tem indicações.\n\n` +
                `Compartilhe seu link e comece a ganhar descontos!`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 Voltar', 'referral_menu')]
                    ])
                }
            );
        }

        let message = `📊 *Suas Indicações*\n\n`;

        referrals.forEach((ref, index) => {
            const status = {
                pending: '⏳ Pendente',
                converted: '✅ Convertida',
                rewarded: '🎉 Recompensada',
                expired: '⌛ Expirada'
            }[ref.status];

            const name = ref.referred_patient?.name || 'Aguardando cadastro';
            const date = new Date(ref.created_at).toLocaleDateString('pt-BR');

            message += `${index + 1}. ${status}\n`;
            message += `   👤 ${name}\n`;
            message += `   📅 ${date}\n`;
            if (ref.status === 'converted') {
                message += `   💰 R$ ${ref.discount_amount} ${ref.discount_applied ? '(usado)' : '(disponível)'}\n`;
            }
            message += `\n`;
        });

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Voltar', 'referral_menu')]
        ]);

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao listar indicações:', error);
        ctx.reply('❌ Erro ao carregar lista. Tente novamente.');
    }
}

/**
 * Processa link de indicação no /start
 */
async function processReferralStart(ctx, referralCode) {
    const telegramId = ctx.from.id;

    try {
        // Buscar indicação
        const { data: referral } = await supabase
            .from('referrals')
            .select('*, referrer:patients!referrals_referrer_id_fkey(name, telegram_id)')
            .eq('referral_code', referralCode)
            .eq('status', 'pending')
            .single();

        if (!referral) {
            return; // Código inválido ou já usado
        }

        // Verificar se não é o próprio referrer
        if (referral.referrer.telegram_id === telegramId) {
            return ctx.reply('❌ Você não pode usar seu próprio link de indicação!');
        }

        // Verificar se já existe paciente
        const existingPatient = await getPatientByTelegramId(telegramId);

        if (existingPatient) {
            return ctx.reply('❌ Você já está cadastrado. Links de indicação são apenas para novos usuários!');
        }

        // Registrar o telegram_id na indicação
        await supabase
            .from('referrals')
            .update({ referred_telegram_id: telegramId })
            .eq('id', referral.id);

        // Mensagem de boas-vindas
        await ctx.reply(
            `🎉 *Bem-vindo(a)!*\n\n` +
            `Você foi indicado(a) por *${referral.referrer.name}*!\n\n` +
            `Complete seu cadastro e ao assinar um plano, seu amigo ganhará R$ 20 de desconto.\n\n` +
            `Vamos começar? Use o comando /start para iniciar!`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Erro ao processar indicação:', error);
    }
}

/**
 * Marca indicação como convertida (chamado após pagamento)
 */
async function convertReferral(telegramId) {
    try {
        // Buscar indicação pendente com este telegram_id
        const { data: referral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_telegram_id', telegramId)
            .eq('status', 'pending')
            .single();

        if (!referral) {
            return; // Sem indicação pendente
        }

        // Buscar paciente recém-criado
        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return;
        }

        // Atualizar indicação
        await supabase
            .from('referrals')
            .update({
                referred_patient_id: patient.id,
                status: 'converted',
                converted_at: new Date().toISOString()
            })
            .eq('id', referral.id);

        // Notificar o referrer
        const { data: updated } = await supabase
            .from('referrals')
            .select('referrer_telegram_id, discount_amount')
            .eq('id', referral.id)
            .single();

        if (updated) {
            try {
                await ctx.telegram.sendMessage(
                    updated.referrer_telegram_id,
                    `🎉 *Parabéns!*\n\n` +
                    `Sua indicação acabou de assinar um plano!\n\n` +
                    `💰 Você ganhou *R$ ${updated.discount_amount}* de desconto na sua próxima renovação.\n\n` +
                    `Use /menu → Indicar Amigo para ver seus descontos!`,
                    { parse_mode: 'Markdown' }
                );
            } catch (err) {
                console.error('Erro ao notificar referrer:', err);
            }
        }

    } catch (error) {
        console.error('Erro ao converter indicação:', error);
    }
}

/**
 * Aplica desconto de indicação no pagamento
 */
async function applyReferralDiscount(patientId, amount) {
    try {
        // Buscar descontos disponíveis
        const { data: referrals } = await supabase
            .from('referrals')
            .select('id, discount_amount')
            .eq('referrer_id', patientId)
            .eq('status', 'converted')
            .eq('discount_applied', false)
            .order('converted_at', { ascending: true });

        if (!referrals || referrals.length === 0) {
            return 0; // Sem descontos disponíveis
        }

        let totalDiscount = 0;
        const idsToUpdate = [];

        for (const ref of referrals) {
            if (totalDiscount + parseFloat(ref.discount_amount) <= amount) {
                totalDiscount += parseFloat(ref.discount_amount);
                idsToUpdate.push(ref.id);
            }

            if (totalDiscount >= amount) break;
        }

        // Marcar como aplicados
        if (idsToUpdate.length > 0) {
            await supabase
                .from('referrals')
                .update({
                    discount_applied: true,
                    rewarded_at: new Date().toISOString(),
                    status: 'rewarded'
                })
                .in('id', idsToUpdate);
        }

        return totalDiscount;

    } catch (error) {
        console.error('Erro ao aplicar desconto:', error);
        return 0;
    }
}

module.exports = {
    showReferralMenu,
    showReferralList,
    processReferralStart,
    convertReferral,
    applyReferralDiscount
};
