'use strict';

const { Markup } = require('telegraf');
const { getPatientByTelegramId, upsertPatient } = require('../services/patientService');
const { calculateTMB, calculateDailyCalories } = require('../utils/nutritionCalculator');

const ACTIVITY_LEVELS = {
  sedentary: { label: '🏝️ Sedentário', multiplier: 1.2, desc: 'Pouco ou nenhum exercício' },
  light: { label: '🚶 Leve', multiplier: 1.375, desc: '1-3x/semana' },
  moderate: { label: '🏃 Moderado', multiplier: 1.55, desc: '3-5x/semana' },
  active: { label: '🔥 Ativo', multiplier: 1.725, desc: '6-7x/semana' },
  veryActive: { label: '💪 Muito Ativo', multiplier: 1.9, desc: 'Treino intenso/2x dia' },
};

const levelButtons = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback(ACTIVITY_LEVELS.sedentary.label, 'activity_sedentary')],
    [Markup.button.callback(ACTIVITY_LEVELS.light.label, 'activity_light')],
    [Markup.button.callback(ACTIVITY_LEVELS.moderate.label, 'activity_moderate')],
    [Markup.button.callback(ACTIVITY_LEVELS.active.label, 'activity_active')],
    [Markup.button.callback(ACTIVITY_LEVELS.veryActive.label, 'activity_veryActive')],
    [Markup.button.callback('🔙 Voltar', 'back_to_menu')]
  ]);

async function showActivityMenu(ctx) {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nFinalize seu cadastro para ajustar o nível de atividade.');
    return;
  }

  const currentKey = patient.activity_level || 'sedentary';
  const current = ACTIVITY_LEVELS[currentKey] || ACTIVITY_LEVELS.sedentary;

  await ctx.replyWithMarkdown(
    '⚡ *Nível de Atividade*\n\n' +
      `Atual: *${current.label}* (${current.desc})\n\n` +
      '*Opções:*\n' +
      '🏝️ Sedentário — Pouco ou nenhum exercício (x1.2)\n' +
      '🚶 Leve — 1-3x/semana (x1.375)\n' +
      '🏃 Moderado — 3-5x/semana (x1.55)\n' +
      '🔥 Ativo — 6-7x/semana (x1.725)\n' +
      '💪 Muito Ativo — Treino intenso/2x dia (x1.9)\n\n' +
      'Escolha seu nível para recalcular recomendações calóricas:',
    levelButtons()
  );
}

async function selectActivity(ctx, levelKey) {
  await ctx.answerCbQuery();
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nFinalize seu cadastro para ajustar o nível de atividade.');
    return;
  }

  const level = ACTIVITY_LEVELS[levelKey];
  if (!level) return;

  await upsertPatient(ctx.from.id, { ...patient, activity_level: levelKey });

  let tmbText = '';
  if (patient.weight && patient.height && patient.age && patient.gender) {
    const genderCode = patient.gender.toString().toUpperCase().startsWith('M') ? 'male' : 'female';
    const tmb = calculateTMB(patient.weight, patient.height, patient.age, genderCode);
    const daily = calculateDailyCalories(tmb, levelKey);
    tmbText = `\n🔥 TMB: ~${tmb} kcal/dia\n🍽️ Necessidade estimada: ~${daily} kcal/dia`;
  }

  await ctx.replyWithMarkdown(
    '✅ *Nível de atividade atualizado!*\n\n' +
      `Novo nível: *${level.label}* (${level.desc})${tmbText}\n\n` +
      '💡 As recomendações calóricas serão ajustadas com este nível.',
    levelButtons()
  );
}

module.exports = {
  showActivityMenu,
  selectActivity,
};
