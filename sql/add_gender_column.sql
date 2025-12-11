-- Adiciona coluna gender na tabela patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Atualiza comentário da tabela
COMMENT ON COLUMN patients.gender IS 'Sexo do paciente: Masculino ou Feminino';
