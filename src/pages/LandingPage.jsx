import React, { Suspense, lazy, useState } from 'react'
import { useLang } from '../context/LangContext'
import LangSelector from '../components/LangSelector'
import ThemeToggle from '../components/ThemeToggle'

const AuthModal = lazy(() => import('../components/AuthModal'))
const ContactModal = lazy(() => import('../components/ContactModal'))

const text = {
  en: {
    workspace: 'Career growth workspace',
    headline: 'Check your CV against a job before you apply.',
    intro: 'Get an ATS check, improve your CV, draft a cover letter, track applications, and prepare for interviews from one calm workspace.',
    start: 'Start free', sample: 'See sample analysis', helps: 'What it helps you do', flow: 'A better application workflow.',
    trust: 'Trust first', trustTitle: 'Built for job seekers.', trustBody: 'Joblytics helps you improve your own applications. It is not a recruiter database, and the goal is not to sell your CV.',
    privacy: 'Privacy', terms: 'Terms', contact: 'Contact', sampleTitle: 'Sample analysis', match: 'Strong match', matchBody: 'Likely to pass ATS. Add 2 missing keywords and strengthen one achievement.',
    features: [
      ['ATS check', 'Compare your CV against a real job description and know whether the application is worth sending.'],
      ['CV coach', 'Turn generic CV lines into sharper, quantified, recruiter-friendly achievements.'],
      ['Cover letter', 'Generate a tailored draft that reflects the role, your strengths, and the company context.'],
      ['Job tracker', 'Keep applications, statuses, follow-ups, recruiters, and notes in one clear workspace.'],
      ['Interview prep', 'Prepare realistic questions based on your CV gaps, strengths, and the role requirements.'],
      ['Trust & privacy', 'Built for job seekers. Your CV is used to help you apply better.']
    ]
  },
  fr: {
    workspace: 'Espace de progression carrière',
    headline: 'Vérifiez votre CV face à une offre avant de postuler.',
    intro: 'Analyse ATS, amélioration du CV, lettre de motivation, suivi des candidatures et préparation aux entretiens dans un espace clair.',
    start: 'Commencer gratuitement', sample: 'Voir un exemple', helps: 'Ce que Joblytics vous aide à faire', flow: 'Un meilleur parcours de candidature.',
    trust: 'Confiance avant tout', trustTitle: 'Conçu pour les chercheurs d’emploi.', trustBody: 'Joblytics vous aide à améliorer vos candidatures. Ce n’est pas une base recruteur et votre CV n’est pas destiné à être vendu.',
    privacy: 'Confidentialité', terms: 'Conditions', contact: 'Contact', sampleTitle: 'Exemple d’analyse', match: 'Bon match', matchBody: 'Probabilité élevée de passer l’ATS. Ajoutez 2 mots-clés et renforcez une réussite.',
    features: [
      ['Analyse ATS', 'Comparez votre CV à une vraie offre et voyez si la candidature vaut le coup.'],
      ['Coach CV', 'Transformez des lignes génériques en réalisations claires et mesurables.'],
      ['Lettre de motivation', 'Générez un brouillon adapté au poste, à vos forces et au contexte.'],
      ['Suivi candidatures', 'Suivez statuts, relances, recruteurs et notes dans un même espace.'],
      ['Préparation entretien', 'Préparez des questions réalistes selon vos écarts et forces.'],
      ['Confiance & confidentialité', 'Pensé pour les candidats. Votre CV sert à mieux postuler.']
    ]
  }
}
const icons = ['🎯','✍️','✉️','📋','🎤','🛡️']
const cv = name => `var(${name})`

function Logo({ c }) {
  return <div style={{ display:'flex', alignItems:'center', gap:12 }}><div style={{ position:'relative', width:48, height:48, borderRadius:'50%', border:`1.4px solid ${cv('--text-primary')}`, display:'grid', placeItems:'center', background:cv('--bg') }}><span style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:23, color:cv('--text-primary'), letterSpacing:'-.08em' }}>Jb</span><span style={{ position:'absolute', right:-2, top:4, width:10, height:10, borderRadius:999, background:cv('--accent') }} /></div><div><strong style={{ display:'block', fontFamily:'Georgia,serif', fontSize:19, color:cv('--text-primary'), letterSpacing:'-.04em' }}>Joblytics</strong><span style={{ display:'block', fontSize:11, color:cv('--text-secondary'), letterSpacing:'.08em', textTransform:'uppercase' }}>{c.workspace}</span></div></div>
}

