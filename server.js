// Entry point responsible for bootstrapping Telegraf, Express and webhook/polling modes.
'use strict';

require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const patientController = require('./controllers/patientController');
const fileController = require('./controllers/fileController');
const adminController = require('./controllers/adminController');
const weightController = require('./controllers/weightController');
const reminderController = require('./controllers/reminderController');
const chatController = require('./controllers/chatController');
const paymentController = require('./controllers/paymentController');
const foodRecordController = require('./controllers/foodRecordController');
const foodDiaryController = require('./controllers/foodDiaryController'); // NOVO
const recipesController = require('./controllers/recipesController'); // NOVO
const reportController = require('./controllers/reportController'); // NOVO
const referralController = require('./controllers/referralController'); // NOVO
const dashboardController = require('./controllers/dashboardController'); // NOVO
const activityController = require('./controllers/activityController'); // NOVO
const workoutController = require('./controllers/workoutController'); // NOVO
const calorieController = require('./controllers/calorieController'); // NOVO
const reminderService = require('./services/reminderService');
const paymentService = require('./services/paymentService');
const { MENU_ACTIONS, buildMainMenu, sendMainMenu, requireRegistration, requireActivePlan } = require('./controllers/menuController');

const { BOT_TOKEN, WEBHOOK_DOMAIN, WEBHOOK_PATH = '/telegram/webhook', PORT = 3000 } = process.env;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN não configurado. Defina no arquivo .env.');
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

bot.catch((err) => {
  console.error('Erro no bot:', err);
});

bot.start(patientController.handleStart);
bot.command('menu', async (ctx) => {
  const adminService = require('./services/adminService');
  
  // Verifica se é paciente em chat ativo
  const { MESSAGES } = require('./config/messages');
  if (chatController.chatState.has(ctx.from.id) && !adminService.isAdmin(ctx.from.id)) {
    await chatController.endChatByPatient(bot, ctx.from.id);
    await ctx.replyWithMarkdown(MESSAGES.CHAT_ENDED_BY_PATIENT);
  }
  
  // Verifica se é admin em modo resposta
  if (chatController.adminReplyState.has(ctx.from.id)) {
    const state = chatController.adminReplyState.get(ctx.from.id);
    if (state && state.patientId) {
      await chatController.endAdminReply(bot, ctx.from.id, state.patientId);
    } else {
      chatController.adminReplyState.delete(ctx.from.id);
    }
  }

  // Sempre mostra menu de paciente; admin acessa painel via /admin
  await sendMainMenu(ctx, '📋 *Menu Principal*\n\nEscolha uma das opções abaixo:');
});
bot.command('admin', adminController.requireAdmin(adminController.showAdminMenu));

bot.action(MENU_ACTIONS.VIEW_PROFILE, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await patientController.handleViewProfile(ctx);
}));

bot.action(MENU_ACTIONS.VIEW_PROFILE_FULL, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await patientController.handleViewProfileFull(ctx);
}));

bot.action(MENU_ACTIONS.EDIT_PROFILE, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await patientController.handleEditProfile(ctx);
}));

bot.action(MENU_ACTIONS.UPLOAD_FILE, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await fileController.requestFileUpload(ctx);
}));

bot.action(MENU_ACTIONS.VIEW_RENEWAL, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await patientController.handleRenewalRequest(ctx);
}));

bot.action(MENU_ACTIONS.RENEW_PLAN, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await paymentController.showPlans(ctx);
}));

bot.action(MENU_ACTIONS.NUTRITION_CALC, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await patientController.handleNutritionalCalculator(ctx);
}));

bot.action(MENU_ACTIONS.CALORIE_LOG, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await calorieController.showCalorieInput(ctx);
}));

bot.action(MENU_ACTIONS.FILE_HISTORY, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await fileController.showFileHistory(ctx);
}));

bot.action(MENU_ACTIONS.WEIGHT_HISTORY, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await weightController.showWeightHistory(ctx);
}));

