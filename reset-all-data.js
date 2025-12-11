const { supabase } = require('./config/supabase');

async function resetAllData() {
  console.log('🗑️  Resetando todos os dados do bot...\n');
  
  try {
    // 1. Deletar lembretes
    console.log('📌 Deletando lembretes...');
    const { error: remindersError } = await supabase
      .from('reminders')
      .delete()
      .neq('id', -1);
    
    if (remindersError) throw remindersError;
    console.log('   ✅ Lembretes deletados\n');

    // 2. Deletar pagamentos
    console.log('💰 Deletando pagamentos...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', -1);
    
    if (paymentsError) throw paymentsError;
    console.log('   ✅ Pagamentos deletados\n');

    // 3. Deletar arquivos
    console.log('📁 Deletando arquivos...');
    const { error: filesError } = await supabase
      .from('patient_files')
      .delete()
      .neq('id', -1);
    
    if (filesError) throw filesError;
    console.log('   ✅ Arquivos deletados\n');

    // 4. Deletar histórico de peso
    console.log('⚖️  Deletando histórico de peso...');
    const { error: weightError } = await supabase
      .from('weight_history')
      .delete()
      .not('id', 'is', null);
    
    if (weightError) throw weightError;
    console.log('   ✅ Histórico de peso deletado\n');

    // 5. Deletar pacientes
    console.log('👥 Deletando pacientes...');
    const { error: patientsError } = await supabase
      .from('patients')
      .delete()
      .neq('telegram_id', -1);
    
    if (patientsError) throw patientsError;
    console.log('   ✅ Pacientes deletados\n');

    // 6. Resetar sequences (IDs)
    console.log('🔢 Resetando IDs automáticos...');
    
    const sequences = [
      'ALTER SEQUENCE reminders_id_seq RESTART WITH 1',
      'ALTER SEQUENCE payments_id_seq RESTART WITH 1',
      'ALTER SEQUENCE patient_files_id_seq RESTART WITH 1',
      'ALTER SEQUENCE weight_history_id_seq RESTART WITH 1'
    ];

    for (const sql of sequences) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        console.log(`   ⚠️  Aviso: Não foi possível resetar sequence (${error.message})`);
      }
    }
    console.log('   ✅ IDs resetados\n');

    // 7. Verificar limpeza
    console.log('🔍 Verificando limpeza...\n');
    
    const tables = [
      { name: 'patients', label: 'Pacientes' },
      { name: 'patient_files', label: 'Arquivos' },
      { name: 'weight_history', label: 'Histórico de Peso' },
      { name: 'payments', label: 'Pagamentos' },
      { name: 'reminders', label: 'Lembretes' }
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ${count === 0 ? '✅' : '⚠️ '} ${table.label}: ${count} registro(s)`);
      }
    }

    console.log('\n🎉 Todos os dados foram deletados com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. O bot está limpo e pronto para começar do zero');
    console.log('   2. Teste o cadastro com /start');
    console.log('   3. Explore todas as funcionalidades\n');

  } catch (error) {
    console.error('\n❌ Erro ao resetar dados:', error.message);
    process.exit(1);
  }
}

resetAllData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
