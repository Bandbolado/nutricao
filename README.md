# Telegram Patient Management Bot

Bot profissional para nutricionistas que cadastra pacientes, armazena dados no Supabase e aceita arquivos enviados diretamente no Telegram. Projeto desenhado para deploy 24/7 em Render ou Railway usando webhooks.

## Visão geral
- Fluxo guiado de cadastro com validações (nome, idade, peso, altura, objetivo e restrições).
- Armazena início e fim do plano (30 dias) automaticamente.
- Menu principal com atalhos para ver cadastro, enviar arquivos e consultar data de renovação.
- Upload seguro de arquivos (dietas, exames, fotos) para o Supabase Storage + histórico no banco.
- Código modular (controllers, services, utils) pronto para manutenção e evolução.

## Estrutura
```
/project
  /config
    supabase.js
  /controllers
    fileController.js
    menuController.js
    patientController.js
  /services
    fileService.js
    patientService.js
  /utils
    validators.js
  .env.example
  package.json
  README.md
  server.js
```

## Pré-requisitos
- Node.js 18+
- Conta Supabase com:
  - Tabela `patients` contendo ao menos as colunas: `telegram_id (unique)`, `name`, `age`, `weight`, `height`, `objective`, `restrictions`, `plan_start_date`, `plan_end_date`, `created_at`, `updated_at`.
  - Tabela `patient_files` com: `telegram_id`, `file_path`, `file_url`, `file_type`, `original_name`, `mime_type`, `uploaded_at`.
  - Bucket de storage (ex: `patient-files`) liberado para leitura pública.

## Configuração local
1. Copie o `.env.example` para `.env` e preencha as variáveis (BotFather + Supabase).
2. Instale dependências:
   ```bash
   npm install
   ```
3. Ambiente local (polling):
   ```bash
   npm run dev
   ```
4. Envie `/start` para o bot no Telegram e siga o fluxo.

## Deploy no Render/Railway
1. Suba o repositório para o GitHub.
2. Configure um serviço Web com build command `npm install` e start `npm start`.
3. No painel do provedor, defina as variáveis de ambiente conforme `.env.example`.
4. Informe `WEBHOOK_DOMAIN` com a URL pública (ex: `https://seuapp.onrender.com`).
5. Após o primeiro deploy, o servidor registrará o webhook automaticamente em `WEBHOOK_DOMAIN + WEBHOOK_PATH`.
6. Valide acessando `GET /` para checar status (`{ status: 'ok' }`).

## Boas práticas adicionais
- Proteja a `SUPABASE_SERVICE_ROLE_KEY` usando secrets do provedor.
- Habilite logs e alertas no Render/Railway para monitorar quedas.
- Considere agendar tarefas no Supabase para alertar próximos vencimentos (opcional).

Com isso o bot já estará pronto para operar 24/7 cuidando dos cadastros e arquivos dos pacientes.
