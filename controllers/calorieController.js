'use strict';

const OpenAI = require('openai');
const { getPatientByTelegramId } = require('../services/patientService');
const { calculateTMB, calculateDailyCalories } = require('../utils/nutritionCalculator');
const { supabase } = require('../config/supabase');

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Estado de sessão (mensagem corrente)
const calorieState = new Map();

const todayKey = () => new Date().toISOString().slice(0, 10);

const getConsumedToday = async (telegramId) => {
  const { data, error } = await supabase
    .from('food_calories')
    .select('total_kcal')
    .eq('telegram_id', telegramId)
    .eq('entry_date', todayKey());

  if (error) {
    console.error('Erro ao buscar total diário:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + Number(row.total_kcal || 0), 0);
};

const insertFoodEntry = async (telegramId, entryText, items, totalKcal) => {
  const { error } = await supabase.from('food_calories').insert({
    telegram_id: telegramId,
    entry_date: todayKey(),
    entry_text: entryText,
    items,
    total_kcal: totalKcal,
  });

  if (error) throw error;
};

// Extrai JSON de uma resposta do modelo
const extractJson = (text) => {
  if (!text) return null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
};

async function showCalorieInput(ctx) {
  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) {
    await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nFinalize o cadastro para usar o registro de alimentos.');
    return;
  }

  if (!patient.weight || !patient.height || !patient.age || !patient.gender) {
    await ctx.replyWithMarkdown(
      '❌ *Dados incompletos*\n\nInforme peso, altura, idade e sexo no cadastro para calcular seu alvo diário.'
    );
    return;
  }

  const gender = patient.gender === 'Masculino' ? 'male' : 'female';
  const activityLevel = patient.activity_level || 'sedentary';
  const tmb = calculateTMB(patient.weight, patient.height, patient.age, gender);
  const target = calculateDailyCalories(tmb, activityLevel);

  const consumedToday = await getConsumedToday(ctx.from.id);
  const remaining = target - consumedToday;

  calorieState.set(ctx.from.id, { target, startedAt: Date.now() });

  await ctx.replyWithMarkdown(
    '🍽️ *Registrar Alimentos (Kcal)*\n\n' +
      `Meta estimada hoje: *~${target} kcal* (nível: ${activityLevel}).\n` +
      `Já consumido hoje: *${consumedToday} kcal*\n` +
      `Restante: *${remaining >= 0 ? remaining : 0} kcal*\n\n` +
      'Envie os alimentos neste formato:\n' +
      '`100g de arroz branco; 200g de frango grelhado; 1 banana média`\n\n' +
      'Vou estimar as calorias e mostrar quanto resta do seu alvo.'
  );
}

async function handleCalorieLogMessage(ctx) {
  const state = calorieState.get(ctx.from.id);
  if (!state) return false; // Não está no fluxo

  // Timeout de 10 minutos
  if (Date.now() - state.startedAt > 10 * 60 * 1000) {
    calorieState.delete(ctx.from.id);
    await ctx.reply('⏱️ Sessão expirada. Toque em Registrar Alimentos novamente.');
    return true;
  }

  if (!openaiClient) {
    await ctx.replyWithMarkdown(
      '❌ OPENAI_API_KEY não configurada. Adicione OPENAI_API_KEY/OPENAI_MODEL no .env e reinicie o bot.'
    );
    calorieState.delete(ctx.from.id);
    return true;
  }

  const prompt = [
    {
      role: 'system',
      content:
        'Você é um nutricionista. Receba uma lista de alimentos com quantidades em gramas ou unidades. Retorne JSON com calorias estimadas por item e total. Use chaves: items (array de {name, kcal}), total_kcal (number). Responda apenas JSON.'
    },
    {
      role: 'user',
      content: ctx.message.text
    }
  ];

  await ctx.reply('⏳ Calculando calorias...');

  try {
    const completion = await openaiClient.chat.completions.create({
      model: MODEL,
      messages: prompt,
      temperature: 0.2,
      max_tokens: 300
    });

    const content = completion.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);

    if (!parsed || typeof parsed.total_kcal !== 'number') {
      await ctx.reply('❌ Não consegui calcular. Tente detalhar quantidades e alimentos.');
      return true;
    }

    const total = Math.round(parsed.total_kcal);

    // Recalcula target baseado no paciente (caso estado tenha expirado)
    const patient = await getPatientByTelegramId(ctx.from.id);
    const gender = patient?.gender === 'Masculino' ? 'male' : 'female';
    const activityLevel = patient?.activity_level || 'sedentary';
    const tmb = patient ? calculateTMB(patient.weight, patient.height, patient.age, gender) : state.target;
    const target = patient ? calculateDailyCalories(tmb, activityLevel) : state.target;

    // Persiste no Supabase
    await insertFoodEntry(ctx.from.id, ctx.message.text, parsed.items || null, total);

    const updatedTotal = await getConsumedToday(ctx.from.id);
    const remaining = target - updatedTotal;

    let summary = '✅ *Calorias estimadas*\n\n';
    summary += parsed.items
      ? parsed.items
          .map((item) => `• ${item.name || 'Item'}: ${Math.round(item.kcal || 0)} kcal`)
          .join('\n') + '\n\n'
      : '';
    summary += `Registro agora: *${total} kcal*\n`;
    summary += `Consumido hoje: *${updatedTotal} kcal*\n`;
    summary += `Meta diária: ~${target} kcal\n`;
    summary += remaining >= 0
      ? `Restam hoje: ~${remaining} kcal`
      : `Ultrapassou hoje: ~${Math.abs(remaining)} kcal`;

    await ctx.replyWithMarkdown(summary);
  } catch (error) {
    console.error('Erro ao calcular calorias com OpenAI:', error);
    await ctx.reply('❌ Erro ao calcular calorias. Tente novamente em instantes.');
  } finally {
    calorieState.delete(ctx.from.id);
  }

  return true;
}

module.exports = {
  showCalorieInput,
  handleCalorieLogMessage,
  // Retorna stats diários: meta estimada, consumido e restante
  async getDailyStats(telegramId) {
    const patient = await getPatientByTelegramId(telegramId);
    if (!patient || !patient.weight || !patient.height || !patient.age || !patient.gender) {
      return null;
    }

    const gender = patient.gender === 'Masculino' ? 'male' : 'female';
    const activityLevel = patient.activity_level || 'sedentary';
    const tmb = calculateTMB(patient.weight, patient.height, patient.age, gender);
    const target = calculateDailyCalories(tmb, activityLevel);
    const consumed = await getConsumedToday(telegramId);
    const remaining = target - consumed;

    return { target, consumed, remaining, activityLevel };
  },
};