bot.action(MENU_ACTIONS.ADD_WEIGHT, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await weightController.requestWeightInput(ctx);
}));

// Nível de atividade
bot.action(MENU_ACTIONS.ACTIVITY_MENU, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await activityController.showActivityMenu(ctx);
}));

bot.action(/^activity_(.+)$/, requireActivePlan(async (ctx) => {
  const level = ctx.match[1];
  await activityController.selectActivity(ctx, level);
}));

bot.action(MENU_ACTIONS.REMINDERS, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await reminderController.showRemindersMenu(ctx);
}));

bot.action(MENU_ACTIONS.CHAT_NUTRITIONIST, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await chatController.startChat(ctx);
}));

bot.action(MENU_ACTIONS.FOOD_RECORD, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await foodRecordController.startFoodRecord(ctx);
}));

bot.action(MENU_ACTIONS.FOOD_RECORD_HISTORY, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await foodRecordController.showPatientFoodRecordHistory(ctx);
}));

// ========== NOVAS FUNCIONALIDADES ==========

// Diário Alimentar
bot.action(MENU_ACTIONS.FOOD_DIARY, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.showFoodDiaryMenu(ctx);
}));

bot.action('diary_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.showFoodDiaryMenu(ctx);
});

bot.action('diary_add', async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.startDiaryEntry(ctx);
});

bot.action(/^diary_type_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const mealType = ctx.match[1];
  await foodDiaryController.setMealType(ctx, mealType);
});

bot.action('diary_no_obs', async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.saveDiaryWithoutObs(ctx);
});

bot.action('diary_today', async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.showTodayDiary(ctx);
});

bot.action('diary_history', async (ctx) => {
  await ctx.answerCbQuery();
  await foodDiaryController.showFullHistory(ctx);
});

// Gerador de Treinos (OpenAI)
bot.action(MENU_ACTIONS.WORKOUT_GENERATOR, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await workoutController.startWorkoutFlow(ctx);
}));

bot.action('workout_restart', requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await workoutController.startWorkoutFlow(ctx);
}));

bot.action(/^workout_level_(.+)$/, requireActivePlan(async (ctx) => {
  const level = ctx.match[1];
  await workoutController.selectLevel(ctx, level);
}));

bot.action(/^workout_group_(.+)$/, requireActivePlan(async (ctx) => {
  const group = ctx.match[1];
  await workoutController.selectGroup(ctx, group);
}));

bot.action(/^workout_type_(.+)$/, requireActivePlan(async (ctx) => {
  const type = ctx.match[1];
  await workoutController.selectTrainingType(ctx, type);
}));

bot.action(/^workout_exercises_(\d+)$/, requireActivePlan(async (ctx) => {
  const exercises = parseInt(ctx.match[1], 10);
  await workoutController.selectExercises(ctx, exercises);
}));

// Receitas
bot.action(MENU_ACTIONS.RECIPES, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await recipesController.showRecipesMenu(ctx);
}));

bot.action('recipes_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await recipesController.showRecipesMenu(ctx);
});

bot.action('recipes_generate_pantry', requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await recipesController.startPantryFlow(ctx);
}));

bot.action('recipes_generate_remaining', requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await recipesController.generateRecipeWithRemaining(ctx);
}));

bot.action(/^recipes_cat_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const category = ctx.match[1];
  await recipesController.showRecipesByCategory(ctx, category);
});

bot.action(/^recipe_view_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const recipeId = parseInt(ctx.match[1]);
  await recipesController.showRecipeDetails(ctx, recipeId);
});

bot.action(/^recipe_fav_toggle_(\d+)$/, async (ctx) => {
  const recipeId = parseInt(ctx.match[1]);
  await recipesController.toggleFavorite(ctx, recipeId);
});

bot.action('recipes_favorites', async (ctx) => {
  await ctx.answerCbQuery();
  await recipesController.showFavoriteRecipes(ctx);
});

