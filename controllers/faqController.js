'use strict';

const { Markup } = require('telegraf');

// FAQ entries: keep answers curtas e objetivas.
const FAQ_TOPICS = [
  {
    id: 'pagamentos',
    title: 'Pagamentos e planos',
    keywords: ['pagamento', 'plano', 'boleto', 'pix', 'cartao', 'cartão', 'renovar'],
    answer: `💳 *Pagamentos e planos*
- Aceitamos cartão e PIX.
- Ao pagar, o plano renova em minutos.
- Se o status ficar pendente, me avise aqui para conferir o webhook.
- Faturas vencem no mesmo dia da contratação.`
  },
  {
    id: 'acesso',
    title: 'Acesso e cadastro',
    keywords: ['cadastro', 'login', 'acesso', 'primeiro'],
    answer: `👤 *Acesso e cadastro*
- Use /start para iniciar o cadastro.
- Se parou no meio, digite /menu e retome.
- Para editar dados, use "📋 Meu Cadastro".`
  },
  {
    id: 'planos',
    title: 'Planos e validade',
    keywords: ['validade', 'plano ativo', 'expira', 'renovar', 'data'],
    answer: `📆 *Planos e validade*
- Veja a validade em "📆 Validade Plano".
- Renovar: "💰 Renovar Plano".
- Após expirar, algumas funções ficam bloqueadas até renovar.`
  },
  {
    id: 'treinos',
    title: 'Treinos',
    keywords: ['treino', 'academia', 'workout'],
    answer: `🏋️ *Treinos*
- Gere um treino em "🏋️ Gerar Treino".
- Escolha nível, grupamento e tipo.
- Se estiver fácil/difícil, me avise que ajusto a carga.`
  },
  {
    id: 'alimentacao',
    title: 'Alimentação e diário',
    keywords: ['alimentacao', 'alimentação', 'diario', 'diário', 'refeicao', 'refeição'],
    answer: `🥗 *Alimentação*
- Envie fotos em "📸 Diário Alimentar".
- Receitas: "🍽️ Receitas".
- Questionário alimentar: "📝 Enviar Questionário".`
  },
  {
    id: 'contato',
    title: 'Falar com a Nutri',
    keywords: ['nutri', 'nutricionista', 'humano', 'atendente'],
    answer: `👩‍⚕️ *Falar com a Nutri*
- Use "💬 Chat Nutricionista" para falar diretamente.
- Se for urgente, escreva "URGENTE" na mensagem.`
  }
];

const buildTopicsKeyboard = () =>
  Markup.inlineKeyboard([
    ...FAQ_TOPICS.map((t) => [Markup.button.callback(`❓ ${t.title}`, `FAQ_TOPIC_${t.id}`)]),
    [Markup.button.callback('🔙 Voltar', 'back_to_menu')]
  ]);

const showFaqMenu = async (ctx) => {
  await ctx.replyWithMarkdown(
    '❓ *FAQ Rápido*\nEscolha um tema ou digite sua dúvida que eu tento responder automaticamente.',
    buildTopicsKeyboard()
  );
};

const findAnswer = (text) => {
  if (!text) return null;
  const q = text.toLowerCase();
  for (const topic of FAQ_TOPICS) {
    if (topic.keywords.some((k) => q.includes(k))) {
      return topic.answer;
    }
  }
  return null;
};

const handleTopic = async (ctx, topicId) => {
  const topic = FAQ_TOPICS.find((t) => t.id === topicId);
  if (!topic) return;
  await ctx.editMessageText(topic.answer, {
    parse_mode: 'Markdown',
    ...buildTopicsKeyboard()
  });
};

const handleFaqCommand = async (ctx) => {
  await showFaqMenu(ctx);
};

const maybeHandleFaqMessage = async (ctx) => {
  const answer = findAnswer(ctx.message?.text || '');
  if (!answer) return false;
  await ctx.replyWithMarkdown(answer, buildTopicsKeyboard());
  return true;
};

module.exports = {
  showFaqMenu,
  handleTopic,
  handleFaqCommand,
  maybeHandleFaqMessage,
};
