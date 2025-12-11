// Orquestra pedidos de upload e integra Telegram -> Supabase Storage de forma segura.
'use strict';

const { savePatientFile, getPatientFiles } = require('../services/fileService');
const { getPatientByTelegramId } = require('../services/patientService');
const { buildMainMenu } = require('./menuController');
const { notifyFileUpload } = require('../services/adminService');

// Lazy-load fetch for Node versions without native support.
const fetchFn = (...args) => {
  if (typeof fetch !== 'undefined') {
    return fetch(...args);
  }
  return import('node-fetch').then(({ default: fetchModule }) => fetchModule(...args));
};

const pendingUploads = new Set();

// Flag the user so the next file they send is captured and stored.
const requestFileUpload = async (ctx) => {
  pendingUploads.add(ctx.from.id);
  await ctx.replyWithMarkdown(
    '📄 *Enviar Arquivo*\n\n' +
    'Envie o arquivo desejado diretamente nesta conversa:\n\n' +
    '• Dietas\n' +
    '• Exames\n' +
    '• Fotos de progresso\n' +
    '• Receitas médicas\n\n' +
    '📎 _Aguardando seu arquivo..._'
  );
};

// Handles generic Telegram documents (PDFs, etc.).
const handleDocumentUpload = async (ctx, bot) => {
  const document = ctx.message.document;
  const fileType = document.mime_type.startsWith('image/') ? 'photo' : 'document';
  await processFile(ctx, document.file_id, document.mime_type, document.file_name || 'arquivo', fileType, bot);
};

// Handles photo uploads, picking the highest resolution Telegram provides.
const handlePhotoUpload = async (ctx, bot) => {
  const photos = ctx.message.photo || [];
  const bestPhoto = photos[photos.length - 1];
  if (!bestPhoto) return;
  await processFile(ctx, bestPhoto.file_id, 'image/jpeg', `foto-${Date.now()}.jpg`, 'photo', bot);
};

// Shared implementation that downloads the binary and registers it in Supabase.
const processFile = async (ctx, fileId, mimeType, originalName, fileType, bot) => {
  const telegramId = ctx.from.id;
  if (!pendingUploads.has(telegramId)) {
    await ctx.replyWithMarkdown(
      '⚠️ *Atenção*\n\n' +
      'Para enviar arquivos, use o *Menu Principal* e selecione a opção "📄 Enviar Arquivo".'
    );
    return;
  }

  try {
    const patient = await getPatientByTelegramId(telegramId);
    if (!patient) {
      await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nVocê precisa finalizar seu cadastro antes de enviar arquivos.');
      return;
    }

    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const downloadUrl = typeof fileUrl === 'string' ? fileUrl : fileUrl.href;
    const response = await fetchFn(downloadUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const { publicUrl } = await savePatientFile({ 
      telegramId, 
      buffer, 
      mimeType, 
      originalName,
      category: fileType 
    });
    
    // Notifica admin sobre o upload
    if (bot) {
      await notifyFileUpload(bot, telegramId, patient.name, originalName, publicUrl);
    }
    
    await ctx.replyWithMarkdown(
      '✅ *Arquivo salvo com sucesso!*\n\n' +
      'Seu arquivo foi armazenado com segurança e já está disponível no seu histórico.',
      buildMainMenu()
    );
  } catch (error) {
    console.error('❌ Erro detalhado ao salvar arquivo:', {
      error: error.message,
      stack: error.stack,
      telegramId,
      originalName,
      mimeType
    });
    
    await ctx.replyWithMarkdown(
      '❌ *Erro ao salvar arquivo*\n\n' +
      'Não consegui processar o arquivo no momento.\n' +
      '🔄 _Por favor, tente novamente em instantes._\n\n' +
      `Detalhes: ${error.message}`
    );
  } finally {
    pendingUploads.delete(telegramId);
  }
};

// Exibe histórico completo de arquivos enviados pelo paciente.
const showFileHistory = async (ctx) => {
  const telegramId = ctx.from.id;
  
  try {
    const patient = await getPatientByTelegramId(telegramId);
    if (!patient) {
      await ctx.replyWithMarkdown('❌ *Cadastro necessário*\n\nVocê precisa finalizar seu cadastro primeiro.');
      return;
    }

    const files = await getPatientFiles(telegramId);

    if (!files || files.length === 0) {
      await ctx.replyWithMarkdown(
        '📂 *Histórico de Arquivos*\n\n' +
        '📦 Você ainda não enviou nenhum arquivo.\n\n' +
        'Use o botão "📄 Enviar Arquivo" para começar!',
        buildMainMenu()
      );
      return;
    }

    let message = `📂 *Histórico de Arquivos*\n\n` +
                  `Total: *${files.length}* arquivo(s)\n\n` +
                  `━━━━━━━━━━━━━━━━\n\n`;

    files.forEach((file, index) => {
      const uploadDate = new Date(file.uploaded_at).toLocaleDateString('pt-BR');
      const fileIcon = file.mime_type.startsWith('image') ? '🖼️' : '📄';
      
      message += `${index + 1}. ${fileIcon} *${file.original_name}*\n`;
      message += `   📅 ${uploadDate}\n`;
      message += `   🔗 [Abrir arquivo](${file.file_url})\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━`;

    await ctx.replyWithMarkdown(message, {
      ...buildMainMenu(),
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    await ctx.replyWithMarkdown(
      '❌ *Erro ao carregar histórico*\n\n' +
      'Não consegui buscar seus arquivos no momento.\n' +
      '🔄 _Tente novamente em instantes._'
    );
  }
};

module.exports = {
  requestFileUpload,
  handleDocumentUpload,
  handlePhotoUpload,
  showFileHistory,
};