bot.action(/^recipe_shopping_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const recipeId = parseInt(ctx.match[1]);
  await recipesController.generateShoppingList(ctx, recipeId);
});

// Relatórios
bot.action(MENU_ACTIONS.REPORT, requireActivePlan(async (ctx) => {
  await ctx.answerCbQuery();
  await reportController.showReportMenu(ctx);
}));

bot.action('report_generate', async (ctx) => {
  await ctx.answerCbQuery();
  await reportController.generatePatientReport(ctx);
});

// Indicações (Referral)
bot.action(MENU_ACTIONS.REFERRAL, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  await referralController.showReferralMenu(ctx);
}));

bot.action('referral_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await referralController.showReferralMenu(ctx);
});

bot.action('referral_list', async (ctx) => {
  await ctx.answerCbQuery();
  await referralController.showReferralList(ctx);
});

// Dashboard Admin
bot.action(MENU_ACTIONS.ADMIN_DASHBOARD, async (ctx) => {
  await ctx.answerCbQuery();
  await dashboardController.showAdminDashboard(ctx);
});

bot.action('admin_dashboard', async (ctx) => {
  await ctx.answerCbQuery();
  await dashboardController.showAdminDashboard(ctx);
});

bot.action('admin_patients', async (ctx) => {
  await ctx.answerCbQuery();
  await dashboardController.showActivePatients(ctx);
});

bot.action('admin_alerts', async (ctx) => {
  await ctx.answerCbQuery();
  await dashboardController.showAlerts(ctx);
});

bot.action('admin_close', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
});

// ========== FIM NOVAS FUNCIONALIDADES ==========

bot.action(/^PATIENT_VIEW_FOOD_RECORD_(\d+)$/, requireRegistration(async (ctx) => {
  await ctx.answerCbQuery();
  const recordId = parseInt(ctx.match[1]);
  await foodRecordController.showPatientFoodRecordDetails(ctx, recordId);
}));

bot.action('BACK_TO_MENU', async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainMenu(ctx);
});

bot.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainMenu(ctx);
});

bot.action('CREATE_REMINDER', async (ctx) => {
  await ctx.answerCbQuery();
  await reminderController.startReminderCreation(ctx);
});

bot.action('CANCEL_REMINDERS', async (ctx) => {
  await ctx.answerCbQuery();
  await reminderController.showCancelMenu(ctx);
});

bot.action('VIEW_REMINDERS', async (ctx) => {
  await ctx.answerCbQuery();
  await reminderController.showRemindersMenu(ctx);
});

bot.action(/^CANCEL_REMINDER_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const reminderId = parseInt(ctx.match[1]);
  await reminderController.cancelReminder(ctx, reminderId);
});

bot.action('BACK_TO_MENU', async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainMenu(ctx, '📋 *Menu Principal*\n\nEscolha uma das opções abaixo:');
});

bot.action('ADMIN_DASHBOARD', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.getDashboardStats(ctx);
}));

bot.action('ADMIN_EXPIRING_PLANS', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showExpiringPlans(ctx);
}));

bot.action('ADMIN_EXPIRED_PLANS', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showExpiredPlans(ctx);
}));

bot.action('ADMIN_FOOD_RECORDS', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showFoodRecords(ctx, 1);
}));

bot.action(/^ADMIN_FOOD_RECORDS_PAGE_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match[1]);
  await adminController.showFoodRecords(ctx, page);
}));

bot.action(/^ADMIN_VIEW_FOOD_RECORD_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const recordId = parseInt(ctx.match[1]);
  await adminController.showFoodRecordDetails(ctx, recordId);
}));

bot.action('ADMIN_BROADCAST_MENU', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showBroadcastMenu(ctx);
}));

bot.action('ADMIN_BACK', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showAdminMenu(ctx);
}));

bot.action('ADMIN_BROADCAST_ALL', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.requestBroadcastMessage(ctx, 'all');
}));

