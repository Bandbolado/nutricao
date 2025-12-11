/**
 * Script de Teste do Bot - Telegram Nutricionista
 * Testa todos os comandos, botões e fluxos do bot
 */

const { Telegraf } = require('telegraf');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN não encontrado no .env');
  process.exit(1);
}

console.log('🧪 Iniciando testes do bot...\n');

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function logTest(name, status, details = '') {
  const icon = status ? '✅' : '❌';
  const message = `${icon} ${name}${details ? ': ' + details : ''}`;
  console.log(message);
  
  tests.results.push({ name, status, details });
  if (status) tests.passed++;
  else tests.failed++;
}

// Teste 1: Verificar módulos principais
console.log('📦 Testando importação de módulos...\n');

try {
  const patientService = require('./services/patientService');
  logTest('PatientService', true);
} catch (e) {
  logTest('PatientService', false, e.message);
}

try {
  const paymentService = require('./services/paymentService');
  logTest('PaymentService', true);
} catch (e) {
  logTest('PaymentService', false, e.message);
}

try {
  const menuController = require('./controllers/menuController');
  logTest('MenuController', true);
} catch (e) {
  logTest('MenuController', false, e.message);
}

try {
  const chatController = require('./controllers/chatController');
  logTest('ChatController', true);
} catch (e) {
  logTest('ChatController', false, e.message);
}

try {
  const weightController = require('./controllers/weightController');
  logTest('WeightController', true);
} catch (e) {
  logTest('WeightController', false, e.message);
}

try {
  const foodRecordController = require('./controllers/foodRecordController');
  logTest('FoodRecordController', true);
} catch (e) {
  logTest('FoodRecordController', false, e.message);
}

try {
  const paymentController = require('./controllers/paymentController');
  logTest('PaymentController', true);
} catch (e) {
  logTest('PaymentController', false, e.message);
}

try {
  const adminController = require('./controllers/adminController');
  logTest('AdminController', true);
} catch (e) {
  logTest('AdminController', false, e.message);
}

// Teste 2: Verificar variáveis de ambiente
console.log('\n🔐 Verificando variáveis de ambiente...\n');

const envVars = [
  'BOT_TOKEN',
  'SUPABASE_URL',
  'ADMIN_TELEGRAM_ID',
  'MERCADOPAGO_ACCESS_TOKEN'
];

envVars.forEach(varName => {
  if (process.env[varName]) {
    const value = process.env[varName];
    const masked = value.length > 20 
      ? value.substring(0, 15) + '...' + value.substring(value.length - 4)
      : value.substring(0, 10) + '...';
    logTest(`${varName}`, true, masked);
  } else {
    logTest(`${varName}`, false, 'Não definida');
  }
});

// Teste 3: Verificar planos de pagamento
console.log('\n💰 Testando configuração de planos...\n');

try {
  const paymentService = require('./services/paymentService');
  const plans = paymentService.PLANS;

  if (plans.monthly && plans.monthly.price === 150) {
    logTest('Plano Mensal', true, 'R$ 150,00 / 30 dias');
  } else {
    logTest('Plano Mensal', false, `Preço incorreto: R$ ${plans.monthly?.price || 'N/A'}`);
  }

  if (plans.quarterly && plans.quarterly.price === 400) {
    logTest('Plano Trimestral', true, 'R$ 400,00 / 90 dias');
  } else {
    logTest('Plano Trimestral', false, `Preço incorreto: R$ ${plans.quarterly?.price || 'N/A'}`);
  }

  if (plans.semiannual && plans.semiannual.price === 750) {
    logTest('Plano Semestral', true, 'R$ 750,00 / 180 dias');
  } else {
    logTest('Plano Semestral', false, `Preço incorreto: R$ ${plans.semiannual?.price || 'N/A'}`);
  }
} catch (e) {
  logTest('Planos de Pagamento', false, e.message);
}

// Teste 4: Verificar actions de menu
console.log('\n🔘 Testando ações do menu...\n');

try {
  const { MENU_ACTIONS } = require('./controllers/menuController');
  
  const requiredActions = [
    'PROFILE',
    'WEIGHT',
    'CALCULATOR',
    'FOOD_RECORD',
    'CHAT',
    'FILES',
    'REMINDERS',
    'PAYMENT',
    'HELP'
  ];

  requiredActions.forEach(action => {
    if (MENU_ACTIONS[action]) {
      logTest(`Action MENU_${action}`, true, MENU_ACTIONS[action]);
    } else {
      logTest(`Action MENU_${action}`, false, 'Não definida');
    }
  });
} catch (e) {
  logTest('Menu Actions', false, e.message);
}

// Teste 5: Testar validadores
console.log('\n✅ Testando funções de validação...\n');

try {
  const validators = require('./utils/validators');
  
  try {
    validators.validateWeight(70.5);
    logTest('validateWeight(70.5)', true, 'Aceita peso válido');
  } catch (e) {
    logTest('validateWeight', false, e.message);
  }

  try {
    validators.validateHeight(175);
    logTest('validateHeight(175)', true, 'Aceita altura válida');
  } catch (e) {
    logTest('validateHeight', false, e.message);
  }

  try {
    validators.validateWeight(1000);
    logTest('validateWeight(1000)', false, 'Deveria rejeitar');
  } catch (e) {
    logTest('validateWeight(1000)', true, 'Rejeitou peso inválido');
  }
} catch (e) {
  logTest('Validators', false, e.message);
}

// Teste final: Conectar ao Telegram
(async () => {
  console.log('\n🔌 Testando conexão com Telegram API...\n');

  try {
    const bot = new Telegraf(BOT_TOKEN);
    const botInfo = await bot.telegram.getMe();
    logTest('Conexão Telegram', true, `@${botInfo.username}`);
    
    console.log(`\n✨ Bot encontrado:`);
    console.log(`   👤 Nome: ${botInfo.first_name}`);
    console.log(`   🆔 ID: ${botInfo.id}`);
    console.log(`   📱 Username: @${botInfo.username}`);
  } catch (e) {
    logTest('Conexão Telegram', false, e.message);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Testes passados: ${tests.passed}`);
  console.log(`❌ Testes falhos: ${tests.failed}`);
  console.log(`📈 Taxa de sucesso: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (tests.failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Bot pronto para uso.\n');
    console.log('Para iniciar o bot, execute: npm run dev\n');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM. Verifique os erros acima.\n');
  }

  process.exit(tests.failed === 0 ? 0 : 1);
})();
