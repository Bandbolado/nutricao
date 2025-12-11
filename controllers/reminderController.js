// Controlador de lembretes para pacientes.
'use strict';

const { Markup } = require('telegraf');
const reminderService = require('../services/reminderService');

// Estado para criação de lembretes customizados.
const reminderCreationState = new Map();

// Mostra menu de lembretes.
const showRemindersMenu = async (ctx) => {
  const reminders = await reminderService.getPatientReminders(ctx.from.id);
  const message = reminderService.formatRemindersList(reminders);

  await ctx.replyWithMarkdown(
    message,
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Criar Lembrete', 'CREATE_REMINDER')],
      [Markup.button.callback('🗑️ Cancelar Lembretes', 'CANCEL_REMINDERS')],
      [Markup.button.callback('🔙 Voltar', 'BACK_TO_MENU')],
    ])
  );
};

// Inicia criação de lembrete customizado.
const startReminderCreation = async (ctx) => {
  reminderCreationState.set(ctx.from.id, { step: 'message' });

  await ctx.replyWithMarkdown(
    '📝 *Criar Novo Lembrete*\n\n' +
    'Passo 1/2: Digite a mensagem do lembrete.\n\n' +
    '💡 _Exemplo: Tomar suplemento X_'
  );
};

// Mostra menu de cancelamento.
const showCancelMenu = async (ctx) => {
  const reminders = await reminderService.getPatientReminders(ctx.from.id);

  if (!reminders || reminders.length === 0) {
    await ctx.reply('📭 Você não tem lembretes para cancelar.');
    return;
  }

  const buttons = reminders.map((reminder, idx) => {
    const date = new Date(reminder.scheduled_for);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const label = `${idx + 1}. ${reminder.message.substring(0, 30)}... (${dateStr})`;
    return [Markup.button.callback(label, `CANCEL_REMINDER_${reminder.id}`)];
  });

  buttons.push([Markup.button.callback('🔙 Voltar', 'VIEW_REMINDERS')]);

  await ctx.replyWithMarkdown(
    '🗑️ *Cancelar Lembrete*\n\n' +
    'Escolha qual lembrete deseja cancelar:',
    Markup.inlineKeyboard(buttons)
  );
};

// Cancela um lembrete específico.
const cancelReminder = async (ctx, reminderId) => {
  const success = await reminderService.deleteReminder(reminderId);

  if (success) {
    await ctx.reply('✅ Lembrete cancelado com sucesso!');
    await showRemindersMenu(ctx);
  } else {
    await ctx.reply('❌ Erro ao cancelar lembrete.');
  }
};

// Processa mensagem na criação de lembrete.
const handleReminderCreation = async (ctx) => {
  const state = reminderCreationState.get(ctx.from.id);
  if (!state) return false;

  if (state.step === 'message') {
    // Salva mensagem e pede data
    state.message = ctx.message.text;
    state.step = 'date';
    reminderCreationState.set(ctx.from.id, state);

    await ctx.replyWithMarkdown(
      '📅 *Criar Novo Lembrete*\n\n' +
      'Passo 2/2: Digite a data e hora do lembrete.\n\n' +
      '💡 _Formato: DD/MM/AAAA HH:MM_\n' +
      '📝 _Exemplo: 25/11/2025 14:30_'
    );
    return true;
  }

  if (state.step === 'date') {
    // Processa data e cria lembrete
    const text = ctx.message.text.trim();
    const regex = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/;
    const match = text.match(regex);

    if (!match) {
      await ctx.reply('❌ Formato inválido. Use: DD/MM/AAAA HH:MM\nExemplo: 25/11/2025 14:30');
      return true;
    }

    const [, day, month, year, hour, minute] = match;
    const scheduledDate = new Date(year, month - 1, day, hour, minute);
    const now = new Date();

    if (scheduledDate <= now) {
      await ctx.reply('❌ A data deve ser no futuro!');
      return true;
    }

    // Cria o lembrete
    const result = await reminderService.createReminder(
      ctx.from.id,
      reminderService.REMINDER_TYPES.CUSTOM,
      state.message,
      scheduledDate.toISOString()
    );

    reminderCreationState.delete(ctx.from.id);

    if (result.success) {
      const dateStr = scheduledDate.toLocaleDateString('pt-BR');
      const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      await ctx.replyWithMarkdown(
        '✅ *Lembrete criado com sucesso!*\n\n' +
        `📝 ${state.message}\n` +
        `📅 ${dateStr} às ${timeStr}`
      );
      await showRemindersMenu(ctx);
    } else {
      await ctx.reply('❌ Erro ao criar lembrete. Tente novamente.');
    }

    return true;
  }

  return false;
};

module.exports = {
  showRemindersMenu,
  startReminderCreation,
  showCancelMenu,
  cancelReminder,
  handleReminderCreation,
  reminderCreationState,
};
