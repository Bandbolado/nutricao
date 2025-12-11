const { supabase } = require('./config/supabase');

async function setupFoodRecords() {
  console.log('📋 Configurando sistema de questionários alimentares...\n');
  
  try {
    // 1. Verifica se a tabela food_records existe
    console.log('1️⃣ Verificando tabela food_records...');
    const { data: testFoodRecords, error: foodRecordsError } = await supabase
      .from('food_records')
      .select('id')
      .limit(1);
    
    if (foodRecordsError && foodRecordsError.code === '42P01') {
      console.log('❌ Tabela food_records NÃO existe.');
      console.log('\n📝 Execute este SQL no Supabase SQL Editor:\n');
      console.log('--- COPIE E COLE NO SUPABASE ---\n');
      const fs = require('fs');
      const sql = fs.readFileSync('./sql/create_food_records_table.sql', 'utf8');
      console.log(sql);
      console.log('\n--- FIM DO SQL ---\n');
      process.exit(1);
    }
    
    console.log('✅ Tabela food_records existe!\n');

    // 2. Verifica coluna plan_status
    console.log('2️⃣ Verificando coluna plan_status...');
    const { data: testPlanStatus, error: planStatusError } = await supabase
      .from('patients')
      .select('telegram_id, plan_status')
      .limit(1);
    
    if (planStatusError && planStatusError.message.includes('column') && planStatusError.message.includes('plan_status')) {
      console.log('❌ Coluna plan_status NÃO existe.');
      console.log('\n📝 Execute este SQL no Supabase SQL Editor:\n');
      console.log('--- COPIE E COLE NO SUPABASE ---\n');
      const fs = require('fs');
      const sql = fs.readFileSync('./sql/add_plan_status_column.sql', 'utf8');
      console.log(sql);
      console.log('\n--- FIM DO SQL ---\n');
      process.exit(1);
    }
    
    console.log('✅ Coluna plan_status existe!\n');

    // 3. Verifica coluna gender
    console.log('3️⃣ Verificando coluna gender...');
    const { data: testGender, error: genderError } = await supabase
      .from('patients')
      .select('telegram_id, gender')
      .limit(1);
    
    if (genderError && genderError.message.includes('column') && genderError.message.includes('gender')) {
      console.log('❌ Coluna gender NÃO existe.');
      console.log('\n📝 Execute este SQL no Supabase SQL Editor:\n');
      console.log('--- COPIE E COLE NO SUPABASE ---\n');
      console.log('ALTER TABLE patients ADD COLUMN gender TEXT;');
      console.log('\n--- FIM DO SQL ---\n');
      process.exit(1);
    }
    
    console.log('✅ Coluna gender existe!\n');

    console.log('🎉 TUDO CONFIGURADO CORRETAMENTE!\n');
    console.log('✅ Tabela food_records: OK');
    console.log('✅ Coluna plan_status: OK');
    console.log('✅ Coluna gender: OK\n');
    console.log('🚀 Você pode iniciar o bot com: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

setupFoodRecords()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
