// Controlador exclusivo para funcionalidades administrativas da nutricionista.
'use strict';

const { Markup } = require('telegraf');
const { supabase, tableName, filesTableName } = require('../config/supabase');
const { isAdmin, sendDashboardStats, notifyExpiringPlans } = require('../services/adminService');

// Menu administrativo com funcionalidades exclusivas.
const buildAdminMenu = () =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Dashboard', 'ADMIN_DASHBOARD'),
      Markup.button.callback('👥 Pacientes', 'ADMIN_VIEW_PATIENT')
    ],
    [
      Markup.button.callback('📝 Questionários', 'ADMIN_FOOD_RECORDS'),
      Markup.button.callback('⚠️ Vencendo', 'ADMIN_EXPIRING_PLANS')
    ],
    [
      Markup.button.callback('❌ Vencidos', 'ADMIN_EXPIRED_PLANS'),
      Markup.button.callback('📢 Enviar Mensagem', 'ADMIN_BROADCAST_MENU')
    ],
  ]);

// Verifica se o usuário é admin antes de executar comandos.
const requireAdmin = (handler) => async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('⛔ Acesso negado. Apenas administradores podem usar este comando.');
    return;
  }
  await handler(ctx);
};

// Mostra menu administrativo.
const showAdminMenu = async (ctx) => {
  await ctx.replyWithMarkdown(
    '🔐 *Painel Administrativo*\n\nEscolha uma opção:',
    buildAdminMenu()
  );
};

// Retorna estatísticas gerais do sistema.
const getDashboardStats = async (ctx) => {
  try {
    const { data: patients } = await supabase.from(tableName).select('plan_end_date');
    const { data: files } = await supabase.from(filesTableName).select('id');
    
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activePlans = patients.filter(p => new Date(p.plan_end_date) > now).length;
    const expiringSoon = patients.filter(p => {
      const end = new Date(p.plan_end_date);
      return end > now && end <= in7Days;
    }).length;
    const expired = patients.filter(p => new Date(p.plan_end_date) <= now).length;

    const stats = {
      totalPatients: patients.length,
      activePlans,
      expiringSoon,
      expired,
      totalFiles: files?.length || 0,
    };

    await sendDashboardStats(
      (text, opts) => ctx.replyWithMarkdown(text, opts),
      stats
    );
  } catch (error) {
    await ctx.reply('❌ Erro ao buscar estatísticas.');
    console.error(error);
  }
};

// Lista todos os pacientes cadastrados.
const listAllPatients = async (ctx) => {
  try {
    const { data: patients } = await supabase
      .from(tableName)
      .select('name, telegram_id, plan_end_date')
      .order('name');

    if (!patients || patients.length === 0) {
      await ctx.reply('📭 Nenhum paciente cadastrado ainda.');
      return;
    }

    let message = '👥 *Lista de Pacientes*\n\n';
    patients.forEach((p, idx) => {
      const status = new Date(p.plan_end_date) > new Date() ? '✅' : '❌';
      message += `${idx + 1}. ${status} ${p.name}\n   ID: ${p.telegram_id}\n\n`;
    });

    await ctx.replyWithMarkdown(message);
  } catch (error) {
    await ctx.reply('❌ Erro ao listar pacientes.');
    console.error(error);
  }
};

// Mostra pacientes com planos vencendo nos próximos 7 dias.
const showExpiringPlans = async (ctx) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: patients } = await supabase
      .from(tableName)
      .select('name, plan_end_date')
      .gte('plan_end_date', now.toISOString())
      .lte('plan_end_date', in7Days.toISOString())
      .order('plan_end_date');

    if (!patients || patients.length === 0) {
      await ctx.reply('✅ Nenhum plano vencendo nos próximos 7 dias.');
      return;
    }

    let message = '⚠️ *Planos Vencendo em 7 Dias*\n\n';
    patients.forEach((p, idx) => {
      const daysLeft = Math.ceil((new Date(p.plan_end_date) - now) / (1000 * 60 * 60 * 24));
      const dateStr = new Date(p.plan_end_date).toLocaleDateString('pt-BR');
      message += `${idx + 1}. ${p.name}\n   📅 ${dateStr} (${daysLeft} dia(s))\n\n`;
    });

    await ctx.replyWithMarkdown(message);
  } catch (error) {
    await ctx.reply('❌ Erro ao buscar planos vencendo.');
    console.error(error);
  }
};

