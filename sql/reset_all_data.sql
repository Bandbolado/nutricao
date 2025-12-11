-- Script para resetar todos os dados do bot (USAR COM CUIDADO!)
-- Execute este SQL no Supabase para limpar todos os dados antes do lançamento

-- Limpa todos os lembretes
DELETE FROM reminders;

-- Limpa todos os arquivos dos pacientes
DELETE FROM patient_files;

-- Limpa todo o histórico de peso
DELETE FROM weight_history;

-- Limpa todos os pacientes (CUIDADO: isso remove todos os cadastros)
DELETE FROM patients;

-- Reseta os IDs das sequências (opcional, para começar do 1 novamente)
ALTER SEQUENCE reminders_id_seq RESTART WITH 1;
ALTER SEQUENCE patient_files_id_seq RESTART WITH 1;
ALTER SEQUENCE weight_history_id_seq RESTART WITH 1;
ALTER SEQUENCE patients_id_seq RESTART WITH 1;

-- Confirmação
SELECT 'Todos os dados foram removidos com sucesso!' as status;

-- Para verificar se está vazio
SELECT 
  (SELECT COUNT(*) FROM patients) as total_pacientes,
  (SELECT COUNT(*) FROM patient_files) as total_arquivos,
  (SELECT COUNT(*) FROM weight_history) as total_pesos,
  (SELECT COUNT(*) FROM reminders) as total_lembretes;
