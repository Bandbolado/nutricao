// Controlador para recordatório alimentar de 24 horas (recurso premium)
'use strict';

const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');
const { getPatientByTelegramId } = require('../services/patientService');
const { sendMainMenu } = require('./menuController');
const { notifyAdmin } = require('../services/adminService');

// Perguntas do questionário nutricional completo
const foodRecordSteps = [
  { key: 'dados_basicos', question: '1) *Nome, idade, altura e peso atual:*' },
  { key: 'objetivo', question: '2) *Objetivo principal* (ex: emagrecer, ganhar massa, saúde, exames):' },
  { key: 'doencas', question: '3) *Tem alguma doença diagnosticada?*' },
  { key: 'medicamentos', question: '4) *Usa medicamentos ou suplementos? Quais?*' },
  { key: 'cirurgias', question: '5) *Já fez cirurgias? Qual/Quando?*' },
  { key: 'exames', question: '6) *Possui exames recentes?* (Se sim, envie foto ou descreva):' },
  { key: 'rotina', question: '7) *Como é sua rotina diária?* (horários, trabalho, sono):' },
  { key: 'atividade_fisica', question: '8) *Pratica atividade física?* Qual e quantas vezes por semana?' },
  { key: 'refeicoes', question: '9) *Quantas refeições faz por dia e como costuma comer?*' },
  { key: 'alergias', question: '10) *Tem alergias, intolerâncias ou alimentos que evita?*' },
  { key: 'intestino', question: '11) *Como funciona seu intestino?* (frequência, gases, inchaço):' },
  { key: 'alcool', question: '12) *Consome álcool?* Com que frequência?' },
  { key: 'agua', question: '13) *Bebe quanta água por dia?*' },
  { key: 'emocional', question: '14) *Tem ansiedade, compulsão ou belisca muito durante o dia?*' },
  { key: 'preferencias', question: '15) *Que alimentos você mais gosta e menos gosta?*' },
  { key: 'meta_peso', question: '16) *Qual seu peso ideal ou meta desejada?*' },
];

// State machine para gerenciar fluxo do questionário
const foodRecordState = new Map();

// Verifica se paciente pode preencher questionário (plano ativo + limite mensal)
const canFillFoodRecord = async (telegramId) => {
  // 1. Verifica se plano está ativo
  const patient = await getPatientByTelegramId(telegramId);
  if (!patient || patient.plan_status !== 'active') {
    return { 
      allowed: false, 
      reason: 'plan_inactive',
      message: '🔒 *Recurso Premium*\n\nO Questionário Alimentar é exclusivo para planos ativos.\n\n💰 Clique em *Renovar Plano* para ativar seu acesso!'
    };
  }

  // 2. Verifica se já preencheu este mês
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const { data, error } = await supabase
    .from('food_records')
    .select('id, created_at')
    .eq('telegram_id', telegramId)
    .gte('created_at', firstDayOfMonth.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao verificar questionários:', error);
    return { allowed: false, reason: 'error', message: '❌ Erro ao verificar disponibilidade.' };
  }

  if (data && data.length > 0) {
    const lastRecord = new Date(data[0].created_at);
    return {
      allowed: false,
      reason: 'already_filled',
      message: `📝 *Questionário Já Enviado*\n\nVocê já preencheu o questionário deste mês em ${lastRecord.toLocaleDateString('pt-BR')}.\n\n📅 Próximo disponível: ${new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('pt-BR')}`
    };
  }

  return { allowed: true };
};

// Inicia o fluxo do questionário
const startFoodRecord = async (ctx) => {
  const telegramId = ctx.from.id;
  
  // Verifica se pode preencher
  const check = await canFillFoodRecord(telegramId);
  if (!check.allowed) {
    await ctx.replyWithMarkdown(check.message);
    return;
  }

  // Inicia state
  foodRecordState.set(telegramId, { stepIndex: 0, data: {} });
  
  await ctx.replyWithMarkdown(
    '📋 *Questionário Nutricional Completo*\n\n' +
    'São *16 perguntas objetivas* para personalizarmos seu plano.\n\n' +
    '💡 Responda com detalhes. Se algo não se aplica, escreva "Não".'
  );
  
  await askCurrentQuestion(ctx);
};

// Faz a pergunta atual
const askCurrentQuestion = async (ctx) => {
  const state = foodRecordState.get(ctx.from.id);
  if (!state) return;
  
  const step = foodRecordSteps[state.stepIndex];
  await ctx.replyWithMarkdown(step.question);
};

// Processa resposta do usuário
const handleFoodRecordResponse = async (ctx) => {
  const telegramId = ctx.from.id;
  const state = foodRecordState.get(telegramId);
  
  if (!state) {
    return false; // Não está preenchendo questionário
  }

  const step = foodRecordSteps[state.stepIndex];
  const answer = ctx.message.text.trim();
  
  // Valida resposta mínima
  if (answer.length < 2) {
    await ctx.replyWithMarkdown('❌ *Resposta muito curta*\n\nPor favor, seja mais específico.');
    return true;
  }

  // Armazena resposta
  state.data[step.key] = answer;
  state.stepIndex += 1;

  // Verifica se terminou
  if (state.stepIndex >= foodRecordSteps.length) {
    await finalizeFoodRecord(ctx, state.data);
    foodRecordState.delete(telegramId);
    return true;
  }

  // Próxima pergunta
  await askCurrentQuestion(ctx);
  return true;
};