// Mostra pacientes com planos já vencidos.
const showExpiredPlans = async (ctx) => {
  try {
    const now = new Date();

    const { data: patients } = await supabase
      .from(tableName)
      .select('name, plan_end_date')
      .lt('plan_end_date', now.toISOString())
      .order('plan_end_date', { ascending: false });

    if (!patients || patients.length === 0) {
      await ctx.reply('✅ Nenhum plano vencido no momento.');
      return;
    }

    let message = '❌ *Planos Vencidos*\n\n';
    patients.forEach((p, idx) => {
      const dateStr = new Date(p.plan_end_date).toLocaleDateString('pt-BR');
      message += `${idx + 1}. ${p.name}\n   📅 Vencido em ${dateStr}\n\n`;
    });

    await ctx.replyWithMarkdown(message);
  } catch (error) {
    await ctx.reply('❌ Erro ao buscar planos vencidos.');
    console.error(error);
  }
};

// Menu de opções de broadcast.
const buildBroadcastMenu = () =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('👥 Todos', 'ADMIN_BROADCAST_ALL'),
      Markup.button.callback('✅ Ativos', 'ADMIN_BROADCAST_ACTIVE')
    ],
    [
      Markup.button.callback('⚠️ Vencendo', 'ADMIN_BROADCAST_EXPIRING'),
      Markup.button.callback('🔙 Voltar', 'ADMIN_BACK')
    ],
  ]);

// Mostra menu de opções de broadcast.
const showBroadcastMenu = async (ctx) => {
  await ctx.replyWithMarkdown(
    '📢 *Enviar Mensagem em Massa*\n\n' +
    'Escolha o grupo de destinatários:',
    buildBroadcastMenu()
  );
};

// Estado para guardar mensagem pendente de broadcast.
const broadcastState = new Map();

// Solicita mensagem para broadcast.
const requestBroadcastMessage = async (ctx, targetGroup) => {
  broadcastState.set(ctx.from.id, { targetGroup, awaiting: true });
  
  await ctx.replyWithMarkdown(
    '✏️ *Digite a mensagem*\n\n' +
    'Envie a mensagem que deseja transmitir para os pacientes.\n\n' +
    '💡 _Você pode usar *negrito* e _itálico_ no texto._'
  );
};

// Processa e envia broadcast.
const handleBroadcastMessage = async (ctx, bot) => {
  const state = broadcastState.get(ctx.from.id);
  if (!state || !state.awaiting) {
    return false;
  }

  const message = ctx.message.text;
  broadcastState.delete(ctx.from.id);

  try {
    let query = supabase.from(tableName).select('telegram_id, name');
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Filtra por grupo
    if (state.targetGroup === 'active') {
      query = query.gte('plan_end_date', now.toISOString());
    } else if (state.targetGroup === 'expiring') {
      query = query.gte('plan_end_date', now.toISOString()).lte('plan_end_date', in7Days.toISOString());
    }

    const { data: patients } = await query;

    if (!patients || patients.length === 0) {
      await ctx.reply('❌ Nenhum paciente encontrado neste grupo.');
      return true;
    }

    await ctx.reply(`📤 Enviando mensagem para ${patients.length} paciente(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const patient of patients) {
      try {
        await bot.telegram.sendMessage(
          patient.telegram_id,
          `📢 *Mensagem da Nutricionista*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Evita spam
      } catch (error) {
        failCount++;
        console.error(`Erro ao enviar para ${patient.name}:`, error);
      }
    }

    await ctx.replyWithMarkdown(
      `✅ *Mensagem enviada!*\n\n` +
      `✔️ Sucesso: ${successCount}\n` +
      `❌ Falhas: ${failCount}`
    );
  } catch (error) {
    console.error('Erro ao enviar broadcast:', error);
    await ctx.reply('❌ Erro ao enviar mensagens.');
  }

  return true;
};

// Estado para seleção de paciente.
const patientSelectionState = new Map();

