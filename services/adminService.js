// Gerencia notificações e comunicação com a nutricionista (admin).
'use strict';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

if (!ADMIN_ID) {
  console.warn('⚠️  ADMIN_TELEGRAM_ID não configurado. Notificações de admin desabilitadas.');
}

const isAdmin = (telegramId) => ADMIN_ID && String(telegramId) === String(ADMIN_ID);

const getAdminId = () => ADMIN_ID;

// Notifica admin sobre novo cadastro de paciente.
const notifyNewPatient = async (bot, patient) => {
  if (!ADMIN_ID) return;

  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      '🆕 *Novo Paciente Cadastrado*\n\n' +
      `👤 *Nome:* ${patient.name}\n` +
      `🆔 *ID:* ${patient.telegram_id}\n` +
      `🎂 *Idade:* ${patient.age} anos\n` +
      `⚖️ *Peso:* ${patient.weight} kg\n` +
      `📏 *Altura:* ${patient.height} cm\n` +
      `🎯 *Objetivo:* ${patient.objective}\n` +
      `🥗 *Restrições:* ${patient.restrictions}\n` +
      `📅 *Plano até:* ${new Date(patient.plan_end_date).toLocaleDateString('pt-BR')}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Erro ao notificar admin sobre novo paciente:', error);
  }
};

// Notifica admin sobre upload de arquivo.
const notifyFileUpload = async (bot, telegramId, patientName, fileName, fileUrl) => {
  if (!ADMIN_ID) return;

  try {
    await bot.telegram.sendMessage(
      ADMIN_ID,
      '📁 *Arquivo Recebido*\n\n' +
      `👤 *Paciente:* ${patientName}\n` +
      `🆔 *ID:* ${telegramId}\n` +
      `📄 *Arquivo:* ${fileName}\n` +
      `🔗 [Ver arquivo](${fileUrl})`,
      { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
  } catch (error) {
    console.error('Erro ao notificar admin sobre arquivo:', error);
  }
};

// Envia lista de pacientes com planos vencendo nos próximos dias.
const notifyExpiringPlans = async (bot, patients, daysThreshold = 7) => {
  if (!ADMIN_ID || !patients || patients.length === 0) return;

  try {
    let message = `⚠️ *Planos Vencendo em ${daysThreshold} Dias*\n\n`;
    
    patients.forEach((patient, index) => {
      const daysLeft = Math.ceil((new Date(patient.plan_end_date) - new Date()) / (1000 * 60 * 60 * 24));
      message += `${index + 1}. ${patient.name} - ${daysLeft} dia(s)\n`;
    });

    await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao notificar admin sobre planos vencendo:', error);
  }
};

// Envia estatísticas gerais dos pacientes.
const sendDashboardStats = async (replyFn, stats) => {
  try {
    await replyFn(
      '📊 *Dashboard - Estatísticas*\n\n' +
      `👥 *Total de Pacientes:* ${stats.totalPatients}\n` +
      `✅ *Planos Ativos:* ${stats.activePlans}\n` +
      `⚠️ *Vencendo em 7 dias:* ${stats.expiringSoon}\n` +
      `❌ *Planos Vencidos:* ${stats.expired}\n` +
      `📁 *Arquivos Enviados:* ${stats.totalFiles}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Erro ao enviar estatísticas:', error);
  }
};

// Notifica admin (genérico)
const notifyAdmin = async (telegram, message) => {
  if (!ADMIN_ID) return;

  try {
    await telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao notificar admin:', error);
  }
};

module.exports = {
  isAdmin,
  getAdminId,
  notifyNewPatient,
  notifyFileUpload,
  notifyExpiringPlans,
  sendDashboardStats,
  notifyAdmin,
};
