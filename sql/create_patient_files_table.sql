-- Tabela para armazenar metadados dos arquivos enviados pelos pacientes
CREATE TABLE IF NOT EXISTS patient_files (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name TEXT,
  original_name TEXT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_patient_files_telegram_id ON patient_files(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_uploaded ON patient_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_patient_files_type ON patient_files(file_type);

-- Comentários explicativos
COMMENT ON TABLE patient_files IS 'Armazena metadados dos arquivos enviados pelos pacientes';
COMMENT ON COLUMN patient_files.file_type IS 'Tipo do arquivo: photo, document, etc';
COMMENT ON COLUMN patient_files.file_url IS 'URL pública do arquivo no Supabase Storage';
