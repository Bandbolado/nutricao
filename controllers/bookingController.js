'use strict';

const { Markup } = require('telegraf');

// Estado simples em memória. Para produção, mover para Supabase.
const bookingState = new Map();

const DURATIONS = [30, 45, 60];

// Slots exemplo: próximo 3 dias, dois horários por dia (09:00 e 14:00)
function generateSlots() {
  const slots = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    ['09:00', '14:00'].forEach((time) => {
      const [h, m] = time.split(':');
      const start = new Date(day);
      start.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      slots.push({ start, label: `${start.toLocaleDateString('pt-BR')} ${time}` });
    });
  }
  return slots;
}

const buildDurationKeyboard = () =>
  Markup.inlineKeyboard([
    ...DURATIONS.map((d) => [Markup.button.callback(`${d} min`, `BOOK_DUR_${d}`)]),
    [Markup.button.callback('🔙 Voltar', 'back_to_menu')]
  ]);

const buildSlotsKeyboard = (slots) => {
  const rows = slots.map((s, idx) => [Markup.button.callback(s.label, `BOOK_SLOT_${idx}`)]);
  rows.push([Markup.button.callback('🔙 Voltar', 'BOOK_BACK')]);
  return Markup.inlineKeyboard(rows);
};

async function showBookingMenu(ctx) {
  bookingState.delete(ctx.from.id);
  await ctx.replyWithMarkdown(
    '📅 *Agendar Consulta*\n\nEscolha a duração desejada.',
    buildDurationKeyboard()
  );
}

async function selectDuration(ctx, minutes) {
  await ctx.answerCbQuery();
  bookingState.set(ctx.from.id, { duration: minutes, slots: generateSlots() });
  const { slots } = bookingState.get(ctx.from.id);
  await ctx.editMessageText(
    `Duração: ${minutes} min\n\nEscolha um horário disponível:`,
    buildSlotsKeyboard(slots)
  );
}

async function selectSlot(ctx, slotIndex) {
  await ctx.answerCbQuery();
  const state = bookingState.get(ctx.from.id);
  if (!state || !state.slots[slotIndex]) return;
  const slot = state.slots[slotIndex];
  bookingState.set(ctx.from.id, { ...state, slot });

  const summary = `📅 Agendamento pré-reservado\n\n` +
    `Data/hora: ${slot.label}\n` +
    `Duração: ${state.duration} min\n\n` +
    `Responderemos confirmando o link da consulta.`;

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirmar', 'BOOK_CONFIRM')],
    [Markup.button.callback('🔙 Voltar', 'BOOK_BACK')]
  ]);

  await ctx.editMessageText(summary, kb);
}

async function confirmBooking(ctx) {
  await ctx.answerCbQuery();
  const state = bookingState.get(ctx.from.id);
  if (!state || !state.slot) {
    await ctx.reply('❌ Não encontrei o horário selecionado. Tente novamente.');
    return;
  }

  // Aqui integrar com Google Calendar futuramente.
  bookingState.delete(ctx.from.id);

  await ctx.editMessageText(
    '✅ Solicitação enviada!\n\nVamos confirmar e enviar o link da consulta. ' +
      'Caso precise trocar horário, responda esta mensagem.',
    Markup.inlineKeyboard([[Markup.button.callback('🔙 Voltar', 'back_to_menu')]])
  );
}

async function back(ctx) {
  await ctx.answerCbQuery();
  await showBookingMenu(ctx);
}

module.exports = {
  showBookingMenu,
  selectDuration,
  selectSlot,
  confirmBooking,
  back,
};
