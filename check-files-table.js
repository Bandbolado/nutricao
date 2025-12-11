const { supabase } = require('./config/supabase');

async function checkAndFixTable() {
  console.log('Verificando tabela patient_files...\n');
  
  // Tentar consultar a tabela
  const { data, error } = await supabase
    .from('patient_files')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Erro ao consultar tabela:', error.message);
    console.log('\n📝 Execute este SQL no Supabase:');
    console.log(`
-- Dropar tabela se existir (CUIDADO: apaga dados!)
DROP TABLE IF EXISTS patient_files;

-- Criar tabela corretamente
CREATE TABLE patient_files (
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

-- Índices
CREATE INDEX idx_patient_files_telegram_id ON patient_files(telegram_id);
CREATE INDEX idx_patient_files_uploaded ON patient_files(uploaded_at);
CREATE INDEX idx_patient_files_type ON patient_files(file_type);
    `);
    return;
  }
  
  console.log('✅ Tabela patient_files existe!');
  console.log('Dados atuais:', data);
  
  // Tentar inserir um teste
  console.log('\nTestando inserção...');
  const testData = {
    telegram_id: 123456789,
    file_path: 'test/test.jpg',
    file_url: 'https://test.com/test.jpg',
    file_type: 'photo',
    file_name: 'test.jpg',
    original_name: 'test.jpg',
    mime_type: 'image/jpeg',
    uploaded_at: new Date().toISOString(),
  };
  
  const { data: inserted, error: insertError } = await supabase
    .from('patient_files')
    .insert(testData)
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ Erro ao inserir:', insertError.message);
  } else {
    console.log('✅ Inserção bem-sucedida!');
    console.log('Dados inseridos:', inserted);
    
    // Deletar o teste
    await supabase.from('patient_files').delete().eq('id', inserted.id);
    console.log('✅ Teste deletado');
  }
}

checkAndFixTable()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Erro fatal:', e);
    process.exit(1);
  });
