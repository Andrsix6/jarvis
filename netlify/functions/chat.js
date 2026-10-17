const MAX_BODY = 64_000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json(503, { error: 'A chave GROQ_API_KEY ainda não foi configurada no Netlify.' });
  }
  if (!event.body || Buffer.byteLength(event.body, 'utf8') > MAX_BODY) {
    return json(413, { error: 'A mensagem excede o tamanho permitido.' });
  }
  try {
    const input = JSON.parse(event.body);
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const allowed = messages
      .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .slice(-20);
    if (!allowed.length || allowed[allowed.length - 1].role !== 'user') {
      return json(400, { error: 'Envie uma mensagem válida.' });
    }
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é JARVIS, um assistente pessoal inteligente, cordial e conciso. Responda em português brasileiro, a menos que a pessoa peça outro idioma. Seja claro e não afirme que executou ações fora deste chat.',
          },
          ...allowed,
        ],
        temperature: 0.7,
        max_completion_tokens: 700,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      return json(upstream.status, { error: data.error?.message || 'A API Groq não aceitou a solicitação.' });
    }
    return json(200, { reply: data.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta.' });
  } catch (error) {
    return json(502, { error: error.message || 'Falha ao comunicar com a API Groq.' });
  }
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data),
  };
}
