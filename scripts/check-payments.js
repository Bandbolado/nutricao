// Script para verificar pagamentos pendentes no Supabase
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabase } = require('../config/supabase');

async function checkPayments() {
  console.log('🔍 Verificando pagamentos no banco...\n');

  const paymentsTableName = process.env.SUPABASE_PAYMENTS_TABLE || 'payments';

  try {
    // Busca todos os pagamentos
    const { data: payments, error } = await supabase
      .from(paymentsTableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return;
    }

    if (!payments || payments.length === 0) {
      console.log('📭 Nenhum pagamento encontrado no banco.\n');
      return;
    }

    console.log(`📊 Total de pagamentos: ${payments.length}\n`);

    // Agrupa por status
    const byStatus = {
      pending: [],
      approved: [],
      rejected: [],
      cancelled: [],
      refunded: [],
    };

    payments.forEach(payment => {
      if (byStatus[payment.status]) {
        byStatus[payment.status].push(payment);
      }
    });

    // Exibe estatísticas
    console.log('📈 Estatísticas por Status:');
    console.log(`   ⏳ Pendentes: ${byStatus.pending.length}`);
    console.log(`   ✅ Aprovados: ${byStatus.approved.length}`);
    console.log(`   ❌ Rejeitados: ${byStatus.rejected.length}`);
    console.log(`   🚫 Cancelados: ${byStatus.cancelled.length}`);
    console.log(`   ↩️ Reembolsados: ${byStatus.refunded.length}\n`);

    // Lista pagamentos pendentes com detalhes
    if (byStatus.pending.length > 0) {
      console.log('⚠️  Pagamentos Pendentes (precisam ser processados):\n');
      byStatus.pending.forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.id}`);
        console.log(`   Telegram ID: ${payment.telegram_id}`);
        console.log(`   Valor: R$ ${payment.amount.toFixed(2)}`);
        console.log(`   Dias: ${payment.plan_days}`);
        console.log(`   Preference ID: ${payment.preference_id}`);
        console.log(`   Criado em: ${new Date(payment.created_at).toLocaleString('pt-BR')}`);
        console.log(`   Link: ${payment.payment_link}`);
        console.log('');
      });
    }

    // Lista últimos 5 pagamentos aprovados
    if (byStatus.approved.length > 0) {
      console.log('✅ Últimos pagamentos aprovados:\n');
      byStatus.approved.slice(0, 5).forEach((payment, index) => {
        console.log(`${index + 1}. Telegram ID: ${payment.telegram_id}`);
        console.log(`   Valor: R$ ${payment.amount.toFixed(2)} - ${payment.plan_days} dias`);
        console.log(`   Pago em: ${new Date(payment.paid_at).toLocaleString('pt-BR')}`);
        console.log(`   Método: ${payment.payment_method || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executa
checkPayments()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
