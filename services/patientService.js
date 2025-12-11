// Handles patient persistence, plan dates, and formatted outputs shared across controllers.
'use strict';

const { supabase, tableName } = require('../config/supabase');

const PLAN_DURATION_DAYS = 30;
const DATE_LOCALE = 'pt-BR';

// Adds days to a given date while preserving ISO formatting.
const addDays = (date, days) => {
  const cloned = new Date(date.getTime());
  cloned.setUTCDate(cloned.getUTCDate() + days);
  return cloned;
};

const formatDate = (value) => new Date(value).toLocaleDateString(DATE_LOCALE);

// Concede um trial gratuito por N dias a partir de hoje, marcando o plano como ativo.
const grantFreeTrial = async (telegramId, days = PLAN_DURATION_DAYS) => {
  const start = new Date();
  const end = addDays(start, days);

  const { data, error } = await supabase
    .from(tableName)
    .update({
      plan_status: 'active',
      plan_start_date: start.toISOString(),
      plan_end_date: end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId)
    .select('plan_status, plan_end_date')
    .single();

  if (error) {
    console.error('Erro ao aplicar trial:', error);
    return null;
  }

  return data;
};

// Fetches a single patient based on the Telegram user id.
const getPatientByTelegramId = async (telegramId) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar paciente: ${error.message}`);
  }

  return data || null;
};

// Inserts or updates the patient record keeping plan dates in sync.
const upsertPatient = async (telegramId, profile) => {
  const now = new Date();
  const planStart = profile.plan_start_date ? new Date(profile.plan_start_date) : now;
  const planEnd = profile.plan_end_date ? new Date(profile.plan_end_date) : addDays(planStart, PLAN_DURATION_DAYS);

  const payload = {
    telegram_id: telegramId,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    weight: profile.weight,
    height: profile.height,
    objective: profile.objective,
    restrictions: profile.restrictions,
    activity_level: profile.activity_level, // armazena nível escolhido
    plan_start_date: planStart.toISOString(),
    plan_end_date: planEnd.toISOString(),
    updated_at: now.toISOString(),
    created_at: profile.created_at || now.toISOString(),
  };

  const { data, error } = await supabase
    .from(tableName)
    .upsert(payload, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar paciente: ${error.message}`);
  }

  return data;
};

// Formats the patient payload into a markdown-friendly string for Telegram.
const formatPatientProfile = (patient) => {
  if (!patient) {
    return '❌ Nenhum cadastro encontrado.';
  }

  return (
    `━━━━━━━━━━━━━━━━\n` +
    `👤 *Nome:* ${patient.name}\n` +
    `🎂 *Idade:* ${patient.age} anos\n` +
    `⚧ *Sexo:* ${patient.gender || 'Não informado'}\n` +
    `⚖️ *Peso:* ${patient.weight} kg\n` +
    `📏 *Altura:* ${patient.height} cm\n` +
    `🎯 *Objetivo:* ${patient.objective}\n` +
    `🥗 *Restrições:* ${patient.restrictions}\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📅 *Início:* ${formatDate(patient.plan_start_date)}\n` +
    `⏳ *Término:* ${formatDate(patient.plan_end_date)}`
  );
};

// Calculates plan expiration feedback so the menu can alert patients.
const getRenewalInfo = (patient) => {
  if (!patient) {
    return { message: 'Cadastro não encontrado.', daysRemaining: null };
  }

  const today = new Date();
  const endDate = new Date(patient.plan_end_date);
  const diffMs = endDate - today;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const formattedEnd = formatDate(endDate);
  const message = daysRemaining > 0
    ? `✅ *Plano Ativo*\n\nSeu plano encerra em *${daysRemaining} dia(s)*.\n📅 Data: ${formattedEnd}\n\n📞 Entre em contato para renovar antes do vencimento.`
    : `⚠️ *Plano Vencendo Hoje*\n\nSeu plano encerra *hoje* (${formattedEnd}).\n\n📞 Por favor, entre em contato para renovar!`;

  return { message, daysRemaining, endDate };
};

module.exports = {
  getPatientByTelegramId,
  upsertPatient,
  formatPatientProfile,
  getRenewalInfo,
  grantFreeTrial,
};