bot.action('ADMIN_BROADCAST_ACTIVE', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.requestBroadcastMessage(ctx, 'active');
}));

bot.action('ADMIN_BROADCAST_EXPIRING', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.requestBroadcastMessage(ctx, 'expiring');
}));

bot.action('ADMIN_VIEW_PATIENT', adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  await adminController.showPatientSelection(ctx, 0);
}));

bot.action(/^ADMIN_PATIENTS_PAGE_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match[1]);
  await adminController.showPatientSelection(ctx, page);
}));

bot.action(/^ADMIN_SELECT_PATIENT_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.match[1];
  await adminController.showPatientAnalysis(ctx, telegramId);
}));

bot.action(/^ADMIN_PATIENT_WEIGHT_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.match[1];
  await adminController.showPatientWeightHistory(ctx, telegramId);
}));

bot.action(/^ADMIN_PATIENT_FILES_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.match[1];
  await adminController.showPatientFiles(ctx, telegramId);
}));

bot.action(/^ADMIN_MESSAGE_PATIENT_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const patientId = ctx.match[1];
  await chatController.startAdminReply(ctx, patientId);
}));

bot.action(/^ADMIN_RESET_REGISTRATION_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.match[1];
  await adminController.confirmResetRegistration(ctx, telegramId);
}));

bot.action(/^ADMIN_CONFIRM_RESET_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.match[1];
  await adminController.executeResetRegistration(ctx, telegramId);
}));

bot.action(/^ADMIN_REPLY_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const patientId = ctx.match[1];
  await chatController.startAdminReply(ctx, patientId);
}));

bot.action(/^ADMIN_CHAT_HISTORY_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  const patientId = ctx.match[1];
  await chatController.showChatHistory(ctx, patientId);
}));

bot.action(/^ADMIN_END_CHAT_(\d+)$/, adminController.requireAdmin(async (ctx) => {
  await ctx.answerCbQuery();
  const patientId = ctx.match[1];
  await chatController.endPatientChat(ctx, bot, patientId);
}));

bot.on('text', async (ctx) => {
  // Verifica se é admin enviando broadcast
  if (adminController.broadcastState.has(ctx.from.id)) {
    const handled = await adminController.handleBroadcastMessage(ctx, bot);
    if (handled) return;
  }

  // Verifica se admin está respondendo paciente
  if (chatController.adminReplyState.has(ctx.from.id)) {
    const handled = await chatController.sendAdminReply(ctx, bot);
    if (handled) return;
  }

  // Verifica se está criando lembrete
  if (reminderController.reminderCreationState.has(ctx.from.id)) {
    const handled = await reminderController.handleReminderCreation(ctx);
    if (handled) return;
  }

  // Verifica se está no chat com nutricionista
  if (chatController.chatState.has(ctx.from.id)) {
    const handled = await chatController.forwardPatientMessage(ctx, bot);
    if (handled) return;
  }
  
  // Verifica se está no fluxo do diário alimentar (aguardando observação)
  if (foodDiaryController.diaryState.has(ctx.from.id)) {
    const state = foodDiaryController.diaryState.get(ctx.from.id);
    if (state && state.step === 'awaiting_observation') {
      await foodDiaryController.handleDiaryObservation(ctx);
      return;
    }
  }

  // Verifica se está preenchendo questionário alimentar
  const foodRecordHandled = await foodRecordController.handleFoodRecordResponse(ctx);
  if (foodRecordHandled) return;

  // Verifica se é entrada de peso
  const weightHandled = await weightController.handleWeightInput(ctx);
  if (weightHandled) return;

  // Verifica se está no fluxo de registro de alimentos (kcal)
  const calorieHandled = await calorieController.handleCalorieLogMessage(ctx);
  if (calorieHandled) return;

  // Verifica se está no fluxo de ingredientes para receitas
  const pantryHandled = await recipesController.handlePantryInput(ctx);
  if (pantryHandled) return;

  // Verifica se é resposta de cadastro
  const handled = await patientController.handleRegistrationResponse(ctx, bot);
  if (!handled && !ctx.message.text.startsWith('/')) {
    await ctx.replyWithMarkdown(
      '🤔 *Não entendi*\n\n' +
      'Use o *Menu Principal* abaixo para navegar pelas opções disponíveis.',
      buildMainMenu()
    );
  }
});

