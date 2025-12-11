const { createPaymentPreference } = require('./services/paymentService');

async function testPayment() {
  console.log('🧪 Testando geração de link de pagamento...\n');
  
  try {
    const telegramId = 973133558; // Seu ID
    const planType = 'monthly'; // Plano mensal
    const patientName = 'Pedro Augusto Reis';
    
    console.log('📋 Dados do teste:');
    console.log(`   ID: ${telegramId}`);
    console.log(`   Plano: ${planType}`);
    console.log(`   Nome: ${patientName}\n`);
    
    console.log('⏳ Gerando preferência de pagamento...\n');
    
    const preference = await createPaymentPreference(telegramId, planType, patientName);
    
    console.log('✅ Link de pagamento gerado com sucesso!\n');
    console.log('📦 Detalhes da preferência:');
    console.log(`   ID: ${preference.id}`);
    console.log(`   Link: ${preference.init_point}`);
    console.log(`   Sandbox Link: ${preference.sandbox_init_point}\n`);
    
    console.log('🎯 Próximos passos:');
    console.log('   1. Abra o link no navegador');
    console.log('   2. Use cartão de teste: 5031 4332 1540 6351');
    console.log('   3. CVV: 123, Validade: 11/25');
    console.log('   4. Verifique se o pagamento é processado\n');
    
    console.log('🔗 Link para testar:');
    console.log(`   ${preference.sandbox_init_point || preference.init_point}\n`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.cause) {
      console.error('   Detalhes:', error.cause);
    }
  }
}

testPayment()
  .then(() => {
    console.log('✅ Teste concluído!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
