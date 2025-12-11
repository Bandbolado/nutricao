const { supabase, tableName } = require('./config/supabase');

async function testPatients() {
  console.log('Testando consulta de pacientes...\n');
  console.log('Tabela:', tableName);
  
  const { data, error } = await supabase
    .from(tableName)
    .select('name, telegram_id, plan_end_date')
    .order('name');
  
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  console.log('Total de pacientes:', data?.length || 0);
  console.log('\nDados:');
  console.log(JSON.stringify(data, null, 2));
}

testPatients().then(() => process.exit(0)).catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
