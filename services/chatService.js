// Serviço para gerenciar histórico de mensagens do chat
'use strict';

const { supabase } = require('../config/supabase');

/**
 * Salva uma mensagem no histórico do chat
 */
const saveMessage = async (telegramId, senderType, messageType, messageText = null, fileId = null, fileName = null) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        telegram_id: telegramId,
        sender_type: senderType,
        message_type: messageType,
        message_text: messageText,
        file_id: fileId,
        file_name: fileName,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    return null;
  }
};

/**
 * Busca histórico de mensagens de um paciente
 */
const getPatientMessages = async (telegramId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return [];
  }
};

/**
 * Busca pacientes com mensagens não lidas (mensagens do paciente mais recentes que da nutricionista)
 */
const getPatientsWithUnreadMessages = async () => {
  try {
    // Busca última mensagem de cada paciente
    const { data, error } = await supabase
      .from('chat_messages')
      .select('telegram_id, sender_type, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupa por paciente e verifica se última mensagem é do paciente
    const patientMap = new Map();
    
    data.forEach(msg => {
      if (!patientMap.has(msg.telegram_id)) {
        patientMap.set(msg.telegram_id, msg);
      }
    });

    const unreadPatients = [];
    for (const [telegramId, lastMsg] of patientMap) {
      if (lastMsg.sender_type === 'patient') {
        unreadPatients.push(telegramId);
      }
    }

    return unreadPatients;
  } catch (error) {
    console.error('Erro ao buscar mensagens não lidas:', error);
    return [];
  }
};

/**
 * Conta mensagens não lidas de um paciente específico
 */
const getUnreadCount = async (telegramId) => {
  try {
    const messages = await getPatientMessages(telegramId, 100);
    
    let unreadCount = 0;
    for (const msg of messages) {
      if (msg.sender_type === 'patient') {
        unreadCount++;
      } else if (msg.sender_type === 'nutritionist') {
        // Para quando encontrar mensagem da nutricionista
        break;
      }
    }

    return unreadCount;
  } catch (error) {
    console.error('Erro ao contar não lidas:', error);
    return 0;
  }
};

/**
 * Formata histórico de mensagens para exibição
 */
const formatChatHistory = (messages) => {
  if (!messages || messages.length === 0) {
    return '📭 *Sem mensagens anteriores*';
  }

  // Inverte para mostrar do mais antigo para o mais recente
  const sorted = [...messages].reverse();
  
  let formatted = '💬 *Histórico da Conversa*\n\n';
  
  sorted.forEach(msg => {
    const date = new Date(msg.created_at).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const icon = msg.sender_type === 'patient' ? '👤' : '👩‍⚕️';
    const sender = msg.sender_type === 'patient' ? 'Paciente' : 'Nutricionista';
    
    if (msg.message_type === 'text') {
      formatted += `${icon} *${sender}* (${date})\n${msg.message_text}\n\n`;
    } else if (msg.message_type === 'photo') {
      formatted += `${icon} *${sender}* (${date})\n📷 Foto${msg.message_text ? `: ${msg.message_text}` : ''}\n\n`;
    } else if (msg.message_type === 'document') {
      formatted += `${icon} *${sender}* (${date})\n📎 ${msg.file_name || 'Documento'}${msg.message_text ? `: ${msg.message_text}` : ''}\n\n`;
    }
  });

  return formatted;
};

/**
 * Limpa histórico de mensagens de um paciente
 */
const clearPatientMessages = async (telegramId) => {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('telegram_id', telegramId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao limpar mensagens:', error);
    return false;
  }
};

module.exports = {
  saveMessage,
  getPatientMessages,
  getPatientsWithUnreadMessages,
  getUnreadCount,
  formatChatHistory,
  clearPatientMessages,
};
