// Controla o fluxo de cadastro guiado, consultas e mensagens relacionadas aos pacientes.
'use strict';

const { validateName, validateAge, validateWeight, validateHeight, validateObjective, validateRestrictions } = require('../utils/validators');
const { getPatientByTelegramId, upsertPatient, formatPatientProfile, getRenewalInfo } = require('../services/patientService');
const { buildMainMenu, sendMainMenu } = require('./menuController');
const { notifyNewPatient } = require('../services/adminService');
const { generateNutritionalAnalysis } = require('../utils/nutritionCalculator');
const { scheduleRenewalReminders } = require('../services/reminderService');
const { isAdmin } = require('../services/adminService');
const { MESSAGES } = require('../config/messages');

const parseActivityLevel = (input) => {
  const value = input.trim().toLowerCase();
  if (!value) throw new Error('Informe um nível de atividade.');
  if (['s', 'sed', 'sedentario', 'sedentário'].includes(value)) return 'sedentary';
  if (['l', 'leve', 'light'].includes(value)) return 'light';
  if (['m', 'mod', 'moderado'].includes(value)) return 'moderate';
  if (['a', 'ativo', 'active'].includes(value)) return 'active';
  if (['ma', 'va', 'muito ativo', 'muitoativo', 'veryactive', 'very active'].includes(value)) return 'veryActive';
  throw new Error('Escolha: Sedentário, Leve, Moderado, Ativo ou Muito Ativo (pode usar S/L/M/A/MA).');
};

const registrationSteps = [
  { key: 'name', question: '👤 *Passo 1 de 8*\n\nQual é o seu *nome completo*?', validator: validateName },
  { key: 'age', question: '🎂 *Passo 2 de 8*\n\nQual é a sua *idade*?\n_Exemplo: 25_', validator: validateAge },
  { key: 'gender', question: '⚧ *Passo 3 de 8*\n\nQual é o seu *sexo*?\n\nResponda: *M* (Masculino) ou *F* (Feminino)', validator: (input) => {
    const normalized = input.trim().toUpperCase();
    if (normalized !== 'M' && normalized !== 'F') {
      throw new Error('Por favor, responda apenas *M* ou *F*');
    }
    return normalized === 'M' ? 'Masculino' : 'Feminino';
  }},
  { key: 'weight', question: '⚖️ *Passo 4 de 8*\n\nQual é o seu *peso* em kg?\n_Exemplo: 70.5_', validator: validateWeight },
  { key: 'height', question: '📏 *Passo 5 de 8*\n\nQual é a sua *altura* em cm?\n_Exemplo: 175_', validator: validateHeight },
  { key: 'activity_level', question: '🏃 *Passo 6 de 8*\n\nQual é o seu *nível de atividade*? Escolha e responda apenas a sigla:\n\n' +
      '• S = Sedentário — Pouco ou nenhum exercício (x1.2)\n' +
      '• L = Leve — 1-3x/semana (x1.375)\n' +
      '• M = Moderado — 3-5x/semana (x1.55)\n' +
      '• A = Ativo — 6-7x/semana (x1.725)\n' +
      '• MA = Muito Ativo — Treino intenso/2x dia (x1.9)\n\n' +
      'Responda: S, L, M, A ou MA.', validator: parseActivityLevel },
  { key: 'objective', question: '🎯 *Passo 7 de 8*\n\nQual é o seu *principal objetivo*?\n_Exemplo: Ganhar massa muscular, emagrecer, melhorar saúde..._', validator: validateObjective },
  { key: 'restrictions', question: '🥗 *Passo 8 de 8*\n\nPossui *restrições alimentares*?\n_Exemplo: Lactose, glúten, vegetariano...\nSe não tiver, responda: Sem restrições_', validator: validateRestrictions },
];

// In-memory state machine to guide each patient through the registration flow.
const registrationState = new Map();

// Initializes the guided onboarding flow and prompts the first question.
const startRegistration = async (ctx, introMessage = MESSAGES.REGISTRATION_INTRO) => {
  registrationState.set(ctx.from.id, { stepIndex: 0, data: {} });
  await ctx.replyWithMarkdown(introMessage);
  await askCurrentQuestion(ctx);
};

// Sends the question associated with the patient's current step.
const askCurrentQuestion = async (ctx) => {
  const state = registrationState.get(ctx.from.id);
  if (!state) return;
  const step = registrationSteps[state.stepIndex];
  await ctx.replyWithMarkdown(step.question);
};

// Handles /start, resuming registration if needed or showing the menu.
const handleStart = async (ctx) => {
  const telegramId = ctx.from.id;
  
  // Verificar se há código de indicação (referral)
  const startPayload = ctx.message.text.split(' ')[1]; // /start ref_CODIGO
  if (startPayload && startPayload.startsWith('ref_')) {
    const referralCode = startPayload.substring(4); // Remove 'ref_'
    const referralController = require('./referralController');
    await referralController.processReferralStart(ctx, referralCode);
    // Continua com o fluxo normal abaixo
  }
  
  // Se for admin, mostra menu admin
  if (isAdmin(telegramId)) {
    const adminController = require('./adminController');
    await ctx.replyWithMarkdown(MESSAGES.WELCOME_ADMIN);
    await adminController.showAdminMenu(ctx);
    return;
  }

  const existing = await getPatientByTelegramId(telegramId);

  if (existing) {
    const firstName = existing.name.split(' ')[0];
    await ctx.replyWithMarkdown(MESSAGES.WELCOME_BACK(firstName));
    await sendMainMenu(ctx);
    return;
  }

  await ctx.replyWithMarkdown(MESSAGES.WELCOME_NEW_USER);
  await startRegistration(ctx);
};

