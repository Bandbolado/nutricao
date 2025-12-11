const { supabase } = require('./config/supabase');

async function activatePlan() {
  console.log('🔓 Ativando plano de teste...\n');
  
  try {
    // Busca o paciente Pedro Augusto Reis
    const { data: patient, error: searchError } = await supabase
      .from('patients')
      .select('telegram_id, name, plan_end_date')
      .ilike('name', '%pedro%augusto%reis%')
      .single();

    if (searchError || !patient) {
      console.log('❌ Paciente Pedro Augusto Reis não encontrado.');
      console.log('\n📋 Listando todos os pacientes cadastrados:\n');
      
      const { data: allPatients } = await supabase
        .from('patients')
        .select('telegram_id, name');
      
      if (allPatients && allPatients.length > 0) {
        allPatients.forEach((p, idx) => {
          console.log(`${idx + 1}. ${p.name} (ID: ${p.telegram_id})`);
        });
      } else {
        console.log('Nenhum paciente cadastrado ainda.');
      }
      
      process.exit(1);
    }

    console.log(`✅ Paciente encontrado: ${patient.name}`);
    console.log(`📱 Telegram ID: ${patient.telegram_id}\n`);

    // Ativa o plano por 30 dias
    const now = new Date();
    const planEndDate = new Date(now);
    planEndDate.setDate(planEndDate.getDate() + 30);

    // Tenta atualizar com plan_status (se a coluna existir)
    const updateData = {
      plan_start_date: now.toISOString(),
      plan_end_date: planEndDate.toISOString(),
      updated_at: now.toISOString()
    };

    // Tenta adicionar plan_status
    try {
      updateData.plan_status = 'active';
    } catch (e) {
      console.log('⚠️  Coluna plan_status não existe (normal se não executou o SQL ainda)');
    }

    const { data: updated, error: updateError } = await supabase
      .from('patients')
      .update(updateData)
      .eq('telegram_id', patient.telegram_id)
      .select()
      .single();

    if (updateError) {
      // Se erro for sobre plan_status, tenta sem ela
      if (updateError.message.includes('plan_status')) {
        console.log('⚠️  Tentando sem a coluna plan_status...\n');
        delete updateData.plan_status;
        
        const { data: updated2, error: updateError2 } = await supabase
          .from('patients')
          .update(updateData)
          .eq('telegram_id', patient.telegram_id)
          .select()
          .single();
        
        if (updateError2) throw updateError2;
        
        console.log('✅ Plano ativado parcialmente!\n');
        console.log('📅 Detalhes do plano:');
        console.log(`   Início: ${new Date(updated2.plan_start_date).toLocaleString('pt-BR')}`);
        console.log(`   Término: ${new Date(updated2.plan_end_date).toLocaleString('pt-BR')}`);
        console.log(`   Válido por: 30 dias\n`);
        
        console.log('⚠️  ATENÇÃO:');
        console.log('   A coluna plan_status NÃO existe no banco ainda.');
        console.log('   Você precisa executar os SQLs no Supabase primeiro!\n');
        console.log('📝 Execute este SQL no Supabase SQL Editor:\n');
        console.log('ALTER TABLE patients ADD COLUMN plan_status TEXT DEFAULT \'inactive\';');
        console.log('UPDATE patients SET plan_status = \'active\' WHERE telegram_id = ' + patient.telegram_id + ';\n');
        
        return;
      }
      throw updateError;
    }

    console.log('🎉 Plano ativado com sucesso!\n');
    console.log('📅 Detalhes do plano:');
    console.log(`   Status: ${updated.plan_status || 'N/A'}`);
    console.log(`   Início: ${new Date(updated.plan_start_date).toLocaleString('pt-BR')}`);
    console.log(`   Término: ${new Date(updated.plan_end_date).toLocaleString('pt-BR')}`);
    console.log(`   Válido por: 30 dias\n`);
    
    console.log('✨ Funcionalidades liberadas:');
    console.log('   ✅ Questionário Alimentar (1x por mês)');
    console.log('   ✅ Botão "📝 Enviar Questionário ⭐" visível no menu');
    console.log('   ✅ Botão "📋 Meus Questionários" visível no menu\n');
    
    console.log('🚀 Agora você pode testar todas as funcionalidades premium!');
    console.log('   Envie /menu no Telegram para ver as novas opções.\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

activatePlan()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