// Salva questionário e notifica nutricionista
const finalizeFoodRecord = async (ctx, data) => {
  const telegramId = ctx.from.id;
  
  try {
    const patient = await getPatientByTelegramId(telegramId);
    
    // Salva no banco
    const { error } = await supabase
      .from('food_records')
      .insert({
        telegram_id: telegramId,
        record_type: 'recordatorio_24h',
        data: data,
      });

    if (error) throw error;

    await ctx.replyWithMarkdown(
      '✅ *Questionário Enviado com Sucesso!*\n\n' +
      `Obrigado, *${patient.name.split(' ')[0]}*!\n\n` +
      '📬 Seu recordatório alimentar foi enviado para a nutricionista.\n\n' +
      '👩‍⚕️ Em breve você receberá o feedback dela.\n\n' +
      '📅 _Próximo questionário disponível no próximo mês._'
    );

    // Notifica admin
    await notifyAdmin(
      ctx.telegram,
      `📝 *Novo Questionário Recebido!*\n\n` +
      `👤 Paciente: *${patient.name}*\n` +
      `📅 Data: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `Acesse /admin → 📝 Questionários para visualizar.`
    );

    await sendMainMenu(ctx, '📋 *Menu Principal*\n\nEscolha uma opção:');
    
  } catch (error) {
    console.error('Erro ao salvar questionário:', error);
    await ctx.reply('❌ Erro ao enviar questionário. Tente novamente mais tarde.');
  }
};

// Cancela preenchimento em andamento
const cancelFoodRecord = (telegramId) => {
  foodRecordState.delete(telegramId);
};

// Mostra histórico de questionários do paciente
const showPatientFoodRecordHistory = async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    const { data: records, error } = await supabase
      .from('food_records')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!records || records.length === 0) {
      await ctx.replyWithMarkdown(
        '📋 *Meus Questionários*\n\n' +
        '❌ Você ainda não enviou nenhum questionário.\n\n' +
        '_Clique em "📝 Enviar Questionário ⭐" para preencher._'
      );
      return;
    }

    let message = `📋 *Meus Questionários* (${records.length})\n\n`;
    message += `_Você pode revisar seus questionários enviados._\n\n`;

    const buttons = [];

    records.forEach((record, idx) => {
      const date = new Date(record.created_at).toLocaleDateString('pt-BR');
      const time = new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      buttons.push([
        Markup.button.callback(
          `${idx + 1}. ${date} às ${time}`,
          `PATIENT_VIEW_FOOD_RECORD_${record.id}`
        )
      ]);
    });

    buttons.push([Markup.button.callback('🔙 Voltar ao Menu', 'BACK_TO_MENU')]);

    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Erro ao buscar questionários:', error);
    await ctx.reply('❌ Erro ao buscar seus questionários.');
  }
};

// Mostra detalhes de um questionário específico do paciente
const showPatientFoodRecordDetails = async (ctx, recordId) => {
  const telegramId = ctx.from.id;

  try {
    const { data: record, error } = await supabase
      .from('food_records')
      .select('*')
      .eq('id', recordId)
      .eq('telegram_id', telegramId) // Garante que só vê o próprio questionário
      .single();

    if (error || !record) {
      await ctx.reply('❌ Questionário não encontrado.');
      return;
    }

    const date = new Date(record.created_at).toLocaleString('pt-BR');
    const data = record.data;

    let message = `📝 *Seu Questionário Nutricional*\n`;
    message += `📅 *Enviado em:* ${date}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    const fields = [
      ['1) Nome, idade, altura e peso atual', data.dados_basicos],
      ['2) Objetivo principal', data.objetivo],
      ['3) Doenças diagnosticadas', data.doencas],
      ['4) Medicamentos/Suplementos', data.medicamentos],
      ['5) Cirurgias (qual/quando)', data.cirurgias],
      ['6) Exames recentes', data.exames],
      ['7) Rotina diária', data.rotina],
      ['8) Atividade física (qual/vezes)', data.atividade_fisica],
      ['9) Refeições por dia e como come', data.refeicoes],
      ['10) Alergias/Intolerâncias/Alimentos que evita', data.alergias],
      ['11) Intestino (frequência/gases/inchaço)', data.intestino],
      ['12) Consumo de álcool', data.alcool],
      ['13) Água por dia', data.agua],
      ['14) Ansiedade/compulsão/beliscar', data.emocional],
      ['15) Alimentos que mais e menos gosta', data.preferencias],
      ['16) Peso ideal/meta', data.meta_peso],
    ];

    fields.forEach(([title, value]) => {
      message += `*${title}:*\n${value || 'Não informado'}\n\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Voltar', 'MENU_FOOD_RECORD_HISTORY')],
    ]);

    await ctx.replyWithMarkdown(message, buttons);
  } catch (error) {
    console.error('Erro ao mostrar questionário:', error);
    await ctx.reply('❌ Erro ao carregar questionário.');
  }
};

module.exports = {
  startFoodRecord,
  handleFoodRecordResponse,
  canFillFoodRecord,
  cancelFoodRecord,
  foodRecordState,
  showPatientFoodRecordHistory,
  showPatientFoodRecordDetails,
};