bot.on('document', async (ctx) => {
  // Verifica se admin está respondendo
  if (chatController.adminReplyState.has(ctx.from.id)) {
    await chatController.sendAdminDocumentReply(ctx, bot);
    return;
  }
  
  // Verifica se está no chat
  if (chatController.chatState.has(ctx.from.id)) {
    await chatController.forwardPatientDocument(ctx, bot);
    return;
  }
  // Senão, trata como upload normal
  await fileController.handleDocumentUpload(ctx, bot);
});

bot.on('photo', async (ctx) => {
  // Verifica se admin está respondendo
  if (chatController.adminReplyState.has(ctx.from.id)) {
    await chatController.sendAdminPhotoReply(ctx, bot);
    return;
  }
  
  // Verifica se está no chat
  if (chatController.chatState.has(ctx.from.id)) {
    await chatController.forwardPatientPhoto(ctx, bot);
    return;
  }
  
  // Verifica se está no fluxo do diário alimentar
  if (foodDiaryController.diaryState.has(ctx.from.id)) {
    await foodDiaryController.handleDiaryPhoto(ctx);
    return;
  }
  
  // Senão, trata como upload normal
  await fileController.handlePhotoUpload(ctx, bot);
});

// Callbacks de pagamento
bot.action('PAYMENT_SHOW_PLANS', async (ctx) => {
  await ctx.answerCbQuery();
  await paymentController.showPlans(ctx);
});

bot.action(/^PAYMENT_PLAN_(.+)$/, requireRegistration(async (ctx) => {
  const planType = ctx.match[1];
  await paymentController.generatePaymentLink(ctx, planType);
}));

// Geração de PIX (QR) por plano
bot.action(/^PAYMENT_PIX_(.+)$/, requireRegistration(async (ctx) => {
  const planType = ctx.match[1];
  await paymentController.generatePixPayment(ctx, planType);
}));

bot.action('PAYMENT_HISTORY', async (ctx) => {
  await paymentController.showPaymentHistory(ctx);
});

