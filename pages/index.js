import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [idea, setIdea] = useState('');
  const [horizon, setHorizon] = useState('24h');
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const steps = [
    'Recherche web — marché, taille, tendances',
    'Recherche web — concurrents et prix pratiqués',
    'Passe 1 — arguments pour l\'idée',
    'Passe 2 — avocat du diable, arguments contre',
    'Score final basé sur la tension entre les deux passes'
  ];

  async function callAPI(systemPrompt, userMessage) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Erreur API');
    }
    const data = await response.json();
    let text = '';
    for (const block of data.content) {
      if (block.type === 'text') text += block.text;
    }
    return text.replace(/```json|```/g, '').trim();
  }

  async function startValidation() {
    if (idea.trim().length < 30) {
      setError('Décris ton idée avec un peu plus de détails (minimum 30 caractères).');
      return;
    }
    setError('');
    setStatus('loading');
    setResults(null);
    setCurrentStep(1);

    try {
      const passePourPrompt = `Tu es un analyste de marché. Tu utilises la recherche web pour trouver des données RÉELLES.

RÈGLE ABSOLUE : Si tu ne trouves pas une donnée précise via la recherche web, tu écris "données non trouvées" pour ce champ. Tu n'inventes JAMAIS de chiffres.

Pour chaque donnée de marché, tu DOIS inclure la source (nom du site ou rapport).

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :

{
  "marché": {
    "taille_estimée": "<valeur OU 'données non trouvées'>",
    "taille_source": "<URL ou nom de la source>",
    "croissance": "<% OU 'données non trouvées'>",
    "croissance_source": "<URL ou nom de la source>",
    "maturité": "<émergent | en croissance | mature | saturé>"
  },
  "concurrents": [
    { "nom": "<nom réel trouvé>", "note": "<positionnement court>", "source": "<URL ou site>" }
  ],
  "arguments_pour": [
    "<argument fort basé sur une donnée réelle trouvée>",
    "<argument fort>",
    "<argument fort>"
  ],
  "score_pour": <note 0-10 basée UNIQUEMENT sur ce que tu as trouvé>
}`;

      setCurrentStep(2);
      const resPour = await callAPI(passePourPrompt, `Idée: ${idea}\nHorizon: ${horizon}\n\nFais des recherches web réelles. Cite tes sources.`);
      const dataPour = JSON.parse(resPour);

      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 300));
      setCurrentStep(4);

      const passeContrePrompt = `Tu es un avocat du diable. Ton rôle est de chercher TOUT ce qui peut faire échouer cette idée de business.

Tu utilises la recherche web pour trouver : barrières à l'entrée réelles, échecs similaires, problèmes de marché documentés, concurrents dominants avec parts de marché.

RÈGLE ABSOLUE : Tu n'inventes rien. Si tu ne trouves pas de preuves d'un risque, tu ne le mentionnes pas.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :

{
  "arguments_contre": [
    "<risque réel documenté avec source si possible>",
    "<risque réel>",
    "<risque réel>"
  ],
  "echecs_similaires": [
    "<nom d'une entreprise ou produit similaire qui a échoué, avec raison courte>"
  ],
  "barrières": [
    "<barrière concrète à l'entrée>"
  ],
  "score_contre": <note de difficulté 0-10, où 10 = extrêmement difficile>
}`;

      const resContre = await callAPI(passeContrePrompt, `Idée: ${idea}\nHorizon: ${horizon}\n\nJoue l'avocat du diable. Cherche les preuves d'échec potentiel.`);
      const dataContre = JSON.parse(resContre);

      setCurrentStep(5);

      const scoreFinalPrompt = `Tu reçois deux analyses d'une idée de business : une analyse favorable et une analyse défavorable. Tu dois calculer un score final équilibré et donner une recommandation.

Le score final = tension entre les deux analyses. Un score_pour élevé ET un score_contre élevé = score moyen (50-65). Un score_pour élevé ET score_contre faible = score élevé (70-90). Un score_pour faible = score bas (10-40).

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :

{
  "score_final": <entier 0-100>,
  "verdict": <"GO" | "MAYBE" | "NO-GO">,
  "recommendation": "<2-3 phrases claires et directes>",
  "confiance": <1 | 2 | 3 | 4 | 5>,
  "note_confiance": "<explication courte du niveau de confiance>",
  "dimensions": {
    "désirabilité": { "score": <0-10>, "note": "<observation courte>" },
    "faisabilité": { "score": <0-10>, "note": "<observation courte>" },
    "viabilité": { "score": <0-10>, "note": "<observation courte>" },
    "timing": { "score": <0-10>, "note": "<observation courte>" }
  },
  "prochaines_étapes": ["<étape concrète 1>", "<étape concrète 2>", "<étape concrète 3>"]
}`;

      const resScore = await callAPI(scoreFinalPrompt,
        `Idée: ${idea}\nAnalyse favorable: ${JSON.stringify(dataPour)}\nAnalyse défavorable: ${JSON.stringify(dataContre)}\nScore pour: ${dataPour.score_pour}/10\nScore contre (difficulté): ${dataContre.score_contre}/10`
      );
      const dataScore = JSON.parse(resScore);

      setResults({ pour: dataPour, contre: dataContre, score: dataScore });
      setStatus('done');

    } catch (err) {
      setError('Erreur : ' + err.message);
      setStatus('idle');
    }
  }

  function reset() {
    setIdea('');
    setStatus('idle');
    setCurrentStep(0);
    setResults(null);
    setError('');
  }

  const verdictColor = (v) => {
    if (v === 'GO') return '#22d3a0';
    if (v === 'MAYBE') return '#fbbf24';
    return '#f87171';
  };

  const dimColor = (s) => {
    if (s >= 7) return '#22d3a0';
    if (s >= 5) return '#fbbf24';
    return '#f87171';
  };

  return (
    <>
      <Head>
        <title>Validateur d'idée</title>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0f;color:#f0f0f5;font-family:'DM Sans',sans-serif;min-height:100vh}
        body::before{content:'';position:fixed;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse,#7c5cfc18 0%,transparent 70%);pointer-events:none;z-index:0}
        .container{max-width:820px;margin:0 auto;padding:60px 24px;position:relative;z-index:1}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes barIn{from{width:0}to{width:var(--w)}}
      `}</style>

      <div className="container">
        <div style={{fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.2em',color:'#a78bfa',textTransform:'uppercase',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,background:'#7c5cfc',borderRadius:'50%',boxShadow:'0 0 8px #7c5cfc',display:'inline-block'}}></span>
          Validateur d'idée · v2
        </div>

        <h1 style={{fontFamily:'Syne',fontSize:'clamp(28px,5vw,44px)',fontWeight:800,lineHeight:1.1,letterSpacing:'-0.02em',marginBottom:12}}>
          Valide ton idée<br/>
          <span style={{background:'linear-gradient(135deg,#a78bfa,#7c5cfc,#22d3a0)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>avant de construire.</span>
        </h1>
        <p style={{color:'#8b8b9a',fontSize:15,lineHeight:1.6,maxWidth:500,marginBottom:52}}>
          Deux passes d'analyse opposées. Sources citées. Score basé uniquement sur ce qui est trouvé.
        </p>

        {status === 'idle' && (
          <>
            <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:16,padding:28,marginBottom:16}}>
              <span style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:12,display:'block'}}>Ton idée — décris-la librement</span>
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="Ex: Une plateforme SaaS francophone qui permet aux PME africaines de gérer leurs finances sans compte bancaire..."
                style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#f0f0f5',fontFamily:'DM Sans',fontSize:15,lineHeight:1.7,resize:'none',minHeight:160}}
              />
              <div style={{fontFamily:'DM Mono',fontSize:11,color:'#8b8b9a',textAlign:'right',marginTop:8}}>{idea.length} caractères</div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:8}}>Horizon de validation</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['24h','72h','7j'].map(h => (
                  <button key={h} onClick={() => setHorizon(h)} style={{background:horizon===h?'#7c5cfc':'#18181f',border:`1px solid ${horizon===h?'#7c5cfc':'#ffffff20'}`,color:horizon===h?'white':'#8b8b9a',fontFamily:'DM Mono',fontSize:12,padding:'8px 16px',borderRadius:8,cursor:'pointer'}}>
                    {h === '24h' ? 'Rapide · 24h' : h === '72h' ? 'Standard · 72h' : 'Approfondi · 7 jours'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startValidation} style={{width:'100%',background:'#7c5cfc',color:'white',border:'none',borderRadius:12,padding:16,fontFamily:'Syne',fontSize:16,fontWeight:700,cursor:'pointer'}}>
              Lancer la validation
            </button>

            {error && <div style={{background:'#f8717110',border:'1px solid #f8717130',borderRadius:10,padding:'16px 20px',color:'#f87171',fontSize:14,marginTop:16}}>{error}</div>}
          </>
        )}

        {status === 'loading' && (
          <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:16,padding:28,marginTop:24}}>
            <div style={{fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:20}}>Analyse en cours — double vérification active</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {steps.map((s, i) => {
                const n = i + 1;
                const isDone = currentStep > n;
                const isActive = currentStep === n;
                return (
                  <div key={n} style={{display:'flex',alignItems:'center',gap:12,fontSize:14,color:isDone?'#22d3a0':isActive?'#f0f0f5':'#8b8b9a'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:isDone?'#22d3a0':isActive?'#7c5cfc':'#ffffff20',flexShrink:0,boxShadow:isActive?'0 0 8px #7c5cfc':'none',animation:isActive?'pulse 1s ease-in-out infinite':'none'}}></div>
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'done' && results && (
          <Results data={results} onReset={reset} verdictColor={verdictColor} dimColor={dimColor} />
        )}
      </div>
    </>
  );
}

function Results({ data, onReset, verdictColor, dimColor }) {
  const { pour, contre, score } = data;
  const vc = score.verdict === 'GO' ? 'go' : score.verdict === 'MAYBE' ? 'maybe' : 'nogo';
  const vColor = verdictColor(score.verdict);
  const conf = score.confiance || 3;
  const m = pour.marché || {};

  return (
    <div style={{marginTop:32}}>
      {/* Score hero */}
      <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:20,padding:40,textAlign:'center',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',width:300,height:200,borderRadius:'50%',background:`radial-gradient(ellipse, ${vColor}20, transparent 70%)`,pointerEvents:'none'}}></div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 16px',borderRadius:20,fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:20,background:`${vColor}15`,color:vColor,border:`1px solid ${vColor}30`}}>
          {score.verdict}
        </div>
        <div style={{fontFamily:'Syne',fontSize:80,fontWeight:800,lineHeight:1,color:vColor,marginBottom:8}}>{score.score_final}</div>
        <div style={{fontSize:13,color:'#8b8b9a',marginBottom:20}}>score de validation / 100</div>
        <div style={{fontSize:16,lineHeight:1.6,maxWidth:560,margin:'0 auto'}}>{score.recommendation}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginTop:20,paddingTop:20,borderTop:'1px solid #ffffff10'}}>
          <span style={{fontFamily:'DM Mono',fontSize:11,color:'#8b8b9a',textTransform:'uppercase',letterSpacing:'0.1em'}}>Confiance</span>
          <div style={{display:'flex',gap:4}}>
            {[1,2,3,4,5].map(i => <div key={i} style={{width:8,height:8,borderRadius:'50%',background:i<=conf?'#a78bfa':'#ffffff20'}}></div>)}
          </div>
          <span style={{fontSize:12,color:'#8b8b9a'}}>{score.note_confiance}</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{background:'#18181f',border:'1px solid #ffffff10',borderRadius:10,padding:'14px 18px',fontSize:12,color:'#8b8b9a',lineHeight:1.6,marginBottom:16}}>
        <strong style={{color:'#f0f0f5'}}>Note de fiabilité :</strong> Ce score est basé sur les données trouvées via recherche web. Les chiffres marqués "non trouvé" n'ont pas influencé le score. Aucune validation ne garantit le succès.
      </div>

      {/* Dimensions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        {Object.entries(score.dimensions || {}).map(([name, d]) => (
          <div key={name} style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:12,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#8b8b9a'}}>{name}</span>
              <span style={{fontFamily:'Syne',fontWeight:700,fontSize:18,color:dimColor(d.score)}}>{d.score}/10</span>
            </div>
            <div style={{height:3,background:'#ffffff20',borderRadius:2,marginBottom:10,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:2,background:dimColor(d.score),width:`${(d.score/10)*100}%`,transition:'width 0.8s'}}></div>
            </div>
            <div style={{fontSize:13,color:'#8b8b9a',lineHeight:1.5}}>{d.note}</div>
          </div>
        ))}
      </div>

      {/* Marché */}
      <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontSize:14,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
          Données de marché <span style={{flex:1,height:1,background:'#ffffff10',display:'block'}}></span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
          {[
            {val: m.taille_estimée, src: m.taille_source, label: 'Taille marché', color: '#a78bfa'},
            {val: m.croissance, src: m.croissance_source, label: 'Croissance / an', color: '#22d3a0'},
            {val: m.maturité, src: null, label: 'Maturité', color: '#fbbf24'}
          ].map((s, i) => (
            <div key={i} style={{background:'#18181f',borderRadius:10,padding:16,textAlign:'center'}}>
              <div style={{fontFamily:'Syne',fontSize:22,fontWeight:700,marginBottom:4,color:s.color}}>{s.val || '—'}</div>
              <div style={{fontSize:11,color:'#8b8b9a',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</div>
              {s.src && s.src !== 'données non trouvées' ? (
                <a href={s.src.startsWith('http')?s.src:'#'} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:6,background:'#18181f',border:'1px solid #ffffff20',borderRadius:4,padding:'2px 8px',fontFamily:'DM Mono',fontSize:10,color:'#8b8b9a',textDecoration:'none'}}>↗ source</a>
              ) : s.val === 'données non trouvées' ? (
                <span style={{fontSize:11,color:'#f87171',fontFamily:'DM Mono',display:'block',marginTop:4}}>non trouvé</span>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {(pour.concurrents || []).map((c, i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'12px 16px',background:'#18181f',borderRadius:8,fontSize:14,gap:12}}>
              <span style={{fontWeight:500}}>{c.nom}</span>
              <div style={{textAlign:'right'}}>
                <div style={{color:'#8b8b9a',fontSize:12}}>{c.note}</div>
                {c.source && <a href={c.source.startsWith('http')?c.source:'#'} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:4,background:'#18181f',border:'1px solid #ffffff20',borderRadius:4,padding:'2px 8px',fontFamily:'DM Mono',fontSize:10,color:'#8b8b9a',textDecoration:'none'}}>↗ source</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Double analyse */}
      <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontSize:14,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:20}}>Double analyse</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#18181f',borderRadius:12,padding:20}}>
            <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#22d3a0',marginBottom:14}}>Arguments pour · {pour.score_pour}/10</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(pour.arguments_pour || []).map((a, i) => (
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,color:'#8b8b9a',lineHeight:1.5}}>
                  <div style={{width:14,height:14,borderRadius:3,background:'#22d3a015',color:'#22d3a0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,flexShrink:0,marginTop:2}}>+</div>
                  {a}
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'#18181f',borderRadius:12,padding:20}}>
            <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#f87171',marginBottom:14}}>Arguments contre · {contre.score_contre}/10</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[...(contre.arguments_contre||[]),...(contre.barrières||[])].map((a, i) => (
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,color:'#8b8b9a',lineHeight:1.5}}>
                  <div style={{width:14,height:14,borderRadius:3,background:'#f8717115',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,flexShrink:0,marginTop:2}}>!</div>
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
        {(contre.echecs_similaires||[]).length > 0 && (
          <div style={{marginTop:16}}>
            <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:10}}>Échecs similaires documentés</div>
            {(contre.echecs_similaires||[]).map((e, i) => (
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,color:'#8b8b9a',lineHeight:1.5,marginBottom:6}}>
                <div style={{width:14,height:14,borderRadius:3,background:'#f8717115',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,flexShrink:0,marginTop:2}}>✕</div>
                {e}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Étapes */}
      <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:16}}>
        <div style={{fontFamily:'Syne',fontSize:14,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:20}}>Prochaines étapes</div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {(score.prochaines_étapes||[]).map((s, i) => (
            <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start'}}>
              <div style={{width:28,height:28,borderRadius:8,background:'#7c5cfc',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono',fontSize:12,flexShrink:0,color:'white'}}>{i+1}</div>
              <div style={{fontSize:14,lineHeight:1.6,color:'#8b8b9a',paddingTop:4}}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onReset} style={{background:'transparent',border:'1px solid #ffffff20',color:'#8b8b9a',fontFamily:'DM Mono',fontSize:12,padding:'10px 20px',borderRadius:8,cursor:'pointer',display:'block',marginLeft:'auto'}}>
        ← Valider une autre idée
      </button>
    </div>
  );
}
