import Head from 'next/head';
import { useState, useEffect } from 'react';

const vc = (v) => v === 'GO' ? '#22d3a0' : v === 'MAYBE' ? '#fbbf24' : '#f87171';
const dc = (s) => s >= 7 ? '#22d3a0' : s >= 5 ? '#fbbf24' : '#f87171';

const STEP_LABELS = [
  { n: 1, label: 'Recherche marché', sub: 'taille · croissance · maturité' },
  { n: 2, label: 'Concurrents & arguments', sub: 'pour · contre · web search' },
  { n: 3, label: 'Score final', sub: 'synthèse · dimensions · étapes' }
];

export default function Home() {
  const [idea, setIdea] = useState('');
  const [horizon, setHorizon] = useState('24h');
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const [marche, setMarche] = useState(null);
  const [s2, setS2] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (phase !== 'pause1' && phase !== 'pause2') return;
    const capturedMarche = marche;
    const capturedS2 = s2;
    let rem = 70;
    setCountdown(rem);
    const iv = setInterval(() => {
      rem--;
      setCountdown(rem);
      if (rem <= 0) {
        clearInterval(iv);
        if (phase === 'pause1') execStep2(capturedMarche);
        else execStep3(capturedMarche, capturedS2);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(step, body) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, ...body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur API');
    return data;
  }

  async function start() {
    if (idea.trim().length < 30) {
      setError('Décris ton idée avec au moins 30 caractères.');
      return;
    }
    setError('');
    setMarche(null); setS2(null); setFinalData(null);
    setPhase('step1');
    try {
      const d1 = await post(1, { idea, horizon });
      setMarche(d1);
      setPhase('pause1');
    } catch (e) { setError(e.message); setPhase('idle'); }
  }

  async function execStep2(marcheData) {
    setPhase('step2');
    try {
      const d2 = await post(2, { idea, horizon, marche: marcheData });
      setS2(d2);
      setPhase('pause2');
    } catch (e) { setError(e.message); setPhase('idle'); }
  }

  async function execStep3(marcheData, s2Data) {
    setPhase('step3');
    try {
      const d3 = await post(3, { idea, horizon, marche: marcheData, step2Data: s2Data });
      setFinalData(d3);
      setPhase('done');
    } catch (e) { setError(e.message); setPhase('idle'); }
  }

  function reset() {
    setIdea(''); setHorizon('24h'); setPhase('idle');
    setCountdown(0); setMarche(null); setS2(null);
    setFinalData(null); setError('');
  }

  const activeStep = { step1: 1, pause1: 1, step2: 2, pause2: 2, step3: 3, done: 3 }[phase] || 0;
  const isPause = phase === 'pause1' || phase === 'pause2';
  const isWorking = phase === 'step1' || phase === 'step2' || phase === 'step3';
  const inProgress = isWorking || isPause || phase === 'done';

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
        .wrap{max-width:820px;margin:0 auto;padding:60px 24px;position:relative;z-index:1}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeIn 0.4s ease both}
      `}</style>

      <div className="wrap">
        <div style={{fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.2em',color:'#a78bfa',textTransform:'uppercase',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,background:'#7c5cfc',borderRadius:'50%',boxShadow:'0 0 8px #7c5cfc',display:'inline-block'}}/>
          Validateur d'idée · v4
        </div>

        <h1 style={{fontFamily:'Syne',fontSize:'clamp(28px,5vw,44px)',fontWeight:800,lineHeight:1.1,letterSpacing:'-0.02em',marginBottom:12}}>
          Valide ton idée<br/>
          <span style={{background:'linear-gradient(135deg,#a78bfa,#7c5cfc,#22d3a0)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>avant de construire.</span>
        </h1>

        {phase === 'idle' && (
          <>
            <p style={{color:'#8b8b9a',fontSize:15,lineHeight:1.6,maxWidth:500,marginBottom:40}}>
              3 étapes d'analyse IA avec recherche web. Pause automatique entre chaque étape pour respecter les limites d'API.
            </p>
            <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:16,padding:28,marginBottom:16}}>
              <span style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:12,display:'block'}}>Ton idée</span>
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="Ex: Une plateforme SaaS qui permet aux PME africaines de gérer leurs finances sans compte bancaire..."
                style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#f0f0f5',fontFamily:'DM Sans',fontSize:15,lineHeight:1.7,resize:'none',minHeight:140}}
              />
              <div style={{fontFamily:'DM Mono',fontSize:11,color:'#8b8b9a',textAlign:'right',marginTop:8}}>{idea.length} car.</div>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:8}}>Horizon</div>
              <div style={{display:'flex',gap:8}}>
                {['24h','72h','7j'].map(h => (
                  <button key={h} onClick={() => setHorizon(h)} style={{background:horizon===h?'#7c5cfc':'#18181f',border:`1px solid ${horizon===h?'#7c5cfc':'#ffffff20'}`,color:horizon===h?'white':'#8b8b9a',fontFamily:'DM Mono',fontSize:12,padding:'8px 16px',borderRadius:8,cursor:'pointer'}}>
                    {h === '24h' ? 'Rapide · 24h' : h === '72h' ? 'Standard · 72h' : 'Approfondi · 7j'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={start} style={{width:'100%',background:'#7c5cfc',color:'white',border:'none',borderRadius:12,padding:16,fontFamily:'Syne',fontSize:16,fontWeight:700,cursor:'pointer'}}>
              Lancer la validation
            </button>
            {error && <div style={{background:'#f8717110',border:'1px solid #f8717130',borderRadius:10,padding:'16px 20px',color:'#f87171',fontSize:14,marginTop:16}}>{error}</div>}
          </>
        )}

        {inProgress && (
          <div style={{marginTop:8}}>
            {/* Step tracker */}
            <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:16,padding:24,marginBottom:20}}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {STEP_LABELS.map(({ n, label, sub }) => {
                  const done = activeStep > n || phase === 'done';
                  const active = activeStep === n && phase !== 'done';
                  const isPauseAfter = (phase === 'pause1' && n === 1) || (phase === 'pause2' && n === 2);
                  return (
                    <div key={n} style={{display:'flex',alignItems:'center',gap:14}}>
                      <div style={{width:28,height:28,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono',fontSize:11,background:done?'#22d3a020':active?'#7c5cfc':'#18181f',border:`1px solid ${done?'#22d3a060':active?'#7c5cfc':'#ffffff15'}`,color:done?'#22d3a0':active?'white':'#8b8b9a'}}>
                        {done ? '✓' : n}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,color:done?'#22d3a0':active?'#f0f0f5':'#8b8b9a',fontWeight:active?500:400}}>{label}</div>
                        <div style={{fontFamily:'DM Mono',fontSize:10,color:'#8b8b9a',marginTop:2}}>{sub}</div>
                      </div>
                      {active && !isPauseAfter && (
                        <div style={{width:16,height:16,border:'2px solid #ffffff20',borderTop:'2px solid #7c5cfc',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}}/>
                      )}
                      {isPauseAfter && (
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          <div style={{fontFamily:'DM Mono',fontSize:22,fontWeight:700,color:'#fbbf24',minWidth:32,textAlign:'right'}}>{countdown}</div>
                          <div style={{fontFamily:'DM Mono',fontSize:9,color:'#8b8b9a',lineHeight:1.3}}>sec<br/>pause</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isPause && (
                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid #ffffff10'}}>
                  <div style={{fontFamily:'DM Mono',fontSize:11,color:'#fbbf24',marginBottom:8}}>
                    Pause {phase === 'pause1' ? '1/2' : '2/2'} — respect de la limite 30K tokens/min
                  </div>
                  <div style={{height:3,background:'#ffffff10',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#fbbf24',borderRadius:2,width:`${((70 - countdown) / 70) * 100}%`,transition:'width 1s linear'}}/>
                  </div>
                </div>
              )}
            </div>

            {/* Partial — Marché (dès étape 2) */}
            {marche && (
              <div className="fade" style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:24,marginBottom:16}}>
                <SectionTitle>Marché</SectionTitle>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {[
                    {val:marche.taille,src:marche.taille_source,label:'Taille',color:'#a78bfa'},
                    {val:marche.croissance,src:null,label:'Croissance',color:'#22d3a0'},
                    {val:marche.maturité,src:null,label:'Maturité',color:'#fbbf24'}
                  ].map((s,i) => (
                    <div key={i} style={{background:'#18181f',borderRadius:10,padding:16,textAlign:'center'}}>
                      <div style={{fontFamily:'Syne',fontSize:18,fontWeight:700,marginBottom:4,color:s.color,wordBreak:'break-word'}}>{s.val||'—'}</div>
                      <div style={{fontSize:10,color:'#8b8b9a',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</div>
                      {s.src && s.src !== 'non trouvé' && (
                        <a href={s.src.startsWith('http')?s.src:'#'} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:6,border:'1px solid #ffffff20',borderRadius:4,padding:'2px 8px',fontFamily:'DM Mono',fontSize:10,color:'#8b8b9a',textDecoration:'none'}}>↗</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partial — Concurrents + Pour/Contre (dès étape 3) */}
            {s2 && (
              <div className="fade">
                {(s2.concurrents||[]).length > 0 && (
                  <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:24,marginBottom:16}}>
                    <SectionTitle>Concurrents</SectionTitle>
                    {s2.concurrents.map((c,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#18181f',borderRadius:8,marginBottom:6,fontSize:14}}>
                        <span style={{fontWeight:500}}>{c.nom}</span>
                        <span style={{color:'#8b8b9a',fontSize:12}}>{c.note}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:20}}>
                    <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#22d3a0',marginBottom:14}}>Pour</div>
                    {(s2.pour||[]).map((a,i) => (
                      <div key={i} style={{display:'flex',gap:8,fontSize:13,color:'#8b8b9a',lineHeight:1.5,marginBottom:8}}>
                        <span style={{color:'#22d3a0',flexShrink:0}}>+</span>{a}
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:20}}>
                    <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#f87171',marginBottom:14}}>Contre</div>
                    {(s2.contre||[]).map((a,i) => (
                      <div key={i} style={{display:'flex',gap:8,fontSize:13,color:'#8b8b9a',lineHeight:1.5,marginBottom:8}}>
                        <span style={{color:'#f87171',flexShrink:0}}>!</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Final results */}
            {finalData && (
              <div className="fade">
                <ScoreHero r={finalData} />
                <Dimensions dims={finalData.dimensions} />
                <Etapes etapes={finalData.étapes} />
              </div>
            )}

            {phase === 'done' && (
              <button onClick={reset} style={{background:'transparent',border:'1px solid #ffffff20',color:'#8b8b9a',fontFamily:'DM Mono',fontSize:12,padding:'10px 20px',borderRadius:8,cursor:'pointer',display:'block',marginLeft:'auto',marginTop:8}}>
                ← Nouvelle idée
              </button>
            )}

            {error && (
              <div style={{background:'#f8717110',border:'1px solid #f8717130',borderRadius:10,padding:'16px 20px',color:'#f87171',fontSize:14,marginTop:16}}>
                {error}
                <button onClick={reset} style={{display:'block',marginTop:10,background:'transparent',border:'1px solid #f8717130',color:'#f87171',fontFamily:'DM Mono',fontSize:11,padding:'6px 14px',borderRadius:6,cursor:'pointer'}}>Recommencer</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ScoreHero({ r }) {
  const color = vc(r.verdict);
  const conf = r.confiance || 3;
  return (
    <div style={{background:'#111118',border:'1px solid #ffffff20',borderRadius:20,padding:40,textAlign:'center',marginBottom:16,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',width:300,height:200,borderRadius:'50%',background:`radial-gradient(ellipse,${color}20,transparent 70%)`,pointerEvents:'none'}}/>
      <div style={{display:'inline-flex',alignItems:'center',padding:'6px 16px',borderRadius:20,fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:20,background:`${color}15`,color,border:`1px solid ${color}30`}}>
        {r.verdict}
      </div>
      <div style={{fontFamily:'Syne',fontSize:80,fontWeight:800,lineHeight:1,color,marginBottom:8}}>{r.score_final}</div>
      <div style={{fontSize:13,color:'#8b8b9a',marginBottom:20}}>score / 100</div>
      <div style={{fontSize:15,lineHeight:1.6,maxWidth:560,margin:'0 auto'}}>{r.recommendation}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginTop:20,paddingTop:20,borderTop:'1px solid #ffffff10'}}>
        <span style={{fontFamily:'DM Mono',fontSize:11,color:'#8b8b9a',textTransform:'uppercase',letterSpacing:'0.1em'}}>Confiance</span>
        <div style={{display:'flex',gap:4}}>
          {[1,2,3,4,5].map(i => <div key={i} style={{width:8,height:8,borderRadius:'50%',background:i<=conf?'#a78bfa':'#ffffff20'}}/>)}
        </div>
        <span style={{fontSize:12,color:'#8b8b9a'}}>{r.note_confiance}</span>
      </div>
    </div>
  );
}

function Dimensions({ dims }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
      {Object.entries(dims || {}).map(([name, d]) => (
        <div key={name} style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#8b8b9a'}}>{name}</span>
            <span style={{fontFamily:'Syne',fontWeight:700,fontSize:18,color:dc(d.score)}}>{d.score}/10</span>
          </div>
          <div style={{height:3,background:'#ffffff20',borderRadius:2,marginBottom:10,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:2,background:dc(d.score),width:`${d.score*10}%`}}/>
          </div>
          <div style={{fontSize:13,color:'#8b8b9a'}}>{d.note}</div>
        </div>
      ))}
    </div>
  );
}

function Etapes({ etapes }) {
  return (
    <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:16}}>
      <SectionTitle>Prochaines étapes</SectionTitle>
      {(etapes||[]).map((s,i) => (
        <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:12}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#7c5cfc',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono',fontSize:12,flexShrink:0,color:'white'}}>{i+1}</div>
          <div style={{fontSize:14,lineHeight:1.6,color:'#8b8b9a',paddingTop:4}}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{fontFamily:'Syne',fontSize:13,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase',color:'#8b8b9a',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
      {children}<span style={{flex:1,height:1,background:'#ffffff10',display:'block'}}/>
    </div>
  );
}
