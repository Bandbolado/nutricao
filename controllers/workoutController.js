'use strict';

const { Markup } = require('telegraf');
const OpenAI = require('openai');

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const workoutState = new Map();

const LEVELS = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado'
};

const MUSCLE_GROUPS = {
  fullbody: 'Corpo inteiro',
  peito: 'Peito',
  costas: 'Costas',
  pernas: 'Pernas (quadríceps)',
  posterior: 'Posterior/Glúteos',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core/Abdômen',
  hiit: 'HIIT/Cardio',
  peito_triceps: 'Peito + Tríceps (conjugado)',
  costas_biceps: 'Costas + Bíceps (conjugado)',
  ombros_trapezio: 'Ombros + Trapézio (conjugado)',
  pernas_gluteo: 'Pernas + Glúteo (conjugado)'
};

const TRAINING_TYPES = {
  piramide: 'Pirâmide',
  gvt: 'GVT (10x10)',
  circuito: 'Circuito',
  fullbody: 'Full Body',
  push_pull_legs: 'Push/Pull/Legs',
  upper_lower: 'Upper/Lower',
  hiit_forca: 'HIIT + Força',
  five_by_five: 'Força 5x5'
};

const EXERCISE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const chunkButtons = (buttons, size = 2) => {
  const rows = [];
  for (let i = 0; i < buttons.length; i += size) {
    rows.push(buttons.slice(i, i + size));
  }
  return rows;
};

const resetState = (telegramId) => workoutState.delete(telegramId);

async function startWorkoutFlow(ctx) {
  const telegramId = ctx.from.id;
  resetState(telegramId);

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🟢 Iniciante', 'workout_level_iniciante'),
      Markup.button.callback('🟡 Intermediário', 'workout_level_intermediario')
    ],
    [Markup.button.callback('🔴 Avançado', 'workout_level_avancado')],
    [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
  ]);

  await ctx.replyWithMarkdown(
    '🏋️ *Gerar Treino Personalizado*\n\n' +
      'Vamos montar seu treino em poucos passos:\n' +
      '1) Nível\n2) Grupamento (inclui conjugados ex: Peito + Tríceps)\n3) Tipo de treino\n4) Séries\n\n' +
      'Escolha o seu nível:',
    keyboard
  );
}

async function selectLevel(ctx, levelKey) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  if (!LEVELS[levelKey]) return;

  workoutState.set(telegramId, { level: LEVELS[levelKey] });

  const buttons = Object.entries(MUSCLE_GROUPS).map(([key, label]) =>
    Markup.button.callback(label, `workout_group_${key}`)
  );

  const keyboard = Markup.inlineKeyboard([
    ...chunkButtons(buttons, 2),
    [Markup.button.callback('🔁 Recomeçar', 'workout_restart')]
  ]);

  await ctx.editMessageText(
    `Nível escolhido: ${LEVELS[levelKey]}\n\nAgora selecione o grupamento que deseja treinar:`,
    keyboard
  );
}

async function selectGroup(ctx, groupKey) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  const state = workoutState.get(telegramId);
  if (!state || !MUSCLE_GROUPS[groupKey]) return;

  workoutState.set(telegramId, { ...state, group: MUSCLE_GROUPS[groupKey] });

  const buttons = Object.entries(TRAINING_TYPES).map(([key, label]) =>
    Markup.button.callback(label, `workout_type_${key}`)
  );

  const keyboard = Markup.inlineKeyboard([
    ...chunkButtons(buttons, 2),
    [Markup.button.callback('🔁 Recomeçar', 'workout_restart')]
  ]);

  await ctx.editMessageText(
    `Grupamento: ${MUSCLE_GROUPS[groupKey]}\n\nEscolha o tipo de treino:`,
    keyboard
  );
}

