// Controller para gerenciar pagamentos e renovações de planos
'use strict';

const { Markup } = require('telegraf');
const {
  PLANS,
  createPaymentPreference,
  createPaymentRecord,
  createPixPayment,
  getPatientPayments,
} = require('../services/paymentService');
const { supabase } = require('../config/supabase');

const tableName = process.env.SUPABASE_PATIENTS_TABLE || 'patients';

// Mostra opções de planos disponíveis
const showPlans = async (ctx) => {
  const buttons = [
    [Markup.button.callback('📅 Mensal - R$ 150,00 (30 dias)', 'PAYMENT_PLAN_monthly')],
    [Markup.button.callback('📆 Trimestral - R$ 400,00 (90 dias) 💰 -11%', 'PAYMENT_PLAN_quarterly')],
    [Markup.button.callback('🗓️ Semestral - R$ 750,00 (180 dias) 💰 -17%', 'PAYMENT_PLAN_semiannual')],
    [Markup.button.callback('📜 Histórico de Pagamentos', 'PAYMENT_HISTORY')],
    [Markup.button.callback('🔙 Voltar', 'BACK_TO_MENU')],
  ];

  const message = 
    '💰 *Renovação de Plano*\n\n' +
    '📋 Escolha o plano ideal para você:\n\n' +
    '📅 *Mensal* - R$ 150,00\n' +
    '   → 30 dias de acompanhamento\n\n' +
    '📆 *Trimestral* - R$ 400,00 💰\n' +
    '   → 90 dias de acompanhamento\n' +
    '   → Economia de R$ 50 (11% OFF)\n\n' +
    '🗓️ *Semestral* - R$ 750,00 💰\n' +
    '   → 180 dias de acompanhamento\n' +
    '   → Economia de R$ 150 (17% OFF)\n\n' +
    '✨ Escolha sua opção e gere o link de pagamento!';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  } else {
    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
  }
};

// Gera link de pagamento para o plano escolhido
const generatePaymentLink = async (ctx, planType) => {
  try {
    await ctx.answerCbQuery('⏳ Gerando link de pagamento...');

    const telegramId = ctx.from.id;
    
    // Busca dados do paciente
    const { data: patient, error } = await supabase
      .from(tableName)
      .select('name, plan_end_date')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !patient) {
      await ctx.reply('❌ Erro: Você precisa estar cadastrado para renovar o plano.\n\nUse /start para se cadastrar.');
      return;
    }

    const plan = PLANS[planType];
    
    // Cria preferência no Mercado Pago
    const preference = await createPaymentPreference(telegramId, planType, patient.name);
    
    // Registra pagamento no banco
    await createPaymentRecord(telegramId, planType, preference);

    const currentEndDate = new Date(patient.plan_end_date);
    const isExpired = currentEndDate < new Date();
    const planStatus = isExpired ? '❌ Vencido' : '✅ Ativo';

    const message = 
      `💳 *Link de Pagamento Gerado!*\n\n` +
      `📦 *Plano:* ${plan.name}\n` +
      `💰 *Valor:* R$ ${plan.price.toFixed(2)}\n` +
      `📅 *Duração:* ${plan.days} dias\n\n` +
      `📌 *Status Atual:* ${planStatus}\n` +
      `📆 *Vence em:* ${currentEndDate.toLocaleDateString('pt-BR')}\n\n` +
      `🔗 *Clique no botão abaixo para pagar:*\n\n` +
      `✅ Aceita PIX (aprovação instantânea)\n` +
      `💳 Cartão de crédito/débito\n` +
      `🔒 Pagamento 100% seguro via Mercado Pago\n\n` +
      `⚡ Após aprovação, seu plano será renovado automaticamente!`;

    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
      [Markup.button.url('💳 Pagar agora (cartão/pix)', preference.init_point)],
      [Markup.button.callback('⚡ Pagar no PIX (QR)', `PAYMENT_PIX_${planType}`)],
      [Markup.button.callback('🔙 Voltar aos Planos', 'PAYMENT_SHOW_PLANS')],
    ]));

  } catch (error) {
    console.error('Erro ao gerar link de pagamento:', error);
    await ctx.reply(
      '❌ Erro ao gerar link de pagamento.\n\n' +
      'Por favor, tente novamente ou entre em contato com a nutricionista.'
    );
  }
};

// Gera pagamento PIX sob demanda e envia QR
const generatePixPayment = async (ctx, planType) => {
  try {
    await ctx.answerCbQuery('Gerando QR PIX...');

    const telegramId = ctx.from.id;
    const { data: patient, error } = await supabase
      .from(tableName)
      .select('name')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !patient) {
      await ctx.reply('❌ Você precisa estar cadastrado para pagar.\n\nUse /start para se cadastrar.');
      return;
    }

    const pix = await createPixPayment(telegramId, planType, patient.name);

    // Envia QR como imagem
    const caption =
      '💸 *PIX Gerado com Sucesso!*\n\n' +
      '1) Abra seu app do banco\n' +
      '2) Escolha pagar via PIX QR\n' +
      '3) Aponte a câmera para o QR ou copie a chave abaixo\n\n' +
      `🔑 Chave copia-e-cola:\n\n${pix.qrCode}\n\n` +
      (pix.ticketUrl ? `🔗 Link direto: ${pix.ticketUrl}\n\n` : '') +
      '⚡ Após pagar, o status será confirmado automaticamente.';

    try {
      await ctx.replyWithPhoto({ source: Buffer.from(pix.qrBase64, 'base64') }, { caption });
    } catch (err) {
      console.error('Falha ao enviar QR como imagem, enviando texto:', err);
      await ctx.reply(caption);
    }

    await ctx.replyWithMarkdown('🔙 Caso queira outro plano, volte ao menu:', Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Voltar aos Planos', 'PAYMENT_SHOW_PLANS')],
    ]));

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    await ctx.reply('❌ Não foi possível gerar o PIX agora. Tente novamente em instantes.');
  }
};

// Mostra histórico de pagamentos do paciente
const showPaymentHistory = async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const telegramId = ctx.from.id;
    const payments = await getPatientPayments(telegramId);

    if (!payments || payments.length === 0) {
      await ctx.editMessageText(
        '📭 *Histórico de Pagamentos*\n\n' +
        'Você ainda não realizou nenhum pagamento.\n\n' +
        '💡 Clique em "Renovar Plano" para escolher um plano!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💰 Renovar Plano', 'PAYMENT_SHOW_PLANS')],
            [Markup.button.callback('🔙 Voltar', 'BACK_TO_MENU')],
          ]),
        }
      );
      return;
    }

    let message = '📜 *Histórico de Pagamentos*\n\n';
    
    payments.forEach((payment, index) => {
      const status = {
        pending: '⏳ Pendente',
        approved: '✅ Aprovado',
        rejected: '❌ Rejeitado',
        cancelled: '🚫 Cancelado',
        refunded: '↩️ Reembolsado',
      }[payment.status] || payment.status;

      const date = new Date(payment.created_at).toLocaleDateString('pt-BR');
      
      message += `${index + 1}. *${status}*\n`;
      message += `   💰 R$ ${payment.amount.toFixed(2)} - ${payment.plan_days} dias\n`;
      message += `   📅 ${date}\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💰 Renovar Plano', 'PAYMENT_SHOW_PLANS')],
        [Markup.button.callback('🔙 Voltar', 'BACK_TO_MENU')],
      ]),
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    await ctx.reply('❌ Erro ao carregar histórico de pagamentos.');
  }
};

module.exports = {
  showPlans,
  generatePaymentLink,
  generatePixPayment,
  showPaymentHistory,
};