// Processa lembretes pendentes a cada 2 minutos.
const processReminders = async () => {
  try {
    const reminders = await reminderService.getPendingReminders();
    
    for (const reminder of reminders) {
      try {
        await bot.telegram.sendMessage(
          reminder.telegram_id,
          `🔔 *Lembrete*\n\n${reminder.message}`,
          { parse_mode: 'Markdown' }
        );
        await reminderService.markReminderAsSent(reminder.id);
        console.log(`Lembrete enviado para ${reminder.telegram_id}`);
      } catch (error) {
        console.error(`Erro ao enviar lembrete ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
  }
};

// Inicia processamento periódico de lembretes.
setInterval(processReminders, 2 * 60 * 1000); // A cada 2 minutos
processReminders(); // Executa imediatamente ao iniciar

// Webhook do Mercado Pago para confirmação de pagamentos
app.post('/webhook/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Webhook Mercado Pago recebido:', { type, data });

    // Processa apenas notificações de pagamento
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Busca informações do pagamento
      const paymentInfo = await paymentService.getPaymentInfo(paymentId);
      
      console.log('Informações do pagamento:', JSON.stringify(paymentInfo, null, 2));

      // Extrai o preference_id correto do objeto de pagamento
      const preferenceId = paymentInfo.metadata?.preference_id || 
                          paymentInfo.additional_info?.preference_id ||
                          paymentInfo.order?.preference_id;

      if (!preferenceId) {
        console.error('Preference ID não encontrado no pagamento:', paymentId);
        // Responde OK mesmo assim para não ficar reprocessando
        res.status(200).send('OK');
        return;
      }

      console.log('Atualizando pagamento com preference_id:', preferenceId);

      // Atualiza status no banco usando o preference_id correto
      const payment = await paymentService.updatePaymentStatus(
        preferenceId,
        paymentInfo
      );

      if (!payment) {
        console.error('Pagamento não encontrado no banco para preference_id:', preferenceId);
        res.status(200).send('OK');
        return;
      }

      console.log('Pagamento atualizado:', payment);

      // Se aprovado, renova o plano
      if (paymentInfo.status === 'approved') {
        const [telegramId] = paymentInfo.external_reference.split('_');
        
        await paymentService.renewPatientPlan(
          parseInt(telegramId),
          payment.plan_days
        );

        // Notifica paciente
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + payment.plan_days);

        await bot.telegram.sendMessage(
          parseInt(telegramId),
          `✅ *Pagamento Aprovado!*\n\n` +
          `💰 Valor: R$ ${payment.amount.toFixed(2)}\n` +
          `📅 Plano renovado por ${payment.plan_days} dias\n` +
          `📆 Válido até: ${newEndDate.toLocaleDateString('pt-BR')}\n\n` +
          `🎉 Obrigada pela confiança!\n` +
          `Continue seu acompanhamento nutricional conosco! 💚`,
          { parse_mode: 'Markdown' }
        );

        console.log(`✅ Plano renovado para telegram_id ${telegramId}`);
      }
    }

    // Responde rapidamente ao Mercado Pago (sempre 200)
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Erro ao processar webhook Mercado Pago:', error);
    // Responde 200 para evitar retry infinito do Mercado Pago
    res.status(200).send('OK');
  }
});

// Rotas de redirecionamento pós-pagamento
app.get('/payment/success', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: green;">✅ Pagamento Aprovado!</h1>
        <p>Seu plano será renovado em instantes.</p>
        <p>Você receberá uma confirmação no Telegram.</p>
        <p><a href="https://t.me/seu_bot">Voltar ao Telegram</a></p>
      </body>
    </html>
  `);
});

app.get('/payment/failure', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: red;">❌ Pagamento Não Aprovado</h1>
        <p>Houve um problema com seu pagamento.</p>
        <p>Tente novamente ou entre em contato conosco.</p>
        <p><a href="https://t.me/seu_bot">Voltar ao Telegram</a></p>
      </body>
    </html>
  `);
});

app.get('/payment/pending', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: orange;">⏳ Pagamento Pendente</h1>
        <p>Seu pagamento está sendo processado.</p>
        <p>Você receberá uma notificação quando for aprovado.</p>
        <p><a href="https://t.me/seu_bot">Voltar ao Telegram</a></p>
      </body>
    </html>
  `);
});

if (WEBHOOK_DOMAIN) {
  const webhookUrl = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
  // Lança o bot em modo webhook (evita erro de stop sem estado "running")
  bot.launch({ webhook: { domain: WEBHOOK_DOMAIN, hookPath: WEBHOOK_PATH } })
    .then(() => console.log(`Webhook configurado em ${webhookUrl}`))
    .catch((err) => console.error('Erro ao configurar webhook:', err));
  app.use(bot.webhookCallback(WEBHOOK_PATH));
} else {
  bot.launch();
  console.log('Bot iniciado no modo polling. Configure WEBHOOK_DOMAIN para produção.');
}

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Telegram bot operando.' });
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP escutando na porta ${PORT}`);
});

const safeStop = (signal) => {
  try {
    if (bot && bot.telegram) {
      bot.stop(signal);
    }
  } catch (err) {
    console.warn(`Bot não estava em execução ao receber ${signal}:`, err.message);
  }
};

process.once('SIGINT', () => safeStop('SIGINT'));
process.once('SIGTERM', () => safeStop('SIGTERM'));
