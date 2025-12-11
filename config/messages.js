// Centraliza todas as mensagens do sistema para melhor organização e manutenção
'use strict';

const MESSAGES = {
  // ========== MENSAGENS DE BOAS-VINDAS ==========
  WELCOME_NEW_USER: '👋 *Olá! Seja bem-vindo(a)!*\n\n' +
    'Vejo que é sua primeira vez aqui.\n\n' +
    '🌟 Vamos começar criando seu perfil personalizado?',

  WELCOME_BACK: (firstName) => 
    `👋 *Olá, ${firstName}!*\n\n` +
    'Que bom ter você de volta! 😊',

  WELCOME_ADMIN: '🔐 *Painel Administrativo*\n\n' +
    'Bem-vinda, Nutricionista! 👩‍⚕️',

  // ========== CADASTRO ==========
  REGISTRATION_INTRO: '🌟 *Bem-vindo ao Sistema de Gestão Nutricional!*\n\n' +
    'Vamos criar seu perfil personalizado.\n' +
    'São apenas *7 perguntas rápidas*.\n\n' +
    '📝 Responda cada pergunta com atenção para receber o melhor acompanhamento possível.',

  REGISTRATION_SUCCESS: (firstName, hasHistory) =>
    '✅ *Cadastro concluído com sucesso!*\n\n' +
    `Olá, *${firstName}*! Seu perfil foi criado.\n\n` +
    '🎯 Agora você já pode acessar todas as funcionalidades do sistema.\n\n' +
    '🔔 _Lembretes automáticos de renovação foram agendados!_' +
    (hasHistory ? '\n\n✅ *Seu histórico foi restaurado!*' : ''),

  REGISTRATION_NOT_FOUND: '❌ *Cadastro não encontrado*\n\n' +
    'Você precisa completar seu cadastro antes de acessar esta funcionalidade.\n\n' +
    'Vamos criar seu perfil agora? 😊',

  REGISTRATION_INCOMPLETE: '❌ *Cadastro Incompleto*\n\n' +
    'Você precisa completar seu cadastro antes de acessar esta funcionalidade.',

  REGISTRATION_ERROR: (errorMsg) =>
    `❌ *Ops! Algo deu errado...*\n\n${errorMsg}\n\n` +
    '💡 _Por favor, tente novamente._',

  // ========== MENU ==========
  MENU_MAIN: '📋 *Menu Principal*\n\n' +
    'Escolha uma das opções abaixo:',

  MENU_PROFILE: '📋 *Seu Perfil Completo*',

  MENU_PLAN_STATUS: '📆 *Status do Plano*',

  // ========== CHAT ==========
  CHAT_START: '💬 *Chat com Nutricionista*\n\n' +
    'Agora você pode enviar mensagens diretamente para a nutricionista! 👩‍⚕️\n\n' +
    '📝 Digite sua mensagem e ela será encaminhada.\n' +
    '📷 Você também pode enviar fotos e documentos.\n\n' +
    '❌ Para sair do chat, digite: /menu',

  CHAT_MESSAGE_SENT: '✅ Mensagem enviada para a nutricionista!',
  CHAT_PHOTO_SENT: '✅ Foto enviada para a nutricionista!',
  CHAT_DOCUMENT_SENT: '✅ Documento enviado para a nutricionista!',
  
  CHAT_ENDED_BY_PATIENT: '🔴 *Conversa Encerrada*\n\n' +
    'Você saiu do chat com a nutricionista.\n\n' +
    '💡 Use /menu para acessar o menu novamente.',

  CHAT_ENDED_BY_NUTRITIONIST: '🔴 *Conversa Encerrada*\n\n' +
    'A nutricionista encerrou a conversa.\n\n' +
    '💡 Use /menu para acessar o menu novamente.',

  CHAT_ERROR: '❌ Erro ao enviar mensagem. Tente novamente.',

  // ========== ADMIN CHAT ==========
  ADMIN_REPLY_START: (patientName) =>
    `↩️ *Respondendo para: ${patientName}*\n\n` +
    'Digite sua mensagem e ela será enviada diretamente.\n\n' +
    '📷 Você também pode enviar fotos e documentos.\n\n' +
    '❌ Para cancelar: /menu',

  ADMIN_REPLY_SENT: '✅ Resposta enviada!',
  ADMIN_PHOTO_SENT: '✅ Foto enviada!',
  ADMIN_DOCUMENT_SENT: '✅ Documento enviado!',
  ADMIN_CHAT_ENDED: (patientName) => `✅ Conversa com ${patientName} encerrada.`,

  // ========== PESO ==========
  WEIGHT_ADD_START: '⚖️ *Registrar Novo Peso*\n\n' +
    'Digite seu peso atual em kg.\n\n' +
    '📝 _Exemplo: 70.5_\n\n' +
    '❌ Para cancelar, digite: /menu',

  WEIGHT_INVALID: '❌ *Peso inválido*\n\n' +
    'Por favor, digite apenas números.\n\n' +
    '📝 _Exemplo: 70.5_',

  WEIGHT_SUCCESS: (weight) =>
    `✅ *Peso registrado com sucesso!*\n\n` +
    `⚖️ *${weight} kg* foi salvo no seu histórico.\n\n` +
    '📊 Use o menu para ver sua evolução!',

  WEIGHT_ERROR: '❌ Erro ao salvar peso. Tente novamente.',

  WEIGHT_HISTORY_EMPTY: '📊 *Histórico de Peso*\n\n' +
    '❌ Você ainda não possui registros de peso.\n\n' +
    '💡 Use "⚖️ Registrar Peso" para começar!',

  WEIGHT_HISTORY_TITLE: '📊 *Seu Histórico de Peso*\n\n',

  // ========== ARQUIVOS ==========
  FILE_UPLOAD_START: '📄 *Enviar Arquivo*\n\n' +
    'Envie o arquivo que deseja compartilhar com a nutricionista.\n\n' +
    '📎 Tipos aceitos: PDF, imagens, documentos\n' +
    '⚠️ Tamanho máximo: 20MB\n\n' +
    '❌ Para cancelar, digite: /menu',

  FILE_UPLOAD_SUCCESS: (fileName) =>
    '✅ *Arquivo recebido com sucesso!*\n\n' +
    `📎 *${fileName}*\n\n` +
    '🔔 A nutricionista foi notificada!',

  FILE_UPLOAD_ERROR: '❌ Erro ao enviar arquivo. Tente novamente.',

  FILE_HISTORY_EMPTY: '📂 *Meus Arquivos*\n\n' +
    '❌ Você ainda não enviou nenhum arquivo.\n\n' +
    '💡 Use "📄 Enviar Arquivo" para compartilhar documentos!',

  FILE_HISTORY_TITLE: '📂 *Seus Arquivos Enviados*\n\n',

  // ========== LEMBRETES ==========
  REMINDER_ADD_START: '🔔 *Criar Novo Lembrete*\n\n' +
    'Digite a descrição do seu lembrete.\n\n' +
    '📝 _Exemplo: Tomar suplemento antes do treino_\n\n' +
    '❌ Para cancelar, digite: /menu',

  REMINDER_TIME_REQUEST: '⏰ *Que horas deseja receber o lembrete?*\n\n' +
    'Digite no formato HH:MM\n\n' +
    '📝 _Exemplo: 14:30_\n\n' +
    '❌ Para cancelar, digite: /menu',

  REMINDER_TIME_INVALID: '❌ *Horário inválido*\n\n' +
    'Por favor, use o formato HH:MM\n\n' +
    '📝 _Exemplo: 14:30_',

  REMINDER_SUCCESS: (description, time) =>
    '✅ *Lembrete criado com sucesso!*\n\n' +
    `🔔 *${description}*\n` +
    `⏰ Será enviado todos os dias às *${time}*`,

  REMINDER_LIST_EMPTY: '🔔 *Seus Lembretes*\n\n' +
    '❌ Você ainda não tem lembretes configurados.\n\n' +
    '💡 Crie seu primeiro lembrete!',

  REMINDER_DELETED: '✅ Lembrete excluído com sucesso!',

  // ========== QUESTIONÁRIO ALIMENTAR ==========
  FOOD_RECORD_NO_PLAN: '⭐ *Recurso Premium*\n\n' +
    'O questionário alimentar está disponível apenas para assinantes ativos.\n\n' +
    '💰 Use "💰 Renovar Plano" para ter acesso!',

  FOOD_RECORD_ALREADY_FILLED: '✅ *Questionário já preenchido este mês!*\n\n' +
    'Você já enviou seu recordatório alimentar este mês.\n\n' +
    '📅 Poderá preencher novamente no próximo mês.',

  FOOD_RECORD_START: '📝 *Recordatório Alimentar 24h*\n\n' +
    'Vamos registrar tudo que você comeu nas últimas 24 horas.\n\n' +
    '✍️ Responda cada pergunta com o máximo de detalhes possível.',

  FOOD_RECORD_CANCEL: '❌ *Questionário Cancelado*\n\n' +
    'Você pode preencher depois pelo menu.',

  FOOD_RECORD_SUCCESS: '✅ *Questionário enviado com sucesso!*\n\n' +
    'Obrigado por compartilhar suas informações! 📝\n\n' +
    '🔔 A nutricionista foi notificada e irá analisar seus dados.',

  FOOD_RECORD_HISTORY_EMPTY: '📋 *Meus Questionários*\n\n' +
    '❌ Você ainda não preencheu nenhum questionário.\n\n' +
    '💡 Use "📝 Enviar Questionário" para começar!',

  FOOD_RECORD_HISTORY_TITLE: '📋 *Seus Questionários Enviados*\n\n',

  // ========== CALCULADORA NUTRICIONAL ==========
  NUTRITION_CALC_TITLE: '🧮 *Análise Nutricional Personalizada*\n\n',

  // ========== PAGAMENTO ==========
  PAYMENT_PLANS_TITLE: '💰 *Escolha seu Plano*\n\n' +
    'Selecione o plano ideal para você:',

  PAYMENT_SUCCESS: (planName, endDate) =>
    '✅ *Pagamento confirmado!*\n\n' +
    `🎉 Seu plano *${planName}* está ativo!\n\n` +
    `📅 Válido até: *${endDate}*\n\n` +
    '🌟 Agora você tem acesso completo a todos os recursos premium!',

  PAYMENT_PENDING: '⏳ *Pagamento Pendente*\n\n' +
    'Aguardando confirmação do pagamento...\n\n' +
    '🔔 Você será notificado assim que for aprovado!',

  PAYMENT_CANCELLED: '❌ *Pagamento Cancelado*\n\n' +
    'Não se preocupe! Você pode tentar novamente quando quiser.',

  // ========== ERROS GERAIS ==========
  ERROR_GENERIC: '❌ *Ops! Algo deu errado...*\n\n' +
    'Tente novamente em alguns instantes.\n\n' +
    '💡 Se o problema persistir, entre em contato com a nutricionista.',

  ERROR_UNAUTHORIZED: '🔒 *Acesso Negado*\n\n' +
    'Você não tem permissão para acessar este recurso.',
};

module.exports = { MESSAGES };
