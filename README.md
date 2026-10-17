# Jarvis — Netlify

Interface web com respostas da API Groq por uma Netlify Function. A chave não fica no navegador nem nos arquivos publicados.

## Publicar no Netlify

1. Envie o conteúdo desta pasta (`outputs`) para um repositório Git privado e conecte o repositório ao Netlify. Configure `outputs` como base directory se o repositório contiver também outros diretórios.
2. O `netlify.toml` publica `site/`, compila `netlify/functions/chat.js` e encaminha `/api/chat` para a Function.
3. No painel Netlify, abra **Site configuration → Environment variables** e crie `GROQ_API_KEY` com uma chave Groq válida. Não coloque a chave no HTML, no Git ou no `netlify.toml`.
4. Faça o deploy. As mensagens serão atendidas pela Function.

O Node.js 20 ou superior é usado pela Function. Para desenvolvimento local, o servidor da raiz usa a mesma interface e lê `GROQ_API_KEY` de `.env`.

## Executar localmente

Execute `npm start` nesta pasta e abra `http://localhost:4173`.
