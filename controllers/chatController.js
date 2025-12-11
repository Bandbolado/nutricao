// Controlador de chat entre paciente e nutricionista.
'use strict';

const { getPatientByTelegramId } = require('../services/patientService');
const { getAdminId } = require('../services/adminService');
const { MESSAGES } = require('../config/messages');
const chatService = require('../services/chatService');

// Estado para rastrear quem está no modo chat.
const chatState = new Map();

// Inicia modo chat para o paciente.
const startChat = async (ctx) => {
  const patient = await getPatientByTelegramId(ctx.from.id);
  
  if (!patient) {
    await ctx.reply(MESSAGES.REGISTRATION_NOT_FOUND);
    return;
  }

  chatState.set(ctx.from.id, { active: true });

  await ctx.replyWithMarkdown(MESSAGES.CHAT_START);
};

// Encaminha mensagem do paciente para admin.
const forwardPatientMessage = async (ctx, bot) => {
  const state = chatState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) return false;

  const adminId = getAdminId();
  const messageText = ctx.message.text;

  try {
    // Salva mensagem no histórico
    await chatService.saveMessage(ctx.from.id, 'patient', 'text', messageText);

    // Busca contagem de não lidas
    const unreadCount = await chatService.getUnreadCount(ctx.from.id);
    const unreadBadge = unreadCount > 1 ? ` 🔴${unreadCount}` : '';

    const { Markup } = require('telegraf');
    await bot.telegram.sendMessage(
      adminId,
      `💬 *Nova Mensagem${unreadBadge}*\n\n` +
      `👤 *${patient.name}*\n` +
      `🆔 ID: ${ctx.from.id}\n` +
      `📞 @${ctx.from.username || 'sem username'}\n\n` +
      `📩 _"${messageText}"_`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Responder', callback_data: `ADMIN_REPLY_${ctx.from.id}` }],
            [{ text: '📋 Ver Histórico', callback_data: `ADMIN_CHAT_HISTORY_${ctx.from.id}` }],
            [{ text: '🔴 Encerrar Conversa', callback_data: `ADMIN_END_CHAT_${ctx.from.id}` }]
          ]
        }
      }
    );

    await ctx.reply(MESSAGES.CHAT_MESSAGE_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao encaminhar mensagem:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Encaminha foto do paciente para admin.
const forwardPatientPhoto = async (ctx, bot) => {
  const state = chatState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) return false;

  const adminId = getAdminId();
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = ctx.message.caption || '';

  try {
    // Salva foto no histórico
    await chatService.saveMessage(ctx.from.id, 'patient', 'photo', caption, photo.file_id);

    const unreadCount = await chatService.getUnreadCount(ctx.from.id);
    const unreadBadge = unreadCount > 1 ? ` 🔴${unreadCount}` : '';

    await bot.telegram.sendPhoto(
      adminId,
      photo.file_id,
      {
        caption: `💬 *Nova Foto${unreadBadge}*\n\n` +
          `👤 *${patient.name}*\n` +
          `🆔 ID: ${ctx.from.id}\n` +
          `📞 @${ctx.from.username || 'sem username'}\n\n` +
          (caption ? `📝 _"${caption}"_` : ''),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Responder', callback_data: `ADMIN_REPLY_${ctx.from.id}` }],
            [{ text: '📋 Ver Histórico', callback_data: `ADMIN_CHAT_HISTORY_${ctx.from.id}` }],
            [{ text: '🔴 Encerrar Conversa', callback_data: `ADMIN_END_CHAT_${ctx.from.id}` }]
          ]
        }
      }
    );

    await ctx.reply(MESSAGES.CHAT_PHOTO_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao encaminhar foto:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Encaminha documento do paciente para admin.
const forwardPatientDocument = async (ctx, bot) => {
  const state = chatState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patient = await getPatientByTelegramId(ctx.from.id);
  if (!patient) return false;

  const adminId = getAdminId();
  const document = ctx.message.document;
  const caption = ctx.message.caption || '';

  try {
    // Salva documento no histórico
    await chatService.saveMessage(ctx.from.id, 'patient', 'document', caption, document.file_id, document.file_name);

    const unreadCount = await chatService.getUnreadCount(ctx.from.id);
    const unreadBadge = unreadCount > 1 ? ` 🔴${unreadCount}` : '';

    await bot.telegram.sendDocument(
      adminId,
      document.file_id,
      {
        caption: `💬 *Novo Documento${unreadBadge}*\n\n` +
          `👤 *${patient.name}*\n` +
          `🆔 ID: ${ctx.from.id}\n` +
          `📞 @${ctx.from.username || 'sem username'}\n\n` +
          (caption ? `📝 _"${caption}"_` : ''),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Responder', callback_data: `ADMIN_REPLY_${ctx.from.id}` }],
            [{ text: '📋 Ver Histórico', callback_data: `ADMIN_CHAT_HISTORY_${ctx.from.id}` }],
            [{ text: '🔴 Encerrar Conversa', callback_data: `ADMIN_END_CHAT_${ctx.from.id}` }]
          ]
        }
      }
    );

    await ctx.reply(MESSAGES.CHAT_DOCUMENT_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao encaminhar documento:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Para o modo chat.
const stopChat = (userId) => {
  chatState.delete(userId);
};

// Encerra chat do paciente e notifica a nutricionista.
const endChatByPatient = async (bot, patientId) => {
  const patient = await getPatientByTelegramId(patientId);
  const patientName = patient ? patient.name : 'Paciente';
  
  chatState.delete(patientId);
  
  const adminId = getAdminId();
  
  try {
    // Notifica admin
    await bot.telegram.sendMessage(
      adminId,
      `🔴 *Conversa Encerrada*\n\n` +
      `👤 *${patientName}* (ID: ${patientId}) encerrou a conversa.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Erro ao notificar admin:', error);
  }
};

// Encerra modo resposta do admin e notifica o paciente.
const endAdminReply = async (bot, adminId, patientId) => {
  adminReplyState.delete(adminId);
  
  const patient = await getPatientByTelegramId(patientId);
  const patientName = patient ? patient.name : 'Paciente';
  
  try {
    // Notifica paciente
    await bot.telegram.sendMessage(
      patientId,
      MESSAGES.CHAT_ENDED_BY_NUTRITIONIST,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Erro ao notificar paciente:', error);
  }
};

// Estado para rastrear admin respondendo.
const adminReplyState = new Map();

// Inicia modo de resposta para admin.
const startAdminReply = async (ctx, patientId) => {
  adminReplyState.set(ctx.from.id, { patientId, active: true });

  const patient = await getPatientByTelegramId(patientId);
  const patientName = patient ? patient.name : 'Paciente';

  await ctx.replyWithMarkdown(MESSAGES.ADMIN_REPLY_START(patientName));
};

// Encerra chat do paciente.
const endPatientChat = async (ctx, bot, patientId) => {
  chatState.delete(parseInt(patientId));

  const patient = await getPatientByTelegramId(patientId);
  const patientName = patient ? patient.name : 'Paciente';

  try {
    await bot.telegram.sendMessage(
      patientId,
      '🔴 *Conversa Encerrada*\n\n' +
      'A nutricionista encerrou a conversa.\n' +
      'Use /menu para acessar outras opções.',
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(`✅ Conversa com ${patientName} encerrada.`);
  } catch (error) {
    console.error('Erro ao encerrar chat:', error);
    await ctx.reply('❌ Erro ao encerrar conversa.');
  }
};

// Envia resposta do admin para paciente.
const sendAdminReply = async (ctx, bot) => {
  const state = adminReplyState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patientId = state.patientId;
  adminReplyState.delete(ctx.from.id);

  try {
    // Salva no histórico
    await chatService.saveMessage(patientId, 'nutritionist', 'text', ctx.message.text);

    await bot.telegram.sendMessage(
      patientId,
      `💬 *Mensagem da Nutricionista*\n\n${ctx.message.text}`,
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(MESSAGES.ADMIN_REPLY_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao enviar resposta:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Envia foto de resposta do admin.
const sendAdminPhotoReply = async (ctx, bot) => {
  const state = adminReplyState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patientId = state.patientId;
  adminReplyState.delete(ctx.from.id);

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = ctx.message.caption || '';

  try {
    // Salva no histórico
    await chatService.saveMessage(patientId, 'nutritionist', 'photo', caption, photo.file_id);

    await bot.telegram.sendPhoto(
      patientId,
      photo.file_id,
      {
        caption: `💬 *Foto da Nutricionista*\n\n${caption}`,
        parse_mode: 'Markdown'
      }
    );

    await ctx.reply(MESSAGES.ADMIN_PHOTO_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao enviar foto:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Envia documento de resposta do admin.
const sendAdminDocumentReply = async (ctx, bot) => {
  const state = adminReplyState.get(ctx.from.id);
  if (!state || !state.active) return false;

  const patientId = state.patientId;
  adminReplyState.delete(ctx.from.id);

  const document = ctx.message.document;
  const caption = ctx.message.caption || '';

  try {
    // Salva no histórico
    await chatService.saveMessage(patientId, 'nutritionist', 'document', caption, document.file_id, document.file_name);

    await bot.telegram.sendDocument(
      patientId,
      document.file_id,
      {
        caption: `💬 *Documento da Nutricionista*\n\n${caption}`,
        parse_mode: 'Markdown'
      }
    );

    await ctx.reply(MESSAGES.ADMIN_DOCUMENT_SENT);
    return true;
  } catch (error) {
    console.error('Erro ao enviar documento:', error);
    await ctx.reply(MESSAGES.CHAT_ERROR);
    return false;
  }
};

// Mostra histórico de conversa com um paciente
const showChatHistory = async (ctx, patientId) => {
  try {
    const patient = await getPatientByTelegramId(parseInt(patientId));
    if (!patient) {
      await ctx.answerCbQuery('Paciente não encontrado');
      return;
    }

    await ctx.answerCbQuery();

    const messages = await chatService.getPatientMessages(parseInt(patientId), 30);
    const history = chatService.formatChatHistory(messages);

    const { Markup } = require('telegraf');
    await ctx.replyWithMarkdown(
      `💬 *Conversa com ${patient.name}*\n\n${history}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('↩️ Responder', `ADMIN_REPLY_${patientId}`)],
        [Markup.button.callback('🔙 Voltar', 'ADMIN_MENU')]
      ])
    );
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    await ctx.reply('❌ Erro ao buscar histórico da conversa.');
  }
};

module.exports = {
  startChat,
  forwardPatientMessage,
  forwardPatientPhoto,
  forwardPatientDocument,
  stopChat,
  endChatByPatient,
  endAdminReply,
  chatState,
  startAdminReply,
  endPatientChat,
  sendAdminReply,
  sendAdminPhotoReply,
  sendAdminDocumentReply,
  showChatHistory,
  adminReplyState,
};
