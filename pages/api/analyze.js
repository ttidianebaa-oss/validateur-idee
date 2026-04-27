const BASE_HEADERS = (apiKey) => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01'
});

const WEB_HEADERS = (apiKey) => ({
  ...BASE_HEADERS(apiKey),
  'anthropic-beta': 'web-search-2025-03-05'
});

async function callAnthropic(headers, body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erreur Anthropic');
  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
  }
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function handleStep1(apiKey, idea, horizon) {
  return callAnthropic(WEB_HEADERS(apiKey), {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 20000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Recherche web : données marché pour cette idée business.
Idée: "${idea}" — Horizon: ${horizon}.
Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "taille": "<valeur ou 'non trouvé'>",
  "taille_source": "<URL ou nom source>",
  "croissance": "<% ou 'non trouvé'>",
  "maturité": "<émergent|en croissance|mature|saturé>"
}`
    }]
  });
}

async function handleStep2(apiKey, idea, horizon, marche) {
  return callAnthropic(WEB_HEADERS(apiKey), {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 20000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Recherche web : concurrents et arguments pour une idée business.
Idée: "${idea}" — Horizon: ${horizon}.
Marché: ${JSON.stringify(marche)}
Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "concurrents": [{ "nom": "<nom>", "note": "<max 10 mots>" }],
  "pour": ["<argument, max 10 mots>"],
  "contre": ["<risque, max 10 mots>"]
}`
    }]
  });
}

async function handleStep3(apiKey, idea, horizon, marche, s2) {
  return callAnthropic(BASE_HEADERS(apiKey), {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 15000,
    messages: [{
      role: 'user',
      content: `Synthèse et score final — pas de recherche web.
Idée: "${idea}" — Horizon: ${horizon}.
Marché: ${JSON.stringify(marche)}
Concurrents + arguments: ${JSON.stringify(s2)}
Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "score_final": <0-100>,
  "verdict": <"GO"|"MAYBE"|"NO-GO">,
  "recommendation": "<2 phrases directes>",
  "confiance": <1-5>,
  "note_confiance": "<max 10 mots>",
  "dimensions": {
    "désirabilité": { "score": <0-10>, "note": "<max 10 mots>" },
    "faisabilité":  { "score": <0-10>, "note": "<max 10 mots>" },
    "viabilité":    { "score": <0-10>, "note": "<max 10 mots>" },
    "timing":       { "score": <0-10>, "note": "<max 10 mots>" }
  },
  "étapes": ["<étape concrète 1>", "<étape concrète 2>", "<étape concrète 3>"]
}`
    }]
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, idea, horizon, marche, step2Data } = req.body || {};
  if (!idea) return res.status(400).json({ error: 'Champ idea requis' });
  if (![1, 2, 3].includes(step)) return res.status(400).json({ error: 'step doit être 1, 2 ou 3' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée' });

  try {
    if (step === 1) return res.status(200).json(await handleStep1(apiKey, idea, horizon));
    if (step === 2) return res.status(200).json(await handleStep2(apiKey, idea, horizon, marche));
    if (step === 3) return res.status(200).json(await handleStep3(apiKey, idea, horizon, marche, step2Data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
