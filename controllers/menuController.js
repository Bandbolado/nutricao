// Centralizes menu rendering helpers to keep callbacks padronizados.
'use strict';

const { Markup } = require('telegraf');
const { MESSAGES } = require('../config/messages');
const { grantFreeTrial } = require('../services/patientService');

const MENU_ACTIONS = {
  VIEW_PROFILE: 'MENU_VIEW_PROFILE',
  VIEW_PROFILE_FULL: 'MENU_VIEW_PROFILE_FULL', // Novo: ver cadastro completo
  EDIT_PROFILE: 'MENU_EDIT_PROFILE', // Novo: alterar cadastro
  UPLOAD_FILE: 'MENU_UPLOAD_FILE',
  VIEW_RENEWAL: 'MENU_VIEW_RENEWAL',
  NUTRITION_CALC: 'MENU_NUTRITION_CALC',
  FILE_HISTORY: 'MENU_FILE_HISTORY',
  WEIGHT_HISTORY: 'MENU_WEIGHT_HISTORY',
  ADD_WEIGHT: 'MENU_ADD_WEIGHT',
  REMINDERS: 'MENU_REMINDERS',
  CHAT_NUTRITIONIST: 'MENU_CHAT_NUTRITIONIST',
  RENEW_PLAN: 'MENU_RENEW_PLAN',
  FOOD_RECORD: 'MENU_FOOD_RECORD', // Questionário alimentar
  FOOD_RECORD_HISTORY: 'MENU_FOOD_RECORD_HISTORY', // Histórico de questionários
  FOOD_DIARY: 'MENU_FOOD_DIARY', // Novo: Diário Alimentar com Fotos
  RECIPES: 'MENU_RECIPES', // Novo: Banco de Receitas
  REPORT: 'MENU_REPORT', // Novo: Relatórios em PDF
  WORKOUT_GENERATOR: 'MENU_WORKOUT_GENERATOR', // Novo: Gerador de Treinos (OpenAI)
  CALORIE_LOG: 'MENU_CALORIE_LOG', // Novo: Registrar alimentos e kcal
  REFERRAL: 'MENU_REFERRAL', // Novo: Indicar Amigo
  FAQ: 'MENU_FAQ', // Novo: FAQ automático
  BOOKING: 'MENU_BOOKING', // Novo: Agendar consulta
  ADMIN_DASHBOARD: 'MENU_ADMIN_DASHBOARD', // Novo: Dashboard Admin
  ACTIVITY_MENU: 'activity_menu', // Novo: Nível de Atividade
};

