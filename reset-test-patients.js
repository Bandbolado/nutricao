/**
 * Script para limpar pacientes de teste
 * Mantém apenas Pedro Reis como premium
 */

require('dotenv').config();
const { supabase } = require('./config/supabase');

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '973133558';

async function resetTestPatients() {
  console.log('🧹 Limpando pacientes de teste...\n');

  try {
    // 1. Buscar todos os pacientes
    console.log('📋 Buscando pacientes...');
    const { data: patients, error: fetchError } = await supabase
      .from('patients')
      .select('telegram_id, name, plan_status');

    if (fetchError) throw fetchError;

    console.log(`   Encontrados: ${patients.length} pacientes\n`);

    // 2. Identificar Pedro Reis
    const pedroReis = patients.find(p => 
      p.telegram_id === ADMIN_TELEGRAM_ID || 
      p.name.toLowerCase().includes('pedro')
    );

    if (pedroReis) {
      console.log(`✅ Pedro Reis encontrado (ID: ${pedroReis.telegram_id})`);
      console.log(`   Status atual: ${pedroReis.plan_status || 'inactive'}\n`);

      // Garantir que Pedro Reis está como premium
      if (pedroReis.plan_status !== 'active') {
        console.log('🔧 Ativando plano premium para Pedro Reis...');
        
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365); // 1 ano

        const { error: updateError } = await supabase
          .from('patients')
          .update({
            plan_status: 'active',
            plan_end_date: endDate.toISOString()
          })
          .eq('telegram_id', pedroReis.telegram_id);

        if (updateError) throw updateError;
        console.log('   ✅ Plano premium ativado por 365 dias\n');
      }
    }

    // 3. Deletar outros pacientes (exceto Pedro Reis)
    const idsToKeep = pedroReis ? [pedroReis.telegram_id] : [];
    
    console.log('🗑️  Deletando pacientes de teste...');
    
    // Deletar pacientes (exceto os que queremos manter)
    // As outras tabelas têm ON DELETE CASCADE, então serão limpas automaticamente
    const { error: patientsError, count } = await supabase
      .from('patients')
      .delete({ count: 'exact' })
      .not('telegram_id', 'in', `(${idsToKeep.join(',')})`);

    if (patientsError) throw patientsError;

    console.log(`   ✅ ${count || 0} pacientes de teste deletados (+ dados relacionados)\n`);

    // 4. Mostrar resumo
    console.log('═'.repeat(60));
    console.log('✨ LIMPEZA CONCLUÍDA');
    console.log('═'.repeat(60));
    
    if (pedroReis) {
      console.log(`\n✅ Pedro Reis mantido:`);
      console.log(`   📱 Telegram ID: ${pedroReis.telegram_id}`);
      console.log(`   👤 Nome: ${pedroReis.name}`);
      console.log(`   💎 Status: PREMIUM (ativo por 365 dias)`);
    }

    console.log(`\n🗑️  Pacientes de teste deletados: ${count || 0}`);
    console.log(`\n✅ Banco pronto para novos testes!\n`);

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

resetTestPatients();
