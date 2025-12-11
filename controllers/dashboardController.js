const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');

/**
 * Verifica se é admin
 */
function isAdmin(telegramId) {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    return adminId && parseInt(adminId) === parseInt(telegramId);
}

/**
 * Mostra dashboard administrativo
 */
async function showAdminDashboard(ctx) {
    const telegramId = ctx.from.id;

    if (!isAdmin(telegramId)) {
        return ctx.reply('❌ Acesso negado. Apenas administradores podem acessar o dashboard.');
    }

    try {
        await ctx.reply('📊 Carregando dashboard... Aguarde.');

        // Buscar dados
        const [patientsData, revenueData, engagementData, expiringData] = await Promise.all([
            getPatientsStats(),
            getRevenueStats(),
            getEngagementStats(),
            getExpiringPlans()
        ]);

        let message = `📊 *Dashboard Administrativo*\n`;
        message += `_Atualizado em ${new Date().toLocaleString('pt-BR')}_\n\n`;

        // Pacientes
        message += `👥 *Pacientes*\n`;
        message += `• Total cadastrados: ${patientsData.total}\n`;
        message += `• Planos ativos: ${patientsData.active} (${((patientsData.active/patientsData.total)*100).toFixed(1)}%)\n`;
        message += `• Planos inativos: ${patientsData.inactive}\n`;
        message += `• Novos (últimos 7 dias): ${patientsData.newLast7Days}\n\n`;

        // Receita
        message += `💰 *Receita*\n`;
        message += `• MRR (Receita Mensal): R$ ${revenueData.mrr.toFixed(2)}\n`;
        message += `• Faturamento (30 dias): R$ ${revenueData.last30Days.toFixed(2)}\n`;
        message += `• Total histórico: R$ ${revenueData.allTime.toFixed(2)}\n`;
        message += `• Ticket médio: R$ ${revenueData.avgTicket.toFixed(2)}\n\n`;

        // Planos expirando
        message += `⚠️ *Alertas*\n`;
        message += `• Vencendo em 7 dias: ${expiringData.next7Days}\n`;
        message += `• Vencendo em 3 dias: ${expiringData.next3Days}\n`;
        message += `• Vencidos não renovados: ${expiringData.expired}\n\n`;

        // Engajamento
        message += `📈 *Engajamento (7 dias)*\n`;
        message += `• Mensagens enviadas: ${engagementData.messages}\n`;
        message += `• Pesagens registradas: ${engagementData.weights}\n`;
        message += `• Diários alimentares: ${engagementData.diaries}\n`;
        message += `• Questionários: ${engagementData.questionnaires}\n`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Ver Pacientes', 'admin_patients'),
                Markup.button.callback('💰 Ver Receitas', 'admin_revenue')
            ],
            [
                Markup.button.callback('⚠️ Alertas', 'admin_alerts'),
                Markup.button.callback('📊 Engajamento', 'admin_engagement')
            ],
            [Markup.button.callback('🔄 Atualizar', 'admin_dashboard')],
            [Markup.button.callback('🔙 Fechar', 'admin_close')]
        ]);

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        ctx.reply('❌ Erro ao carregar dashboard. Tente novamente.');
    }
}

/**
 * Estatísticas de pacientes
 */
async function getPatientsStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: all } = await supabase
        .from('patients')
        .select('plan_status, created_at');

    const total = all?.length || 0;
    const active = all?.filter(p => p.plan_status === 'active').length || 0;
    const inactive = total - active;
    const newLast7Days = all?.filter(p => new Date(p.created_at) >= sevenDaysAgo).length || 0;

    return { total, active, inactive, newLast7Days };
}

/**
 * Estatísticas de receita
 */
async function getRevenueStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Todos os pagamentos aprovados
    const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'approved');

    // Pagamentos dos últimos 30 dias
    const last30DaysPayments = allPayments?.filter(p => 
        new Date(p.created_at) >= thirtyDaysAgo
    ) || [];

    // Calcular MRR (planos ativos x valor médio mensal)
    const { data: activePlans } = await supabase
        .from('patients')
        .select('plan_end_date, created_at')
        .eq('plan_status', 'active');

    // Estimar MRR baseado nos planos ativos
    let mrr = 0;
    if (activePlans && allPayments) {
        const avgPayment = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / allPayments.length || 0;
        mrr = activePlans.length * (avgPayment / 3); // Estimativa: dividir por média de meses
    }

    const last30Days = last30DaysPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const allTime = allPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    const avgTicket = allPayments?.length > 0 ? allTime / allPayments.length : 0;

    return {
        mrr,
        last30Days,
        allTime,
        avgTicket
    };
}

/**
 * Estatísticas de engajamento
 */
