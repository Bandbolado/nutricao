// Gerencia interações relacionadas ao histórico e registro de peso.
'use strict';

const { getPatientByTelegramId, upsertPatient } = require('../services/patientService');
const { addWeightEntry, getWeightHistory, calculateWeightStats, formatWeightHistory } = require('../services/weightService');
const { buildMainMenu } = require('./menuController');

// Estado para capturar entrada de peso do usuário.
const weightInputState = new Map();

// Calcula TMB usando Mifflin-St Jeor
const computeBmr = (patient) => {
  if (!patient?.weight || !patient?.height || !patient?.age || !patient?.gender) return null;
  const w = Number(patient.weight);
  const h = Number(patient.height);
  const a = Number(patient.age);
  const base = 10 * w + 6.25 * h - 5 * a;
  return patient.gender?.toUpperCase() === 'M' ? base + 5 : base - 161;
};

// Solicita que o usuário digite o novo peso.
const requestWeightInput = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nVocê precisa finalizar seu cadastro primeiro.');
    return;
  }

  weightInputState.set(ctx.from.id, { awaiting: true });
  
  await ctx.replyWithMarkdown(
    '⚖️ *Registrar Novo Peso*\n\n' +
    'Digite seu peso atual em kg.\n\n' +
    `💡 _Peso anterior: ${patient.weight} kg_\n\n` +
    '📝 Exemplo: `72.5` ou `72`'
  );
};

// Processa o peso digitado pelo usuário.
const handleWeightInput = async (ctx) => {
  const state = weightInputState.get(ctx.from.id);
  if (!state || !state.awaiting) {
    return false; // Não está aguardando entrada de peso
  }

  const weightText = ctx.message.text.trim().replace(',', '.');
  const weight = parseFloat(weightText);

  if (isNaN(weight) || weight < 20 || weight > 400) {
    await ctx.replyWithMarkdown(
      '❌ *Peso inválido*\n\n' +
      'Informe um valor entre 20kg e 400kg.\n' +
      '📝 Exemplo: `72.5`'
    );
    return true;
  }

  try {
    const patient = await getPatientByTelegramId(ctx.from.id);
    const previousWeight = patient.weight;
    const difference = (weight - previousWeight).toFixed(1);
    const diffText = difference > 0 ? `+${difference}` : difference;

    // Adiciona no histórico
    await addWeightEntry(ctx.from.id, weight);

    // Atualiza peso atual do paciente
    await upsertPatient(ctx.from.id, { ...patient, weight });

    weightInputState.delete(ctx.from.id);

    const changeEmoji = difference > 0 ? '📈' : difference < 0 ? '📉' : '➡️';

    const updatedPatient = { ...patient, weight };
    const bmr = computeBmr(updatedPatient);
    const bmrText = bmr
      ? `\n🔥 *Nova TMB (basal):* ~${Math.round(bmr)} kcal/dia` +
        '\n💡 Ajuste os macros/calorias conforme nova TMB.\n'
      : '';

    await ctx.replyWithMarkdown(
      '✅ *Peso registrado com sucesso!*\n\n' +
      `⚖️ *Novo peso:* ${weight} kg\n` +
      `${changeEmoji} *Variação:* ${diffText} kg\n\n` +
      '📊 Seu histórico foi atualizado!\n' +
      bmrText,
      buildMainMenu()
    );
  } catch (error) {
    console.error('Erro ao registrar peso:', error);
    await ctx.replyWithMarkdown('❌ Erro ao salvar peso. Tente novamente.');
    weightInputState.delete(ctx.from.id);
  }

  return true;
};

// Exibe histórico completo de evolução de peso.
const showWeightHistory = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nVocê precisa finalizar seu cadastro primeiro.');
    return;
  }

  try {
    const history = await getWeightHistory(ctx.from.id);
    const stats = calculateWeightStats(history, patient.weight);
    const message = formatWeightHistory(history, stats);

    await ctx.replyWithMarkdown(message, buildMainMenu());
  } catch (error) {
    console.error('Erro ao buscar histórico de peso:', error);
    await ctx.replyWithMarkdown(
      '❌ *Erro ao carregar histórico*\n\n' +
      'Não consegui buscar seu histórico no momento.\n' +
      '🔄 _Tente novamente em instantes._'
    );
  }
};

module.exports = {
  requestWeightInput,
  handleWeightInput,
  showWeightHistory,
};