// Persists answers for each step and triggers completion when finished.
const handleRegistrationResponse = async (ctx, bot) => {
  const state = registrationState.get(ctx.from.id);
  if (!state) {
    return false;
  }

  const step = registrationSteps[state.stepIndex];
  try {
    state.data[step.key] = step.validator(ctx.message.text);
  } catch (error) {
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_ERROR(error.message));
    return true;
  }

  state.stepIndex += 1;

  if (state.stepIndex >= registrationSteps.length) {
    await finalizeRegistration(ctx, state.data, bot);
    registrationState.delete(ctx.from.id);
    return true;
  }

  await askCurrentQuestion(ctx);
  return true;
};

// Writes the entire profile to Supabase and displays the main menu.
const finalizeRegistration = async (ctx, data, bot) => {
  const telegramId = ctx.from.id;
  
  // Verifica se existe histórico de peso (indicador de cadastro anterior resetado)
  const { supabase } = require('../config/supabase');
  const { data: weightHistory } = await supabase
    .from('weight_history')
    .select('id')
    .eq('telegram_id', telegramId)
    .limit(1);
  
  const { data: fileHistory } = await supabase
    .from('patient_files')
    .select('id')
    .eq('telegram_id', telegramId)
    .limit(1);
  
  // Se tem histórico, é um cadastro resetado - mantém as datas antigas
  const hasHistory = (weightHistory && weightHistory.length > 0) || (fileHistory && fileHistory.length > 0);
  
  let restoredMessage = '';
  if (hasHistory) {
    // Busca a data mais antiga de peso ou arquivo para estimar plano anterior
    const { data: oldestWeight } = await supabase
      .from('weight_history')
      .select('recorded_at')
      .eq('telegram_id', telegramId)
      .order('recorded_at', { ascending: true })
      .limit(1);
    
    if (oldestWeight && oldestWeight[0]) {
      const oldDate = new Date(oldestWeight[0].recorded_at);
      data.plan_start_date = oldDate;
      // Mantém o plano por mais 30 dias a partir de hoje
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);
      data.plan_end_date = newEndDate;
      restoredMessage = '\n\n✅ Seu histórico foi restaurado!';
    }
  }
  
  const patient = await upsertPatient(telegramId, data);
  
  // Notifica admin sobre novo cadastro
  if (bot) {
    await notifyNewPatient(bot, patient);
  }

  // Agenda lembretes automáticos de renovação
  await scheduleRenewalReminders(telegramId, patient.plan_end_date);
  
  const firstName = data.name.split(' ')[0];
  await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_SUCCESS(firstName, hasHistory));
  await sendMainMenu(ctx);
};

// Returns the formatted profile or restarts onboarding for new users.
const handleViewProfile = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_NOT_FOUND);
    await startRegistration(ctx);
    return;
  }
  await ctx.replyWithMarkdown(
    MESSAGES.MENU_PROFILE,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👀 Ver cadastro completo', callback_data: 'MENU_VIEW_PROFILE_FULL' }],
          [{ text: '✏️ Alterar cadastro', callback_data: 'MENU_EDIT_PROFILE' }],
          [{ text: '🔙 Voltar', callback_data: 'back_to_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    }
  );
};

// Mostra o cadastro completo imediatamente.
const handleViewProfileFull = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_NOT_FOUND);
    await startRegistration(ctx);
    return;
  }

  await ctx.replyWithMarkdown(
    MESSAGES.MENU_PROFILE + '\n\n' + formatPatientProfile(patient),
    buildMainMenu()
  );
};

// Reinicia fluxo de cadastro para atualizar dados.
const handleEditProfile = async (ctx) => {
  await ctx.replyWithMarkdown('✏️ Vamos atualizar seu cadastro. Responda novamente as perguntas.');
  await startRegistration(ctx);
};

// Shares plan renewal timing, ensuring only registered patients can access it.
const handleRenewalRequest = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_NOT_FOUND);
    await startRegistration(ctx);
    return;
  }

  const { message } = getRenewalInfo(patient);
  await ctx.replyWithMarkdown(
    MESSAGES.MENU_PLAN_STATUS + '\n\n' + message,
    buildMainMenu()
  );
};

// Gera e exibe análise nutricional completa baseada no perfil do paciente.
const handleNutritionalCalculator = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown(MESSAGES.REGISTRATION_NOT_FOUND);
    await startRegistration(ctx);
    return;
  }

  // Usa o sexo e o nível de atividade cadastrados do paciente
  const gender = patient.gender === 'Masculino' ? 'male' : 'female';
  const activityLevel = patient.activity_level || 'sedentary';
  const analysis = generateNutritionalAnalysis(patient, activityLevel, gender);
  
  await ctx.replyWithMarkdown(MESSAGES.NUTRITION_CALC_TITLE + analysis.formatted, buildMainMenu());
};

module.exports = {
  handleStart,
  handleRegistrationResponse,
  handleViewProfile,
  handleViewProfileFull,
  handleEditProfile,
  handleRenewalRequest,
  handleNutritionalCalculator,
  startRegistration,
};