// Centralizes keyboard creation to keep callbacks consistent across the bot.
const buildMainMenu = (planStatus = 'inactive', isAdmin = false) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('📋 Meu Cadastro', MENU_ACTIONS.VIEW_PROFILE),
      Markup.button.callback('💰 Renovar Plano', MENU_ACTIONS.RENEW_PLAN)
    ],
    [
      Markup.button.callback('🧮 Calculadora', MENU_ACTIONS.NUTRITION_CALC),
      Markup.button.callback('📆 Validade Plano', MENU_ACTIONS.VIEW_RENEWAL)
    ],
    [Markup.button.callback('🍽️ Registrar Alimentos (kcal)', MENU_ACTIONS.CALORIE_LOG)],
    [
      Markup.button.callback('⚖️ Registrar Peso', MENU_ACTIONS.ADD_WEIGHT),
      Markup.button.callback('📊 Evolução Peso', MENU_ACTIONS.WEIGHT_HISTORY)
    ],
    [Markup.button.callback('🏃 Nível de Atividade', MENU_ACTIONS.ACTIVITY_MENU)],
    [
      Markup.button.callback('📄 Enviar Arquivo', MENU_ACTIONS.UPLOAD_FILE),
      Markup.button.callback('📂 Meus Arquivos', MENU_ACTIONS.FILE_HISTORY)
    ],
    [
      Markup.button.callback('💬 Chat Nutricionista', MENU_ACTIONS.CHAT_NUTRITIONIST),
      Markup.button.callback('🔔 Lembretes', MENU_ACTIONS.REMINDERS)
    ],
    // NOVAS FUNCIONALIDADES - Linha do Diário Alimentar e Receitas
    [
      Markup.button.callback('📸 Diário Alimentar', MENU_ACTIONS.FOOD_DIARY),
      Markup.button.callback('🍽️ Receitas', MENU_ACTIONS.RECIPES)
    ],
      [Markup.button.callback('🏋️ Gerar Treino', MENU_ACTIONS.WORKOUT_GENERATOR)],
    // Linha do Relatório e Indicações
    [
      Markup.button.callback('📊 Meu Relatório', MENU_ACTIONS.REPORT),
      Markup.button.callback('🎁 Indicar Amigo', MENU_ACTIONS.REFERRAL)
    ],
      // FAQ e Agendamento
      [
        Markup.button.callback('❓ FAQ', MENU_ACTIONS.FAQ),
        Markup.button.callback('📅 Agendar Consulta', MENU_ACTIONS.BOOKING)
      ],
    // Linha do Questionário (só aparece se plano ativo)
    ...(planStatus === 'active' ? [[
      Markup.button.callback('📝 Enviar Questionário ⭐', MENU_ACTIONS.FOOD_RECORD),
      Markup.button.callback('📋 Meus Questionários', MENU_ACTIONS.FOOD_RECORD_HISTORY)
    ]] : []),
    // Dashboard Admin (só aparece para admin)
    ...(isAdmin ? [[
      Markup.button.callback('🔧 Dashboard Admin', MENU_ACTIONS.ADMIN_DASHBOARD)
    ]] : []),
  ]);

const sendMainMenu = async (ctx, text = MESSAGES.MENU_MAIN) => {
  // Busca status do plano do paciente
  const { getPatientByTelegramId } = require('../services/patientService');
  const patient = await getPatientByTelegramId(ctx.from.id);
  const planStatus = patient?.plan_status || 'inactive';
  
  // Verificar se é admin
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  const isAdmin = adminId && parseInt(adminId) === parseInt(ctx.from.id);
  
  return ctx.replyWithMarkdown(text, buildMainMenu(planStatus, isAdmin));
};

// Verifica se o paciente completou o cadastro
const requireRegistration = (handler) => async (ctx) => {
  const { getPatientByTelegramId } = require('../services/patientService');
  const patient = await getPatientByTelegramId(ctx.from.id);
  
  if (!patient) {
    const { startRegistration } = require('./patientController');
    await ctx.answerCbQuery?.();
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_INCOMPLETE);
    await startRegistration(ctx);
    return;
  }
  
  return handler(ctx);
};

// Verifica se o paciente tem plano ativo (premium)
const requireActivePlan = (handler) => async (ctx) => {
  const { getPatientByTelegramId } = require('../services/patientService');
  const patient = await getPatientByTelegramId(ctx.from.id);
  
  if (!patient) {
    const { startRegistration } = require('./patientController');
    await ctx.answerCbQuery?.();
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_INCOMPLETE);
    await startRegistration(ctx);
    return;
  }
  
  if (patient.plan_status !== 'active') {
    await ctx.answerCbQuery?.();

    // Libera trial de 30 dias para testes
    const trial = await grantFreeTrial(ctx.from.id, 30);
    if (trial) {
      await ctx.replyWithMarkdown(
        '🎁 *Plano liberado para testes*\n\n' +
        'Você ganhou acesso total por 30 dias para testarmos o bot.\n' +
        'Após o período, será necessário um plano ativo.'
      );
      return handler(ctx);
    }

    // Se falhar, mantém bloqueio padrão
    await ctx.replyWithMarkdown(
      '🔒 *Recurso Premium*\n\n' +
      'Não foi possível ativar o teste gratuito agora. Tente novamente ou assine um plano.'
    );
    const { showPlans } = require('./paymentController');
    await showPlans(ctx);
    return;
  }
  
  return handler(ctx);
};

module.exports = {
  MENU_ACTIONS,
  buildMainMenu,
  sendMainMenu,
  requireRegistration,
  requireActivePlan,
};
