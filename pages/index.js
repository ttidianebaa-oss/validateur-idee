import Head from 'next/head';
import { useState } from 'react';

const vc = (v) => v === 'GO' ? '#22d3a0' : v === 'MAYBE' ? '#fbbf24' : '#f87171';
const dc = (s) => s >= 7 ? '#22d3a0' : s >= 5 ? '#fbbf24' : '#f87171';

export default function Home() {
  const [idea, setIdea] = useState('');
  const [horizon, setHorizon] = useState('24h');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function validate() {
    if (idea.trim().length < 30) {
      setError('Décris ton idée avec au moins 30 caractères.');
      return;
    }
    setError('');
    setStatus('loading');
    setResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, horizon })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      setResult(data);
      setStatus('done');
    } catch (e) {
      setError('Erreur : ' + e.message);
      setStatus('idle');
    }
  }

  function reset() {
    setIdea(''); setStatus('idle'); setResult(null); setError('');
  }

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
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      <div className="wrap">
        <div style={{fontFamily:'DM Mono',fontSize:11,letterSpacing:'0.2em',color:'#a78bfa',textTransform:'uppercase',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,background:'#7c5cfc',borderRadius:'50%',boxShadow:'0 0 8px #7c5cfc',display:'inline-block'}}/>
          Validateur d'idée · v3
        </div>

        <h1 style={{fontFamily:'Syne',fontSize:'clamp(28px,5vw,44px)',fontWeight:800,lineHeight:1.1,letterSpacing:'-0.02em',marginBottom:12}}>
          Valide ton idée<br/>
          <span style={{background:'linear-gradient(135deg,#a78bfa,#7c5cfc,#22d3a0)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>avant de construire.</span>
        </h1>
        <p style={{color:'#8b8b9a',fontSize:15,lineHeight:1.6,maxWidth:500,marginBottom:52}}>
          Un seul appel IA avec recherche web. Données réelles. Score basé sur ce qui est trouvé.
        </p>

        {status === 'idle' && (
          <>
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

            <button onClick={validate} style={{width:'100%',background:'#7c5cfc',color:'white',border:'none',borderRadius:12,padding:16,fontFamily:'Syne',fontSize:16,fontWeight:700,cursor:'pointer'}}>
              Lancer la validation
            </button>
            {error && <div style={{background:'#f8717110',border:'1px solid #f8717130',borderRadius:10,padding:'16px 20px',color:'#f87171',fontSize:14,marginTop:16}}>{error}</div>}
          </>
        )}

        {status === 'loading' && (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <div style={{width:40,height:40,border:'3px solid #ffffff20',borderTop:'3px solid #7c5cfc',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 20px'}}/>
            <div style={{fontFamily:'DM Mono',fontSize:13,color:'#8b8b9a'}}>Recherche web + analyse en cours…</div>
          </div>
        )}

        {status === 'done' && result && (
          <Results r={result} onReset={reset} />
        )}
      </div>
    </>
  );
}

function Results({ r, onReset }) {
  const color = vc(r.verdict);
  const conf = r.confiance || 3;

  return (
    <div style={{marginTop:32}}>
      {/* Hero score */}
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

      {/* Dimensions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        {Object.entries(r.dimensions || {}).map(([name, d]) => (
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

      {/* Marché */}
      <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:16}}>
        <SectionTitle>Marché</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            {val:r.marché?.taille,src:r.marché?.taille_source,label:'Taille',color:'#a78bfa'},
            {val:r.marché?.croissance,src:null,label:'Croissance',color:'#22d3a0'},
            {val:r.marché?.maturité,src:null,label:'Maturité',color:'#fbbf24'}
          ].map((s,i) => (
            <div key={i} style={{background:'#18181f',borderRadius:10,padding:16,textAlign:'center'}}>
              <div style={{fontFamily:'Syne',fontSize:20,fontWeight:700,marginBottom:4,color:s.color}}>{s.val||'—'}</div>
              <div style={{fontSize:11,color:'#8b8b9a',fontFamily:'DM Mono',textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</div>
              {s.src && s.src !== 'non trouvé' && (
                <a href={s.src.startsWith('http')?s.src:'#'} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:6,border:'1px solid #ffffff20',borderRadius:4,padding:'2px 8px',fontFamily:'DM Mono',fontSize:10,color:'#8b8b9a',textDecoration:'none'}}>↗</a>
              )}
            </div>
          ))}
        </div>
        {(r.concurrents||[]).map((c,i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#18181f',borderRadius:8,marginBottom:6,fontSize:14}}>
            <span style={{fontWeight:500}}>{c.nom}</span>
            <span style={{color:'#8b8b9a',fontSize:12}}>{c.note}</span>
          </div>
        ))}
      </div>

      {/* Pour / Contre */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:24}}>
          <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#22d3a0',marginBottom:14}}>Pour</div>
          {(r.pour||[]).map((a,i) => (
            <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,color:'#8b8b9a',lineHeight:1.5,marginBottom:8}}>
              <span style={{color:'#22d3a0',flexShrink:0}}>+</span>{a}
            </div>
          ))}
        </div>
        <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:24}}>
          <div style={{fontFamily:'DM Mono',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#f87171',marginBottom:14}}>Contre</div>
          {(r.contre||[]).map((a,i) => (
            <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:13,color:'#8b8b9a',lineHeight:1.5,marginBottom:8}}>
              <span style={{color:'#f87171',flexShrink:0}}>!</span>{a}
            </div>
          ))}
        </div>
      </div>

      {/* Étapes */}
      <div style={{background:'#111118',border:'1px solid #ffffff10',borderRadius:16,padding:28,marginBottom:24}}>
        <SectionTitle>Prochaines étapes</SectionTitle>
        {(r.étapes||[]).map((s,i) => (
          <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:12}}>
            <div style={{width:28,height:28,borderRadius:8,background:'#7c5cfc',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono',fontSize:12,flexShrink:0,color:'white'}}>{i+1}</div>
            <div style={{fontSize:14,lineHeight:1.6,color:'#8b8b9a',paddingTop:4}}>{s}</div>
          </div>
        ))}
      </div>

      <button onClick={onReset} style={{background:'transparent',border:'1px solid #ffffff20',color:'#8b8b9a',fontFamily:'DM Mono',fontSize:12,padding:'10px 20px',borderRadius:8,cursor:'pointer',display:'block',marginLeft:'auto'}}>
        ← Nouvelle idée
      </button>
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