function Feature({ i, title, body, icon }) {
  return <article style={{ background:cv('--bg-card'), border:`1px solid ${cv('--border')}`, borderRadius:28, padding:26, minHeight:220, boxShadow:'0 18px 40px var(--shadow)' }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:30 }}><span style={{ fontSize:12, fontWeight:900, color:cv('--accent') }}>0{i+1}</span><span style={{ width:46, height:46, borderRadius:'50%', display:'grid', placeItems:'center', background:cv('--accent-bg'), fontSize:22 }}>{icon}</span></div><h3 style={{ margin:'0 0 10px', color:cv('--text-primary'), fontFamily:'Georgia,serif', fontSize:25, lineHeight:1.05, letterSpacing:'-.04em' }}>{title}</h3><p style={{ margin:0, color:cv('--text-secondary'), lineHeight:1.65, fontSize:14 }}>{body}</p></article>
}

function Sample({ c }) {
  return <div id="sample-analysis" style={{ background:cv('--bg-card'), border:`1px solid ${cv('--border')}`, borderRadius:34, padding:20, boxShadow:'0 28px 80px var(--shadow)' }}><div style={{ border:`1px solid ${cv('--border')}`, borderRadius:26, overflow:'hidden', background:cv('--bg-card') }}><div style={{ minHeight:44, display:'flex', alignItems:'center', gap:7, padding:'0 14px', borderBottom:`1px solid ${cv('--border')}`, background:cv('--bg-input') }}><span>●</span><span>●</span><span>●</span><span style={{ marginLeft:10, fontSize:11, color:cv('--text-secondary') }}>joblytics-ai.com/sample-analysis</span></div><div style={{ padding:22 }}><p style={{ margin:'0 0 10px', fontSize:11, color:cv('--accent'), fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>{c.sampleTitle}</p><h2 style={{ margin:0, color:cv('--text-primary'), fontFamily:'Georgia,serif', fontSize:32, letterSpacing:'-.05em', fontWeight:400 }}>{c.match}</h2><p style={{ margin:'8px 0 18px', color:cv('--text-secondary'), lineHeight:1.55 }}>{c.matchBody}</p>{['ATS keywords detected','CV coach quick wins ready','Interview questions generated'].map(x=><div key={x} style={{ padding:'11px 12px', borderRadius:14, background:cv('--bg-input'), border:`1px solid ${cv('--border')}`, marginTop:10, color:cv('--text-primary'), fontSize:13, fontWeight:700 }}>✓ {x}</div>)}</div></div></div>
}

export default function LandingPage() {
  const { t, lang } = useLang()
  const c = text[lang] || text.en
  const [authOpen,setAuthOpen]=useState(false), [authMode,setAuthMode]=useState('signup'), [contactOpen,setContactOpen]=useState(false)
  const openAuth=m=>{setAuthMode(m);setAuthOpen(true)}
  return <div style={{ minHeight:'100dvh', background:cv('--bg'), color:cv('--text-primary'), fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",Inter,sans-serif' }}><header style={{ position:'sticky', top:0, zIndex:40, background:cv('--bg'), borderBottom:`1px solid ${cv('--border')}` }}><nav style={{ width:'min(1180px,calc(100% - 32px))', minHeight:76, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', gap:18 }}><Logo c={c}/><div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}><LangSelector/><ThemeToggle/><button onClick={()=>openAuth('signin')} style={{ border:`1px solid ${cv('--border')}`, borderRadius:999, background:cv('--bg-input'), color:cv('--text-primary'), minHeight:40, padding:'0 16px', fontWeight:800, cursor:'pointer' }}>{t('sign_in')||'Sign in'}</button><button onClick={()=>openAuth('signup')} style={{ border:0, borderRadius:999, background:cv('--text-primary'), color:cv('--bg'), minHeight:40, padding:'0 18px', fontWeight:850, cursor:'pointer' }}>{t('get_started')||'Get started'}</button></div></nav></header><main><section style={{ width:'min(1180px,calc(100% - 32px))', margin:'0 auto', padding:'clamp(60px,9vw,110px) 0 clamp(46px,7vw,80px)', display:'grid', gridTemplateColumns:'minmax(0,1.05fr) minmax(320px,.95fr)', gap:34, alignItems:'center' }}><div><p style={{ margin:0, color:cv('--accent'), fontSize:12, fontWeight:900, letterSpacing:'.15em', textTransform:'uppercase' }}>{c.workspace}</p><p aria-hidden="true" style={{ margin:'14px 0 0', color:cv('--text-primary'), fontFamily:'Georgia,serif', fontSize:'clamp(50px,8vw,98px)', lineHeight:.86, letterSpacing:'-.085em', fontWeight:400 }}>Joblytics</p><h1 style={{ margin:'22px 0 0', maxWidth:680, color:cv('--text-primary'), fontFamily:'Georgia,serif', fontSize:'clamp(34px,5.4vw,68px)', lineHeight:.95, letterSpacing:'-.065em', fontWeight:400 }}>{c.headline}</h1><p style={{ margin:'18px 0 0', maxWidth:620, color:cv('--text-secondary'), fontSize:16, lineHeight:1.75 }}>{c.intro}</p><div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:32 }}><button onClick={()=>openAuth('signup')} style={{ minHeight:50, padding:'0 24px', borderRadius:999, border:0, background:cv('--text-primary'), color:cv('--bg'), fontWeight:900, cursor:'pointer' }}>{c.start}</button><a href="#sample-analysis" style={{ minHeight:50, padding:'0 22px', borderRadius:999, border:`1px solid ${cv('--border')}`, color:cv('--text-primary'), background:cv('--bg-input'), fontWeight:900, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>{c.sample}</a></div></div><Sample c={c}/></section><section style={{ width:'min(1180px,calc(100% - 32px))', margin:'0 auto', padding:'34px 0 70px' }}><p style={{ color:cv('--accent'), fontSize:12, fontWeight:900, letterSpacing:'.15em', textTransform:'uppercase' }}>{c.helps}</p><h2 style={{ margin:'10px 0 26px', color:cv('--text-primary'), fontFamily:'Georgia,serif', fontSize:'clamp(36px,6vw,66px)', lineHeight:.95, letterSpacing:'-.065em', fontWeight:400 }}>{c.flow}</h2><div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:16 }}>{c.features.map((f,i)=><Feature key={f[0]} i={i} icon={icons[i]} title={f[0]} body={f[1]}/>)}</div></section><section style={{ width:'min(1180px,calc(100% - 32px))', margin:'0 auto', padding:'0 0 80px' }}><div style={{ background:cv('--text-primary'), color:cv('--bg'), borderRadius:34, padding:'clamp(28px,5vw,52px)' }}><p style={{ margin:0, color:cv('--accent'), fontSize:12, fontWeight:900, letterSpacing:'.15em', textTransform:'uppercase' }}>{c.trust}</p><h2 style={{ margin:'10px 0 12px', fontFamily:'Georgia,serif', fontSize:'clamp(34px,5vw,58px)', lineHeight:1, letterSpacing:'-.06em', fontWeight:400 }}>{c.trustTitle}</h2><p style={{ margin:0, lineHeight:1.7, fontSize:15 }}>{c.trustBody}</p></div></section></main><footer style={{ borderTop:`1px solid ${cv('--border')}`, padding:'30px 0 42px' }}><div style={{ width:'min(1180px,calc(100% - 32px))', margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}><div style={{ color:cv('--text-secondary'), fontSize:12 }}>© {new Date().getFullYear()} Joblytics.</div><div style={{ display:'flex', gap:16 }}><a href="/privacy" style={{ color:cv('--text-secondary'), textDecoration:'none' }}>{c.privacy}</a><a href="/terms" style={{ color:cv('--text-secondary'), textDecoration:'none' }}>{c.terms}</a><button onClick={()=>setContactOpen(true)} style={{ color:cv('--text-secondary'), background:'transparent', border:0, cursor:'pointer' }}>{c.contact}</button></div></div></footer><style>{`@media(max-width:920px){main section:first-of-type{grid-template-columns:1fr!important}main section:nth-of-type(2)>div:last-child{grid-template-columns:1fr 1fr!important}}@media(max-width:640px){header nav{align-items:flex-start!important;min-height:auto!important;padding:12px 0!important}header nav>div:last-child{width:100%;justify-content:flex-start!important}main section:nth-of-type(2)>div:last-child{grid-template-columns:1fr!important}}`}</style><Suspense fallback={null}>{authOpen&&<AuthModal initialMode={authMode} onClose={()=>setAuthOpen(false)}/>} {contactOpen&&<ContactModal onClose={()=>setContactOpen(false)}/>}</Suspense></div>
}