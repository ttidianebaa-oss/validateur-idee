export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idea, horizon } = req.body || {};
  if (!idea) return res.status(400).json({ error: 'Champ idea requis' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée' });

  const prompt = `Valide cette idée business via recherche web. Idée: "${idea}" — Horizon: ${horizon || '24h'}.

Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks) :
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
  "marché": {
    "taille": "<valeur ou 'non trouvé'>",
    "taille_source": "<source URL ou nom>",
    "croissance": "<% ou 'non trouvé'>",
    "maturité": "<émergent|en croissance|mature|saturé>"
  },
  "concurrents": [{ "nom": "<nom>", "note": "<max 10 mots>" }],
  "pour": ["<argument court>"],
  "contre": ["<risque court>"],
  "étapes": ["<étape concrète 1>", "<étape concrète 2>", "<étape concrète 3>"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') text += block.text;
    }

    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
