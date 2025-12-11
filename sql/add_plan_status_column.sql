-- Adiciona coluna plan_status na tabela patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';

-- Comentário
COMMENT ON COLUMN patients.plan_status IS 'Status do plano: inactive (sem acesso premium), active (com acesso), expired (vencido)';

-- Atualiza registros existentes como inactive por padrão
UPDATE patients 
SET plan_status = 'inactive' 
WHERE plan_status IS NULL;
