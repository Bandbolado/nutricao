// Serviço de integração com Mercado Pago para processamento de pagamentos
'use strict';

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { supabase } = require('../config/supabase');

// Configuração do Mercado Pago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const paymentsTableName = process.env.SUPABASE_PAYMENTS_TABLE || 'payments';

let client, preferenceClient, paymentClient;

if (MERCADOPAGO_ACCESS_TOKEN) {
  client = new MercadoPagoConfig({ 
    accessToken: MERCADOPAGO_ACCESS_TOKEN,
  });
  preferenceClient = new Preference(client);
  paymentClient = new Payment(client);
}

// Planos disponíveis
const PLANS = {
  monthly: {
    name: 'Plano Mensal',
    days: 30,
    price: 150.00,
    description: 'Acompanhamento nutricional por 30 dias',
  },
  quarterly: {
    name: 'Plano Trimestral',
    days: 90,
    price: 400.00,
    description: 'Acompanhamento nutricional por 90 dias (desconto de 11%)',
  },
  semiannual: {
    name: 'Plano Semestral',
    days: 180,
    price: 750.00,
    description: 'Acompanhamento nutricional por 180 dias (desconto de 17%)',
  },
};

// Cria preferência de pagamento no Mercado Pago
const createPaymentPreference = async (telegramId, planType, patientName) => {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const plan = PLANS[planType];
  if (!plan) {
    throw new Error('Plano inválido');
  }

  const baseUrl = process.env.WEBHOOK_DOMAIN || 'https://example.com';
  
  const preferenceBody = {
    items: [
      {
        title: plan.name,
        description: plan.description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: plan.price,
      },
    ],
    payer: {
      name: patientName,
    },
    payment_methods: {
      // Mantém todos os métodos; PIX aparece nas opções
      default_payment_type_id: 'bank_transfer', // prioriza fluxo que mostra PIX
      installments: 12,
      default_installments: 1,
    },
    binary_mode: false, // permite cartão ou pix
    metadata: {
      telegram_id: telegramId,
      plan_type: planType,
    },
    external_reference: `${telegramId}_${Date.now()}`,
    statement_descriptor: 'NUTRICAO',
  };

  // Adiciona URLs de retorno e webhook apenas se WEBHOOK_DOMAIN estiver configurado
  if (process.env.WEBHOOK_DOMAIN) {
    preferenceBody.back_urls = {
      success: `${baseUrl}/payment/success`,
      failure: `${baseUrl}/payment/failure`,
      pending: `${baseUrl}/payment/pending`,
    };
    preferenceBody.auto_return = 'approved';
    preferenceBody.notification_url = `${baseUrl}/webhook/mercadopago`;
  }

  const preferenceData = {
    body: preferenceBody
  };

  const response = await preferenceClient.create(preferenceData);
  console.log('Preferência criada (id/init_point):', response.id, response.init_point);
  return response;
};

