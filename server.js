const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!process.env.GROQ_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Configure GROQ_API_KEY no arquivo .env.' }));
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 64_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const messages = Array.isArray(input.messages) ? input.messages : [];
        const allowed = messages.filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-20);
        if (!allowed.length || allowed[allowed.length - 1].role !== 'user') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Envie uma mensagem válida.' }));
        }
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: 'Você é JARVIS, um assistente pessoal inteligente, cordial e conciso. Responda em português brasileiro, a menos que a pessoa peça outro idioma. Seja claro e não afirme que executou ações fora deste chat.' }, ...allowed],
            temperature: 0.7,
            max_completion_tokens: 700
          })
        });
        const data = await upstream.json();
        if (!upstream.ok) {
          res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: data.error?.message || 'A API Groq não aceitou a solicitação.' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ reply: data.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta.' }));
      } catch (error) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message || 'Falha ao comunicar com a API Groq.' }));
      }
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); return res.end('Method Not Allowed');
  }
  let requested;
  try { requested = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { res.writeHead(400); return res.end('Bad Request'); }
  if (requested === '/') requested = '/jarvis.html';
  if (requested !== '/jarvis.html') { res.writeHead(404); return res.end('Not Found'); }
  const filename = path.join(root, 'jarvis.html');
  fs.readFile(filename, (error, content) => {
    if (error) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
const port = Number(process.env.PORT) || 4173;
server.listen(port, '0.0.0.0', () => console.log(`Jarvis disponível na porta ${port}`));
