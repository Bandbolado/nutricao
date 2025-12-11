const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Markup } = require('telegraf');
const { supabase } = require('../config/supabase');
const { getPatientByTelegramId } = require('../services/patientService');

/**
 * Gera relatório em PDF para o paciente
 */
async function generatePatientReport(ctx) {
    const telegramId = ctx.from.id;

    try {
        await ctx.reply('📊 Gerando seu relatório... Aguarde alguns segundos.');

        const patient = await getPatientByTelegramId(telegramId);

        if (!patient) {
            return ctx.reply('❌ Você precisa estar cadastrado.');
        }

        // Buscar dados
        const [weightData, diaryData, questionnairesData] = await Promise.all([
            getWeightHistory(telegramId),
            getDiaryStats(telegramId),
            getQuestionnaireStats(telegramId)
        ]);

        // Criar PDF
        const fileName = `relatorio_${patient.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        // Garantir que a pasta temp existe
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Cabeçalho
        doc.fontSize(24)
            .fillColor('#10b981')
            .text('Relatório Nutricional', { align: 'center' });

        doc.fontSize(12)
            .fillColor('#666')
            .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })
            .moveDown(2);

        // Dados do paciente
        doc.fontSize(16)
            .fillColor('#000')
            .text('Informações do Paciente', { underline: true })
            .moveDown(0.5);

        doc.fontSize(12)
            .fillColor('#333')
            .text(`Nome: ${patient.name}`)
            .text(`Status do Plano: ${patient.plan_status === 'active' ? '✅ Ativo' : '⭕ Inativo'}`)
            .moveDown(1.5);

        // Evolução de Peso
        doc.fontSize(16)
            .fillColor('#000')
            .text('Evolução de Peso', { underline: true })
            .moveDown(0.5);

        if (weightData.length > 0) {
            const firstWeight = weightData[weightData.length - 1];
            const lastWeight = weightData[0];
            const diff = (lastWeight.weight - firstWeight.weight).toFixed(1);
            const diffPercent = ((diff / firstWeight.weight) * 100).toFixed(1);

            doc.fontSize(12)
                .fillColor('#333')
                .text(`Peso Inicial: ${firstWeight.weight} kg`)
                .text(`Peso Atual: ${lastWeight.weight} kg`)
                .fillColor(diff < 0 ? '#10b981' : '#ef4444')
                .text(`Variação: ${diff > 0 ? '+' : ''}${diff} kg (${diff > 0 ? '+' : ''}${diffPercent}%)`)
                .fillColor('#333')
                .text(`Total de pesagens: ${weightData.length}`)
                .moveDown(1);

            // Histórico recente
            doc.fontSize(14)
                .text('Últimas 5 pesagens:')
                .fontSize(11)
                .moveDown(0.3);

            weightData.slice(0, 5).forEach(w => {
                const date = new Date(w.weighed_at).toLocaleDateString('pt-BR');
                doc.text(`• ${date}: ${w.weight} kg`);
            });
        } else {
            doc.fontSize(12)
                .fillColor('#666')
                .text('Nenhum registro de peso ainda.');
        }

        doc.moveDown(1.5);

        // Diário Alimentar
        doc.fontSize(16)
            .fillColor('#000')
            .text('Diário Alimentar', { underline: true })
            .moveDown(0.5);

        doc.fontSize(12)
            .fillColor('#333')
            .text(`Total de registros: ${diaryData.total}`)
            .text(`Últimos 7 dias: ${diaryData.last7Days}`)
            .text(`Última refeição registrada: ${diaryData.lastEntry || 'Nenhuma'}`)
            .moveDown(1.5);

        // Questionários
        doc.fontSize(16)
            .fillColor('#000')
            .text('Questionários Alimentares', { underline: true })
            .moveDown(0.5);

        doc.fontSize(12)
            .fillColor('#333')
            .text(`Total de questionários: ${questionnairesData.total}`)
            .text(`Último enviado: ${questionnairesData.lastDate || 'Nenhum'}`)
            .moveDown(1.5);

        // Recomendações
        doc.fontSize(16)
            .fillColor('#000')
            .text('Recomendações', { underline: true })
            .moveDown(0.5);

        doc.fontSize(11)
            .fillColor('#333')
            .text('• Continue registrando suas refeições diariamente')
            .text('• Mantenha a regularidade nas pesagens (mínimo 1x por semana)')
            .text('• Preencha os questionários mensalmente')
            .text('• Entre em contato com a nutricionista para dúvidas')
            .moveDown(2);

        // Rodapé
        doc.fontSize(10)
            .fillColor('#666')
            .text('Este relatório foi gerado automaticamente pelo sistema.', { align: 'center' })
            .text('Nutricionista Caroline Barbosa', { align: 'center' })
            .text('@cbarbosans_bot', { align: 'center' });

        doc.end();

        // Aguardar finalização
        await new Promise((resolve) => stream.on('finish', resolve));

        // Enviar PDF
        await ctx.replyWithDocument(
            { source: filePath, filename: fileName },
            {
                caption: `📊 *Seu Relatório Nutricional*\n\n` +
                    `✅ Relatório gerado com sucesso!\n\n` +
                    `Este documento contém seu progresso e estatísticas.`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
                ])
            }
        );

        // Deletar arquivo temporário
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }, 5000);

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        ctx.reply('❌ Erro ao gerar relatório. Tente novamente mais tarde.');
    }
}

/**
 * Busca histórico de peso
 */
async function getWeightHistory(telegramId) {
    const { data } = await supabase
        .from('weight_history')
        .select('weight, weighed_at')
        .eq('telegram_id', telegramId)
        .order('weighed_at', { ascending: false })
        .limit(10);

    return data || [];
}

/**
 * Busca estatísticas do diário alimentar
 */
async function getDiaryStats(telegramId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: all } = await supabase
        .from('food_diary')
        .select('created_at', { count: 'exact' })
        .eq('telegram_id', telegramId);

    const { data: recent } = await supabase
        .from('food_diary')
        .select('created_at', { count: 'exact' })
        .eq('telegram_id', telegramId)
        .gte('created_at', sevenDaysAgo.toISOString());

    const { data: last } = await supabase
        .from('food_diary')
        .select('created_at')
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    return {
        total: all?.length || 0,
        last7Days: recent?.length || 0,
        lastEntry: last ? new Date(last.created_at).toLocaleDateString('pt-BR') : null
    };
}

/**
 * Busca estatísticas de questionários
 */
async function getQuestionnaireStats(telegramId) {
    const { data } = await supabase
        .from('food_records')
        .select('created_at', { count: 'exact' })
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false });

    return {
        total: data?.length || 0,
        lastDate: data?.[0] ? new Date(data[0].created_at).toLocaleDateString('pt-BR') : null
    };
}

/**
 * Menu do relatório
 */
async function showReportMenu(ctx) {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 Gerar Relatório Agora', 'report_generate')],
        [Markup.button.callback('📧 Enviar por Email (em breve)', 'report_email')],
        [Markup.button.callback('🔙 Voltar ao Menu', 'back_to_menu')]
    ]);

    await ctx.reply(
        `📊 *Relatório Nutricional*\n\n` +
        `Seu relatório contém:\n` +
        `• Evolução de peso com gráficos\n` +
        `• Estatísticas do diário alimentar\n` +
        `• Resumo de questionários\n` +
        `• Recomendações personalizadas\n\n` +
        `Clique no botão para gerar seu relatório em PDF:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

module.exports = {
    generatePatientReport,
    showReportMenu
};
