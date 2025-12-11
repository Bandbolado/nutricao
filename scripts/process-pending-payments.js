// Script para simular processamento de webhooks do Mercado Pago
// Útil para processar pagamentos que foram aprovados mas o webhook não foi recebido
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { supabase } = require('../config/supabase');
const paymentService = require('../services/paymentService');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

async function processPayment(preferenceId, status = 'approved') {
  console.log(`\n🔄 Processando pagamento: ${preferenceId}`);
  
  try {
    const paymentsTableName = process.env.SUPABASE_PAYMENTS_TABLE || 'payments';
    
    // Busca o pagamento no banco
    const { data: payment, error } = await supabase
      .from(paymentsTableName)
      .select('*')
      .eq('preference_id', preferenceId)
      .single();

    if (error || !payment) {
      console.error('❌ Pagamento não encontrado:', preferenceId);
      return false;
    }

    console.log(`   Telegram ID: ${payment.telegram_id}`);
    console.log(`   Valor: R$ ${payment.amount.toFixed(2)}`);
    console.log(`   Dias: ${payment.plan_days}`);

    // Simula dados do pagamento aprovado
    const paymentData = {
      id: `simulated_${Date.now()}`,
      status: status,
      payment_method_id: 'pix', // ou 'credit_card'
      external_reference: `${payment.telegram_id}_${Date.now()}`,
    };

    // Atualiza status no banco
    const { data: updatedPayment, error: updateError } = await supabase
      .from(paymentsTableName)
      .update({
        status: paymentData.status,
        payment_id: paymentData.id,
        payment_method: paymentData.payment_method_id,
        paid_at: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('preference_id', preferenceId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar pagamento:', updateError);
      return false;
    }

    console.log('✅ Pagamento atualizado!');

    // Se aprovado, renova o plano
    if (status === 'approved') {
      await paymentService.renewPatientPlan(
        payment.telegram_id,
        payment.plan_days
      );

      // Notifica paciente
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + payment.plan_days);

      try {
        await bot.telegram.sendMessage(
          payment.telegram_id,
          `✅ *Pagamento Aprovado!*\n\n` +
          `💰 Valor: R$ ${payment.amount.toFixed(2)}\n` +
          `📅 Plano renovado por ${payment.plan_days} dias\n` +
          `📆 Válido até: ${newEndDate.toLocaleDateString('pt-BR')}\n\n` +
          `🎉 Obrigada pela confiança!\n` +
          `Continue seu acompanhamento nutricional conosco! 💚`,
          { parse_mode: 'Markdown' }
        );
        console.log('📤 Notificação enviada ao paciente!');
      } catch (notifyError) {
        console.warn('⚠️  Erro ao notificar paciente:', notifyError.message);
      }

      console.log(`✅ Plano renovado com sucesso!`);
    }

    return true;

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    return false;
  }
}

async function processPendingPayments() {
  console.log('🔍 Buscando pagamentos pendentes...\n');

  const paymentsTableName = process.env.SUPABASE_PAYMENTS_TABLE || 'payments';

  try {
    const { data: payments, error } = await supabase
      .from(paymentsTableName)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return;
    }

    if (!payments || payments.length === 0) {
      console.log('✅ Nenhum pagamento pendente encontrado!\n');
      return;
    }

    console.log(`📊 Encontrados ${payments.length} pagamentos pendentes\n`);
    console.log('⚠️  ATENÇÃO: Este script irá marcar TODOS como aprovados e renovar os planos!');
    console.log('   Use Ctrl+C para cancelar nos próximos 5 segundos...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    let processed = 0;
    for (const payment of payments) {
      const success = await processPayment(payment.preference_id, 'approved');
      if (success) processed++;
    }

    console.log(`\n✅ Processamento concluído: ${processed}/${payments.length} pagamentos processados com sucesso!\n`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executa
processPendingPayments()
  .then(() => {
    console.log('✅ Script finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