// Registra novo pagamento no banco (cartão/checkout)
const createPaymentRecord = async (telegramId, planType, preferenceData, overrides = {}) => {
  const plan = PLANS[planType];

  const { data, error } = await supabase
    .from(paymentsTableName)
    .insert({
      telegram_id: telegramId,
      amount: plan.price,
      plan_days: plan.days,
      status: overrides.status || 'pending',
      preference_id: overrides.preferenceId || preferenceData.id,
      payment_link: overrides.paymentLink || preferenceData.init_point,
      payment_method: overrides.paymentMethod || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar registro de pagamento: ${error.message}`);
  }

  return data;
};

// Atualiza status do pagamento (tenta casar por preference_id e fallback external_reference)
const updatePaymentStatus = async (preferenceId, paymentData) => {
  console.log('🔍 Buscando pagamento com preference_id:', preferenceId);
  
  let query = supabase
    .from(paymentsTableName)
    .update({
      status: paymentData.status,
      payment_id: paymentData.id,
      payment_method: paymentData.payment_method_id,
      paid_at: paymentData.status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('preference_id', preferenceId)
    .select()
    .single();

  let { data, error } = await query;

  // Fallback: tenta casar pelo external_reference se não encontrar
  if (!data && paymentData.external_reference) {
    console.warn('⚠️ Tentando fallback pelo external_reference:', paymentData.external_reference);
    ({ data, error } = await supabase
      .from(paymentsTableName)
      .update({
        status: paymentData.status,
        payment_id: paymentData.id,
        payment_method: paymentData.payment_method_id,
        paid_at: paymentData.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('preference_id', paymentData.external_reference)
      .select()
      .single());
  }

  if (error) {
    console.error('❌ Erro ao atualizar pagamento:', error);
    throw new Error(`Erro ao atualizar pagamento: ${error.message}`);
  }

  if (!data) {
    console.warn('⚠️ Nenhum pagamento encontrado com preference_id:', preferenceId);
    return null;
  }

  console.log('✅ Pagamento atualizado:', data);
  return data;
};

// Busca informações do pagamento pelo ID
const getPaymentInfo = async (paymentId) => {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const response = await paymentClient.get({ id: paymentId });
  return response;
};

// Busca histórico de pagamentos do paciente
const getPatientPayments = async (telegramId) => {
  const { data, error } = await supabase
    .from(paymentsTableName)
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
  }

  return data || [];
};

// Cria pagamento PIX (gera QR e chave)
const createPixPayment = async (telegramId, planType, patientName) => {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const plan = PLANS[planType];
  if (!plan) {
    throw new Error('Plano inválido');
  }

  const externalRef = `${telegramId}_${Date.now()}`;

  const paymentData = {
    body: {
      transaction_amount: plan.price,
      description: plan.description,
      payment_method_id: 'pix',
      external_reference: externalRef,
      metadata: {
        telegram_id: telegramId,
        plan_type: planType,
        preference_id: externalRef, // usamos como chave no banco
      },
      payer: {
        email: `${telegramId}@example.com`,
        first_name: patientName || 'Paciente',
      },
    }
  };

  const response = await paymentClient.create(paymentData);
  const txData = response.point_of_interaction?.transaction_data;

  if (!txData?.qr_code || !txData?.qr_code_base64) {
    throw new Error('Não foi possível gerar QR Code PIX');
  }

  // Salva registro de pagamento PIX usando preference_id = external_reference
  const record = await createPaymentRecord(telegramId, planType, {
    id: externalRef,
    init_point: txData.ticket_url || '',
  }, {
    preferenceId: externalRef,
    paymentLink: txData.ticket_url || '',
    paymentMethod: 'pix',
  });

  return {
    record,
    qrCode: txData.qr_code,
    qrBase64: txData.qr_code_base64,
    ticketUrl: txData.ticket_url,
  };
};

// Renova o plano do paciente após pagamento aprovado
const renewPatientPlan = async (telegramId, planDays) => {
  console.log(`🔄 Renovando plano para telegram_id ${telegramId} por ${planDays} dias`);
  
  const { data: patient, error: fetchError } = await supabase
    .from(process.env.SUPABASE_PATIENTS_TABLE || 'patients')
    .select('plan_end_date')
    .eq('telegram_id', telegramId)
    .single();

  if (fetchError) {
    console.error('❌ Erro ao buscar paciente:', fetchError);
    throw new Error(`Erro ao buscar paciente: ${fetchError.message}`);
  }

  const currentEndDate = new Date(patient.plan_end_date);
  const now = new Date();
  
  // Se o plano ainda está ativo, adiciona os dias ao fim do plano atual
  // Se está vencido, adiciona a partir de hoje
  const startDate = currentEndDate > now ? currentEndDate : now;
  const newEndDate = new Date(startDate);
  newEndDate.setDate(newEndDate.getDate() + planDays);

  console.log(`📅 Nova data de vencimento: ${newEndDate.toISOString()}`);

  const { data, error } = await supabase
    .from(process.env.SUPABASE_PATIENTS_TABLE || 'patients')
    .update({
      plan_end_date: newEndDate.toISOString(),
      plan_status: 'active', // Ativa o plano ao pagar
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao renovar plano:', error);
    throw new Error(`Erro ao renovar plano: ${error.message}`);
  }

  console.log('✅ Plano renovado com sucesso!');

  // Processar conversão de referral se houver
  try {
    const referralController = require('../controllers/referralController');
    await referralController.convertReferral(telegramId);
  } catch (referralError) {
    console.error('Erro ao processar referral:', referralError);
    // Não bloqueia o pagamento se houver erro no referral
  }

  return data;
};

module.exports = {
  PLANS,
  createPaymentPreference,
  createPaymentRecord,
  createPixPayment,
  updatePaymentStatus,
  getPaymentInfo,
  getPatientPayments,
  renewPatientPlan,
};
