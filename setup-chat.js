// Verifica se a tabela chat_messages existe e se está configurada corretamente
const { supabase } = require('./config/supabase');

async function checkChatMessagesTable() {
  console.log('🔍 Verificando tabela chat_messages...\n');

  try {
    // Tenta fazer um SELECT simples
    const { data, error } = await supabase
      .from('chat_messages')
      .select('count');

    if (error) {
      console.log('❌ Tabela chat_messages NÃO existe ou há erro de acesso.');
      console.log(`   Erro: ${error.message}\n`);
      console.log('📝 Execute este SQL no Supabase SQL Editor:\n');
      console.log('--- COPIE E COLE NO SUPABASE ---\n');
      
      const fs = require('fs');
      const sqlContent = fs.readFileSync('./sql/create_chat_messages_table.sql', 'utf-8');
      console.log(sqlContent);
      
      console.log('\n--- FIM DO SQL ---\n');
      return false;
    }

    console.log('✅ Tabela chat_messages existe!\n');

    // Verifica estrutura
    const { data: sample } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);

    console.log('📊 Colunas encontradas:');
    if (sample && sample.length > 0) {
      Object.keys(sample[0]).forEach(col => {
        console.log(`   ✓ ${col}`);
      });
    } else {
      console.log('   (Nenhuma mensagem registrada ainda)');
    }

    // Conta mensagens
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📬 Total de mensagens no histórico: ${count || 0}`);
    
    console.log('\n✅ Sistema de chat pronto para uso!\n');
    return true;

  } catch (err) {
    console.error('❌ Erro ao verificar tabela:', err.message);
    return false;
  }
}

checkChatMessagesTable()
  .then(success => {
    if (success) {
      console.log('🎉 Tudo configurado corretamente!');
    } else {
      console.log('⚠️  Execute o SQL necessário antes de usar o chat.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
  });