// Mostra lista de pacientes para seleção com paginação.
const showPatientSelection = async (ctx, page = 0) => {
  try {
    const { data: patients } = await supabase
      .from(tableName)
      .select('name, telegram_id, plan_end_date')
      .order('name');

    if (!patients || patients.length === 0) {
      const message = '📭 Nenhum paciente cadastrado ainda.';
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message);
      } else {
        await ctx.reply(message);
      }
      return;
    }

    const pageSize = 10;
    const totalPages = Math.ceil(patients.length / pageSize);
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedPatients = patients.slice(start, end);

    const now = new Date();
    const buttons = paginatedPatients.map((p) => {
      const planEnd = new Date(p.plan_end_date);
      const status = planEnd > now ? '✅' : '❌';
      return [
        Markup.button.callback(
          `${status} ${p.name}`,
          `ADMIN_SELECT_PATIENT_${p.telegram_id}`
        )
      ];
    });
    
    // Botões de navegação
    const navButtons = [];
    if (page > 0) {
      navButtons.push(Markup.button.callback('⬅️ Anterior', `ADMIN_PATIENTS_PAGE_${page - 1}`));
    }
    if (page < totalPages - 1) {
      navButtons.push(Markup.button.callback('➡️ Próximo', `ADMIN_PATIENTS_PAGE_${page + 1}`));
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }
    
    buttons.push([Markup.button.callback('🔙 Voltar', 'ADMIN_BACK')]);

    const messageText = 
      `🔍 *Selecione um Paciente*\n\n` +
      `Página ${page + 1} de ${totalPages}\n` +
      `Total: ${patients.length} paciente(s)\n\n` +
      '✅ = Ativo | ❌ = Vencido';

    if (ctx.callbackQuery) {
      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.replyWithMarkdown(messageText, Markup.inlineKeyboard(buttons));
    }
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    await ctx.reply('❌ Erro ao carregar pacientes.');
  }
};

// Mostra análise completa de um paciente específico.
const showPatientAnalysis = async (ctx, telegramId) => {
  try {
    // Busca dados do paciente
    const { data: patient } = await supabase
      .from(tableName)
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (!patient) {
      await ctx.reply('❌ Paciente não encontrado.');
      return;
    }

    // Busca histórico de peso
    const { data: weightHistory } = await supabase
      .from('weight_history')
      .select('weight, recorded_at')
      .eq('telegram_id', telegramId)
      .order('recorded_at', { ascending: false })
      .limit(5);

    // Busca arquivos
    const { data: files } = await supabase
      .from(filesTableName)
      .select('file_type, uploaded_at')
      .eq('telegram_id', telegramId)
      .order('uploaded_at', { ascending: false });

    // Calcula estatísticas
    const now = new Date();
    const planEnd = new Date(patient.plan_end_date);
    const daysRemaining = Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24));
    const status = daysRemaining > 0 ? '✅ Ativo' : '❌ Vencido';

    let message = `👤 *Análise de Paciente*\n\n`;
    message += `📋 *Dados Pessoais*\n`;
    message += `Nome: ${patient.name}\n`;
    message += `Idade: ${patient.age} anos\n`;
    message += `Sexo: ${patient.gender === 'M' ? 'Masculino' : 'Feminino'}\n`;
    message += `ID: ${patient.telegram_id}\n\n`;

    message += `⚖️ *Medidas Atuais*\n`;
    message += `Peso: ${patient.weight} kg\n`;
    message += `Altura: ${patient.height} cm\n\n`;

    message += `🎯 *Objetivo*\n`;
    message += `${patient.objective}\n\n`;

    message += `🥗 *Restrições*\n`;
    message += `${patient.restrictions}\n\n`;

    if (weightHistory && weightHistory.length > 0) {
      message += `📊 *Histórico de Peso (últimos 5)*\n`;
      weightHistory.forEach((w, idx) => {
        const date = new Date(w.recorded_at).toLocaleDateString('pt-BR');
        message += `${idx + 1}. ${w.weight} kg - ${date}\n`;
      });
      message += `\n`;
    }

    message += `📁 *Arquivos*\n`;
    message += `Total: ${files?.length || 0} arquivo(s)\n\n`;

    message += `📅 *Status do Plano*\n`;
    message += `${status}\n`;
    message += `Vencimento: ${planEnd.toLocaleDateString('pt-BR')}\n`;
    if (daysRemaining > 0) {
      message += `Dias restantes: ${daysRemaining}\n`;
    }

    const buttons = [
      [Markup.button.callback('📊 Evolução Peso', `ADMIN_PATIENT_WEIGHT_${telegramId}`)],
      [Markup.button.callback('📂 Ver Arquivos', `ADMIN_PATIENT_FILES_${telegramId}`)],
      [Markup.button.callback('💬 Enviar Mensagem', `ADMIN_MESSAGE_PATIENT_${telegramId}`)],
      [Markup.button.callback('🔄 Resetar Cadastro', `ADMIN_RESET_REGISTRATION_${telegramId}`)],
      [Markup.button.callback('🔙 Voltar', 'ADMIN_VIEW_PATIENT')],
    ];

    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Erro ao mostrar análise:', error);
    await ctx.reply('❌ Erro ao carregar análise do paciente.');
  }
};

