// Encapsula uploads no Storage e registro de histórico de arquivos dos pacientes.
'use strict';

const { supabase, filesTableName, storageBucket } = require('../config/supabase');

if (!storageBucket) {
  throw new Error('Configure SUPABASE_STORAGE_BUCKET para habilitar o envio de arquivos.');
}

// Ensures every uploaded file keeps a predictable path and metadata registry.
const buildStoragePath = (telegramId, originalName = 'arquivo') => {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `${telegramId}/${Date.now()}-${safeName}`;
};

// Stores a row in Supabase with enough data to build a file history per patient.
const persistFileMetadata = async (metadata) => {
  const { data, error } = await supabase
    .from(filesTableName)
    .insert(metadata)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao registrar histórico do arquivo: ${error.message}`);
  }

  return data;
};

// Sends the binary payload to Supabase Storage and returns a public link.
const uploadToStorage = async (filePath, buffer, mimeType) => {
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Erro ao enviar o arquivo: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(storageBucket).getPublicUrl(filePath);

  return publicUrl;
};

// Public method used by controllers to upload and register files atomically.
const savePatientFile = async ({ telegramId, buffer, mimeType, originalName, category = 'outros' }) => {
  const filePath = buildStoragePath(telegramId, originalName);
  const publicUrl = await uploadToStorage(filePath, buffer, mimeType);

  const fileMetadata = {
    telegram_id: telegramId,
    file_path: filePath,
    file_url: publicUrl,
    file_type: category,
    file_name: originalName,
    original_name: originalName,
    mime_type: mimeType,
    uploaded_at: new Date().toISOString(),
  };

  await persistFileMetadata(fileMetadata);

  return { publicUrl, filePath };
};

// Busca todos os arquivos enviados por um paciente.
const getPatientFiles = async (telegramId) => {
  const { data, error } = await supabase
    .from(filesTableName)
    .select('*')
    .eq('telegram_id', telegramId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar arquivos: ${error.message}`);
  }

  return data || [];
};

module.exports = {
  savePatientFile,
  getPatientFiles,
};