async function getEngagementStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [messages, weights, diaries, questionnaires] = await Promise.all([
        supabase.from('chat_messages').select('id', { count: 'exact' }).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('weight_history').select('id', { count: 'exact' }).gte('weighed_at', sevenDaysAgo.toISOString()),
        supabase.from('food_diary').select('id', { count: 'exact' }).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('food_records').select('id', { count: 'exact' }).gte('created_at', sevenDaysAgo.toISOString())
    ]);

    return {
        messages: messages.data?.length || 0,
        weights: weights.data?.length || 0,
        diaries: diaries.data?.length || 0,
        questionnaires: questionnaires.data?.length || 0
    };
}

/**
 * Planos expirando
 */
async function getExpiringPlans() {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: expiring } = await supabase
        .from('patients')
        .select('plan_end_date, plan_status')
        .eq('plan_status', 'active')
        .not('plan_end_date', 'is', null);

    const next3Days = expiring?.filter(p => {
        const endDate = new Date(p.plan_end_date);
        return endDate >= now && endDate <= in3Days;
    }).length || 0;

    const next7Days = expiring?.filter(p => {
        const endDate = new Date(p.plan_end_date);
        return endDate >= now && endDate <= in7Days;
    }).length || 0;

    // Planos vencidos mas ainda com status ativo
    const expired = expiring?.filter(p => {
        const endDate = new Date(p.plan_end_date);
        return endDate < now;
    }).length || 0;

    return { next3Days, next7Days, expired };
}

/**
 * Lista pacientes ativos
 */
async function showActivePatients(ctx) {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('❌ Acesso negado.', { show_alert: true });
    }

    try {
        const { data: patients } = await supabase
            .from('patients')
            .select('name, plan_status, plan_end_date, created_at')
            .eq('plan_status', 'active')
            .order('plan_end_date', { ascending: true })
            .limit(20);

        if (!patients || patients.length === 0) {
            return ctx.editMessageText(
                `👥 *Pacientes Ativos*\n\nNenhum paciente ativo no momento.`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 Voltar', 'admin_dashboard')]
                    ])
                }
            );
        }

        let message = `👥 *Pacientes Ativos* (${patients.length})\n\n`;

        patients.forEach((p, index) => {
            const daysLeft = Math.ceil((new Date(p.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24));
            const alert = daysLeft <= 7 ? '⚠️' : daysLeft <= 3 ? '🚨' : '✅';

            message += `${index + 1}. ${alert} *${p.name}*\n`;
            message += `   Vence em: ${daysLeft} dias (${new Date(p.plan_end_date).toLocaleDateString('pt-BR')})\n\n`;
        });

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Atualizar', 'admin_patients')],
            [Markup.button.callback('🔙 Voltar', 'admin_dashboard')]
        ]);

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao listar pacientes:', error);
        ctx.answerCbQuery('❌ Erro ao carregar lista.');
    }
}

/**
 * Mostra alertas de vencimento
 */
async function showAlerts(ctx) {
    if (!isAdmin(ctx.from.id)) {
        return ctx.answerCbQuery('❌ Acesso negado.', { show_alert: true });
    }

    try {
        const now = new Date();
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: expiring } = await supabase
            .from('patients')
            .select('name, telegram_id, plan_end_date')
            .eq('plan_status', 'active')
            .lte('plan_end_date', in7Days.toISOString())
            .order('plan_end_date', { ascending: true });

        if (!expiring || expiring.length === 0) {
            return ctx.editMessageText(
                `⚠️ *Alertas*\n\n✅ Nenhum plano vencendo nos próximos 7 dias!`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🔙 Voltar', 'admin_dashboard')]
                    ])
                }
            );
        }

        let message = `⚠️ *Alertas de Vencimento*\n\n`;

        expiring.forEach((p, index) => {
            const endDate = new Date(p.plan_end_date);
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            const alert = daysLeft <= 0 ? '🚨 VENCIDO' : daysLeft <= 3 ? '🔴' : '🟡';

            message += `${index + 1}. ${alert} *${p.name}*\n`;
            message += `   ${daysLeft <= 0 ? 'Venceu há' : 'Vence em'} ${Math.abs(daysLeft)} dias\n`;
            message += `   Data: ${endDate.toLocaleDateString('pt-BR')}\n\n`;
        });

        message += `\n💡 _Considere enviar lembretes de renovação_`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📢 Enviar Lembretes', 'admin_send_reminders')],
            [Markup.button.callback('🔙 Voltar', 'admin_dashboard')]
        ]);

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        ctx.answerCbQuery('❌ Erro ao carregar alertas.');
    }
}

module.exports = {
    isAdmin,
    showAdminDashboard,
    showActivePatients,
    showAlerts
};