// Mostra evolução completa de peso do paciente.
const showPatientWeightHistory = async (ctx, telegramId) => {
  try {
    const { data: patient } = await supabase
      .from(tableName)
      .select('name')
      .eq('telegram_id', telegramId)
      .single();

    const { data: weightHistory } = await supabase
      .from('weight_history')
      .select('weight, recorded_at')
      .eq('telegram_id', telegramId)
      .order('recorded_at', { ascending: false });

    if (!weightHistory || weightHistory.length === 0) {
      await ctx.reply('📭 Este paciente ainda não tem histórico de peso.');
      return;
    }

    let message = `📊 *Evolução de Peso - ${patient.name}*\n\n`;
    
    weightHistory.forEach((w, idx) => {
      const date = new Date(w.recorded_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const time = new Date(w.recorded_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      message += `${idx + 1}. *${w.weight} kg*\n   📅 ${date} às ${time}\n\n`;
    });

    // Calcula variação
    if (weightHistory.length > 1) {
      const first = weightHistory[weightHistory.length - 1].weight;
      const last = weightHistory[0].weight;
      const diff = (last - first).toFixed(1);
      const percent = ((diff / first) * 100).toFixed(1);
      const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
      
      message += `\n${emoji} *Variação Total*\n`;
      message += `${diff > 0 ? '+' : ''}${diff} kg (${percent > 0 ? '+' : ''}${percent}%)`;
    }

    await ctx.replyWithMarkdown(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Voltar', `ADMIN_SELECT_PATIENT_${telegramId}`)]
      ])
    );
  } catch (error) {
    console.error('Erro ao mostrar peso:', error);
    await ctx.reply('❌ Erro ao carregar histórico de peso.');
  }
};

// Mostra todos os arquivos do paciente.
const showPatientFiles = async (ctx, telegramId) => {
  try {
    const { data: patient } = await supabase
      .from(tableName)
      .select('name')
      .eq('telegram_id', telegramId)
      .single();

    const { data: files } = await supabase
      .from(filesTableName)
      .select('file_name, file_type, file_url, uploaded_at')
      .eq('telegram_id', telegramId)
      .order('uploaded_at', { ascending: false });

    if (!files || files.length === 0) {
      await ctx.reply('📭 Este paciente ainda não enviou arquivos.');
      return;
    }

    let message = `📂 *Arquivos - ${patient.name}*\n\n`;
    message += `Total: ${files.length} arquivo(s)\n\n`;
    
    files.forEach((f, idx) => {
      const date = new Date(f.uploaded_at).toLocaleDateString('pt-BR');
      const typeEmoji = f.file_type === 'photo' ? '📷' : '📄';
      message += `${idx + 1}. ${typeEmoji} ${f.file_name}\n`;
      message += `   📅 ${date}\n`;
      message += `   🔗 [Abrir arquivo](${f.file_url})\n\n`;
    });

    await ctx.replyWithMarkdown(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Voltar', `ADMIN_SELECT_PATIENT_${telegramId}`)]
      ]),
      { disable_web_page_preview: true }
    );
  } catch (error) {
    console.error('Erro ao mostrar arquivos:', error);
    await ctx.reply('❌ Erro ao carregar arquivos.');
  }
};

