const { supabase } = require('./config/supabase');

async function addGenderColumn() {
  console.log('📋 Verificando coluna gender na tabela patients...\n');
  
  try {
    // Tenta fazer um SELECT incluindo gender
    const { data, error } = await supabase
      .from('patients')
      .select('telegram_id, name, gender')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar coluna:', error.message);
      console.log('\n📝 A coluna gender NÃO existe. Execute este SQL no Supabase SQL Editor:');
      console.log('\nALTER TABLE patients ADD COLUMN gender TEXT;\n');
      process.exit(1);
    }
    
    if (data && data[0] && 'gender' in data[0]) {
      console.log('✅ Coluna gender já existe na tabela!\n');
      console.log('📊 Exemplo de registro:', data[0]);
    } else {
      console.log('📝 Execute este SQL no Supabase SQL Editor:');
      console.log('\nALTER TABLE patients ADD COLUMN gender TEXT;\n');
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n📝 Execute este SQL manualmente no Supabase:');
    console.log('\nALTER TABLE patients ADD COLUMN gender TEXT;\n');
    process.exit(1);
  }
}

addGenderColumn()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
