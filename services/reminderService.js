// Serviço de lembretes automáticos para pacientes.
'use strict';

const { supabase, tableName } = require('../config/supabase');

// Tabela de lembretes no Supabase.
const remindersTableName = 'reminders';

// Tipos de lembretes disponíveis.
const REMINDER_TYPES = {
  PLAN_RENEWAL: 'plan_renewal',
  WEIGHT_CHECK: 'weight_check',
  APPOINTMENT: 'appointment',
  CUSTOM: 'custom',
};

// Cria um novo lembrete.
const createReminder = async (telegramId, type, message, scheduledFor) => {
  try {
    const { data, error } = await supabase
      .from(remindersTableName)
      .insert({
        telegram_id: telegramId,
        type,
        message,
        scheduled_for: scheduledFor,
        sent: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    return { success: false, error };
  }
};

// Busca lembretes pendentes que precisam ser enviados.
const getPendingReminders = async () => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from(remindersTableName)
      .select('*')
      .eq('sent', false)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar lembretes pendentes:', error);
    return [];
  }
};

// Marca lembrete como enviado.
const markReminderAsSent = async (reminderId) => {
  try {
    const { error } = await supabase
      .from(remindersTableName)
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar lembrete como enviado:', error);
    return false;
  }
};

// Deleta lembrete.
const deleteReminder = async (reminderId) => {
  try {
    const { error } = await supabase
      .from(remindersTableName)
      .delete()
      .eq('id', reminderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar lembrete:', error);
    return false;
  }
};

// Busca lembretes de um paciente específico.
const getPatientReminders = async (telegramId) => {
  try {
    const { data, error } = await supabase
      .from(remindersTableName)
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('sent', false)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar lembretes do paciente:', error);
    return [];
  }
};

// Formata lista de lembretes para exibição.
const formatRemindersList = (reminders) => {
  if (!reminders || reminders.length === 0) {
    return '📭 *Nenhum lembrete agendado*\n\nVocê não tem lembretes pendentes no momento.';
  }

  let message = '🔔 *Seus Lembretes Agendados*\n\n';

  reminders.forEach((reminder, idx) => {
    const date = new Date(reminder.scheduled_for);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const typeEmoji = {
      plan_renewal: '📅',
      weight_check: '⚖️',
      appointment: '🏥',
      custom: '📝',
    }[reminder.type] || '🔔';

    message += `${idx + 1}. ${typeEmoji} ${reminder.message}\n`;
    message += `   📅 ${dateStr} às ${timeStr}\n\n`;
  });

  return message;
};

// Cria lembretes automáticos de renovação de plano.
const scheduleRenewalReminders = async (telegramId, planEndDate) => {
  try {
    const endDate = new Date(planEndDate);
    
    // Lembrete 7 dias antes
    const reminder7Days = new Date(endDate);
    reminder7Days.setDate(reminder7Days.getDate() - 7);
    reminder7Days.setHours(10, 0, 0, 0);

    // Lembrete 3 dias antes
    const reminder3Days = new Date(endDate);
    reminder3Days.setDate(reminder3Days.getDate() - 3);
    reminder3Days.setHours(10, 0, 0, 0);

    // Lembrete 1 dia antes
    const reminder1Day = new Date(endDate);
    reminder1Day.setDate(reminder1Day.getDate() - 1);
    reminder1Day.setHours(10, 0, 0, 0);

    const reminders = [
      {
        days: 7,
        date: reminder7Days,
        message: '⚠️ Seu plano vence em 7 dias! Não esqueça de renovar para continuar seu acompanhamento.'
      },
      {
        days: 3,
        date: reminder3Days,
        message: '⏰ Seu plano vence em 3 dias! Entre em contato para renovar.'
      },
      {
        days: 1,
        date: reminder1Day,
        message: '🚨 Seu plano vence amanhã! Renove agora para não perder seu progresso.'
      }
    ];

    const results = [];
    const now = new Date();

    for (const reminder of reminders) {
      // Só agenda se a data for futura
      if (reminder.date > now) {
        const result = await createReminder(
          telegramId,
          REMINDER_TYPES.PLAN_RENEWAL,
          reminder.message,
          reminder.date.toISOString()
        );
        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.error('Erro ao agendar lembretes de renovação:', error);
    return [];
  }
};

module.exports = {
  REMINDER_TYPES,
  createReminder,
  getPendingReminders,
  markReminderAsSent,
  deleteReminder,
  getPatientReminders,
  formatRemindersList,
  scheduleRenewalReminders,
};