// State para gerenciar processo de reset
const resetRegistrationState = new Map();

// Solicita confirmação antes de resetar o cadastro
const confirmResetRegistration = async (ctx, telegramId) => {
  try {
    const { data: patient } = await supabase
      .from(tableName)
      .select('name, plan_start_date, plan_end_date')
      .eq('telegram_id', telegramId)
      .single();

    if (!patient) {
      await ctx.reply('❌ Paciente não encontrado.');
      return;
    }

    const message = (
      `⚠️ *ATENÇÃO: Resetar Cadastro*\n\n` +
      `Paciente: *${patient.name}*\n\n` +
      `Esta ação irá:\n` +
      `✅ Manter o plano atual (datas preservadas)\n` +
      `✅ Manter histórico de peso\n` +
      `✅ Manter arquivos enviados\n` +
      `❌ Apagar dados cadastrais (nome, idade, sexo, peso, altura, objetivo, restrições)\n\n` +
      `O paciente precisará *refazer o cadastro completo* (7 perguntas) quando enviar /start novamente.\n\n` +
      `⚠️ *Tem certeza que deseja continuar?*`
    );

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Sim, Resetar', `ADMIN_CONFIRM_RESET_${telegramId}`)],
      [Markup.button.callback('❌ Cancelar', `ADMIN_SELECT_PATIENT_${telegramId}`)],
    ]);

    await ctx.replyWithMarkdown(message, buttons);
  } catch (error) {
    console.error('Erro ao confirmar reset:', error);
    await ctx.reply('❌ Erro ao processar solicitação.');
  }
};

// Executa o reset do cadastro mantendo o plano
const executeResetRegistration = async (ctx, telegramId) => {
  try {
    // Busca dados atuais do plano
    const { data: currentPatient } = await supabase
      .from(tableName)
      .select('name, plan_start_date, plan_end_date')
      .eq('telegram_id', telegramId)
      .single();

    if (!currentPatient) {
      await ctx.reply('❌ Paciente não encontrado.');
      return;
    }

    const patientName = currentPatient.name;

    // Deleta apenas o registro do paciente (mantém peso e arquivos por FK)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('telegram_id', telegramId);

    if (deleteError) {
      throw deleteError;
    }

    await ctx.replyWithMarkdown(
      `✅ *Cadastro Resetado com Sucesso!*\n\n` +
      `Paciente: *${patientName}*\n\n` +
      `📋 O cadastro foi apagado, mas:\n` +
      `✅ Histórico de peso foi mantido\n` +
      `✅ Arquivos foram mantidos\n` +
      `⚠️ As datas do plano foram preservadas\n\n` +
      `Quando o paciente enviar */start*, ele precisará refazer o cadastro completo.\n` +
      `Após completar, os dados do plano anterior serão restaurados automaticamente.`
    );

    // Notifica o paciente
    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '⚠️ *Seu cadastro foi resetado pela nutricionista*\n\n' +
        'Para continuar usando o sistema, você precisa refazer seu cadastro.\n\n' +
        'Envie /start para começar.',
        { parse_mode: 'Markdown' }
      );
    } catch (notifyError) {
      console.log('Não foi possível notificar o paciente:', notifyError.message);
    }

    // Volta para o menu admin
    await showAdminMenu(ctx);
  } catch (error) {
    console.error('Erro ao resetar cadastro:', error);
    await ctx.reply('❌ Erro ao resetar cadastro. Tente novamente.');
  }
};