async function selectTrainingType(ctx, typeKey) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  const state = workoutState.get(telegramId);
  if (!state || !TRAINING_TYPES[typeKey]) return;

  workoutState.set(telegramId, { ...state, trainingType: TRAINING_TYPES[typeKey] });

  const buttons = EXERCISE_OPTIONS.map((n) => Markup.button.callback(`${n} exercícios`, `workout_exercises_${n}`));

  const keyboard = Markup.inlineKeyboard([
    ...chunkButtons(buttons, 3),
    [Markup.button.callback('🔁 Recomeçar', 'workout_restart')]
  ]);

  await ctx.editMessageText(
    `Tipo: ${TRAINING_TYPES[typeKey]}\n\nQuantos exercícios quer no treino?\n\n⏳ Leva cerca de 30s para gerar. Clique apenas 1 vez e aguarde.`,
    keyboard
  );
}

async function selectExercises(ctx, exercisesValue) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from.id;
  const state = workoutState.get(telegramId);
  if (!state || !EXERCISE_OPTIONS.includes(exercisesValue)) return;

  workoutState.set(telegramId, { ...state, exercises: exercisesValue });
  await generateWorkout(ctx, telegramId);
}

async function generateWorkout(ctx, telegramId) {
  const state = workoutState.get(telegramId);

  if (!state || !state.level || !state.group || !state.trainingType || !state.exercises) {
    await ctx.reply('❌ Não consegui entender todas as escolhas. Toque em "Gerar treino" para recomeçar.');
    return;
  }

  if (!openaiClient) {
    await ctx.reply(
      '❌ OPENAI_API_KEY não configurada. Adicione as variáveis OPENAI_API_KEY e OPENAI_MODEL no .env e reinicie o bot.'
    );
    return;
  }

  const prompt = [
    'Gere um treino de musculação em português, com Markdown limpo e espaçado.',
    `Nível: ${state.level}.`,
    `Grupamento principal ou conjugado: ${state.group}.`,
    `Estratégia: ${state.trainingType}.`,
    `Quantidade de exercícios: ${state.exercises}.`,
    'Formato desejado (sem tabelas):',
    '## 🔥 Aquecimento (2 bullets curtos)',
    '- Nome — 1-2 séries — 12-15 reps — 30-45s descanso',
    '- Nome — 1-2 séries — 12-15 reps — 30-45s descanso',
    '',
    '## 🏋️ Treino Principal',
    '- Nome — séries x reps — descanso — dica curta de execução',
    '- Repita até atingir o total de exercícios solicitado',
    '',
    '## ✅ Finalização',
    '- Alongamento ou respiração — 2-3 min',
    '',
    '## ⚠️ Dica de segurança',
    '- 1 bullet curta e prática',
    '',
    'Use bullets, deixe linhas em branco entre seções, não use tabelas nem blocos enormes.'
  ].join(' ');

  try {
    const completion = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 750,
      messages: [
        {
          role: 'system',
          content:
            'Você é um personal trainer que escreve treinos claros, seguros e profissionais em Markdown. Separe seções com linhas em branco, use bullets, sem tabelas.'
        },
        { role: 'user', content: prompt }
      ]
    });

    const plan = completion.choices?.[0]?.message?.content?.trim();

    if (!plan) {
      throw new Error('Resposta vazia do modelo');
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔁 Novo treino', 'workout_restart')],
      [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
    ]);

    await ctx.replyWithMarkdown(
      '🏋️ *Treino gerado!*\n\n' +
        `*Nível:* ${state.level}\n` +
        `*Grupamento:* ${state.group}\n` +
        `*Estratégia:* ${state.trainingType}\n` +
        `*Exercícios no treino:* ${state.exercises}\n\n` +
        'Confira o plano abaixo:'
    );

    await ctx.replyWithMarkdown(plan, keyboard);

  } catch (error) {
    console.error('Erro ao gerar treino com OpenAI:', error);
    await ctx.reply('❌ Não consegui gerar o treino agora. Tente novamente em instantes.');
  } finally {
    resetState(telegramId);
  }
}

module.exports = {
  startWorkoutFlow,
  selectLevel,
  selectGroup,
  selectTrainingType,
  selectExercises
};
