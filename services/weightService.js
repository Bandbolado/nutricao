// Gerencia histórico e evolução de peso dos pacientes.
'use strict';

const { supabase } = require('../config/supabase');

const WEIGHT_HISTORY_TABLE = 'weight_history';

// Adiciona novo registro de peso.
const addWeightEntry = async (telegramId, weight, notes = null) => {
  const { data, error } = await supabase
    .from(WEIGHT_HISTORY_TABLE)
    .insert({
      telegram_id: telegramId,
      weight,
      notes,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao registrar peso: ${error.message}`);
  }

  return data;
};

// Busca histórico completo de peso do paciente.
const getWeightHistory = async (telegramId) => {
  const { data, error } = await supabase
    .from(WEIGHT_HISTORY_TABLE)
    .select('*')
    .eq('telegram_id', telegramId)
    .order('recorded_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar histórico: ${error.message}`);
  }

  return data || [];
};

// Calcula estatísticas de evolução de peso.
const calculateWeightStats = (history, currentWeight) => {
  if (!history || history.length === 0) {
    return {
      hasHistory: false,
      totalEntries: 0,
    };
  }

  const firstEntry = history[0];
  const lastEntry = history[history.length - 1];
  
  const startWeight = firstEntry.weight;
  const latestWeight = currentWeight || lastEntry.weight;
  
  const totalChange = latestWeight - startWeight;
  const percentChange = ((totalChange / startWeight) * 100).toFixed(1);
  
  // Calcula média de perda/ganho por semana
  const firstDate = new Date(firstEntry.recorded_at);
  const lastDate = new Date(lastEntry.recorded_at);
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  const weeksDiff = Math.max(daysDiff / 7, 0.1);
  const avgPerWeek = (totalChange / weeksDiff).toFixed(2);

  return {
    hasHistory: true,
    totalEntries: history.length,
    startWeight,
    latestWeight,
    totalChange: parseFloat(totalChange.toFixed(1)),
    percentChange: parseFloat(percentChange),
    avgPerWeek: parseFloat(avgPerWeek),
    daysSinceStart: Math.round(daysDiff),
  };
};

// Formata o histórico de peso para exibição no Telegram.
const formatWeightHistory = (history, stats) => {
  if (!stats.hasHistory) {
    return (
      '📊 *Histórico de Peso*\n\n' +
      '📭 Você ainda não possui registros de peso.\n\n' +
      'Use o botão abaixo para adicionar seu primeiro peso!'
    );
  }

  const changeEmoji = stats.totalChange > 0 ? '📈' : stats.totalChange < 0 ? '📉' : '➡️';
  const changeText = stats.totalChange > 0 ? 'ganho' : stats.totalChange < 0 ? 'perda' : 'sem alteração';
  
  let message = (
    '📊 *Histórico de Evolução de Peso*\n\n' +
    '═══════════════════\n' +
    `⚖️ *Peso Inicial:* ${stats.startWeight} kg\n` +
    `📍 *Peso Atual:* ${stats.latestWeight} kg\n` +
    `${changeEmoji} *Variação:* ${stats.totalChange > 0 ? '+' : ''}${stats.totalChange} kg (${stats.percentChange}%)\n` +
    `📅 *Tempo:* ${stats.daysSinceStart} dias\n` +
    `📈 *Média/semana:* ${stats.avgPerWeek > 0 ? '+' : ''}${stats.avgPerWeek} kg\n` +
    '═══════════════════\n\n' +
    `📝 *Registros (${stats.totalEntries}):*\n\n`
  );

  // Mostra últimos 10 registros
  const recentHistory = history.slice(-10);
  recentHistory.forEach((entry, index) => {
    const date = new Date(entry.recorded_at).toLocaleDateString('pt-BR');
    const time = new Date(entry.recorded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    message += `${index + 1}. ${entry.weight} kg - ${date} ${time}\n`;
    if (entry.notes) {
      message += `   💬 _${entry.notes}_\n`;
    }
  });

  if (history.length > 10) {
    message += `\n_... e mais ${history.length - 10} registro(s)_`;
  }

  return message;
};

module.exports = {
  addWeightEntry,
  getWeightHistory,
  calculateWeightStats,
  formatWeightHistory,
};