// Lista questionários alimentares recebidos
const showFoodRecords = async (ctx, page = 1) => {
  try {
    const limit = 10;
    const offset = (page - 1) * limit;

    // Busca questionários com informações do paciente
    const { data: records, error: recordsError, count } = await supabase
      .from('food_records')
      .select('*, patients!inner(name, telegram_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (recordsError) throw recordsError;

    if (!records || records.length === 0) {
      await ctx.replyWithMarkdown(
        '📝 *Questionários Alimentares*\n\n' +
        '❌ Nenhum questionário recebido ainda.\n\n' +
        '_Os pacientes com plano ativo podem enviar 1 questionário por mês._',
        buildAdminMenu()
      );
      return;
    }

    const totalPages = Math.ceil(count / limit);
    let message = `📝 *Questionários Recebidos* (${count})\n`;
    message += `📄 Página ${page} de ${totalPages}\n\n`;

    const buttons = [];

    records.forEach((record, idx) => {
      const date = new Date(record.created_at).toLocaleDateString('pt-BR');
      const time = new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      buttons.push([
        Markup.button.callback(
          `${offset + idx + 1}. ${record.patients.name} - ${date}`,
          `ADMIN_VIEW_FOOD_RECORD_${record.id}`
        )
      ]);
    });

    // Navegação
    const navButtons = [];
    if (page > 1) {
      navButtons.push(Markup.button.callback('⬅️ Anterior', `ADMIN_FOOD_RECORDS_PAGE_${page - 1}`));
    }
    if (page < totalPages) {
      navButtons.push(Markup.button.callback('➡️ Próximo', `ADMIN_FOOD_RECORDS_PAGE_${page + 1}`));
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    buttons.push([Markup.button.callback('🔙 Voltar', 'ADMIN_BACK')]);

    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Erro ao listar questionários:', error);
    await ctx.reply('❌ Erro ao buscar questionários.');
  }
};

// Exibe detalhes de um questionário específico
const showFoodRecordDetails = async (ctx, recordId) => {
  try {
    const { data: record, error } = await supabase
      .from('food_records')
      .select('*, patients!inner(name, telegram_id)')
      .eq('id', recordId)
      .single();

    if (error || !record) {
      await ctx.reply('❌ Questionário não encontrado.');
      return;
    }

    const date = new Date(record.created_at).toLocaleString('pt-BR');
    const data = record.data;

    let message = `📝 *Questionário Nutricional*\n\n`;
    message += `👤 *Paciente:* ${record.patients.name}\n`;
    message += `📅 *Data:* ${date}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    const fields = [
      ['1) Nome, idade, altura e peso atual', data.dados_basicos],
      ['2) Objetivo principal', data.objetivo],
      ['3) Doenças diagnosticadas', data.doencas],
      ['4) Medicamentos/Suplementos', data.medicamentos],
      ['5) Cirurgias (qual/quando)', data.cirurgias],
      ['6) Exames recentes', data.exames],
      ['7) Rotina diária', data.rotina],
      ['8) Atividade física (qual/vezes)', data.atividade_fisica],
      ['9) Refeições por dia e como come', data.refeicoes],
      ['10) Alergias/Intolerâncias/Alimentos que evita', data.alergias],
      ['11) Intestino (frequência/gases/inchaço)', data.intestino],
      ['12) Consumo de álcool', data.alcool],
      ['13) Água por dia', data.agua],
      ['14) Ansiedade/compulsão/beliscar', data.emocional],
      ['15) Alimentos que mais e menos gosta', data.preferencias],
      ['16) Peso ideal/meta', data.meta_peso],
    ];

    fields.forEach(([title, value]) => {
      message += `*${title}:*\n${value || 'Não informado'}\n\n`;
    });

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('💬 Responder Paciente', `ADMIN_REPLY_${record.patients.telegram_id}`)],
      [Markup.button.callback('🔙 Voltar', 'ADMIN_FOOD_RECORDS')],
    ]);

    await ctx.replyWithMarkdown(message, buttons);
  } catch (error) {
    console.error('Erro ao mostrar questionário:', error);
    await ctx.reply('❌ Erro ao carregar questionário.');
  }
};

module.exports = {
  requireAdmin,
  showAdminMenu,
  getDashboardStats,
  listAllPatients,
  showExpiringPlans,
  showExpiredPlans,
  buildAdminMenu,
  showBroadcastMenu,
  requestBroadcastMessage,
  handleBroadcastMessage,
  broadcastState,
  showPatientSelection,
  showPatientAnalysis,
  showPatientWeightHistory,
  showPatientFiles,
  patientSelectionState,
  confirmResetRegistration,
  executeResetRegistration,
  resetRegistrationState,
  showFoodRecords,
  showFoodRecordDetails,
};
