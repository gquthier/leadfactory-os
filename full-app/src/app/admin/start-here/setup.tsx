"use client";

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {setupPrompt} from '../../../../runtime/setup-prompt.mjs';
import {AgencyBackup} from './backup';

type Service = 'meta' | 'slack' | 'elevenlabs' | 'openrouter';
type CatalogItem = {id:string;title:string;purpose:string;steps:string[];docs:{label:string;url:string}[]};
type Connection = {configured:boolean;status:string};
type State = Partial<Record<Service, Connection>> & {ai?:{provider:string;model:string}|null;automation?:boolean};
const services: {id:Service;name:string;description:string}[] = [
 {id:'meta',name:'Meta',description:'Votre token pour accéder aux actifs publicitaires autorisés.'},
 {id:'slack',name:'Slack externe',description:'Le token du bot de votre espace Slack. Votre agent vous guide aussi pour le canal partagé avec le client.'},
 {id:'elevenlabs',name:'ElevenLabs',description:'Facultatif · pour générer les voix des vidéos.'},
 {id:'openrouter',name:'OpenRouter',description:'Facultatif · pour utiliser une IA avec une clé API.'},
];
function statusLabel(connection?:Connection) {
 return connection?.status==='verified'?'Accès vérifié':connection?.status==='error'?'À vérifier':connection?.configured?'Clé enregistrée':'À connecter';
}
export function StarterSetup({catalog}:{catalog:CatalogItem[]}) {
 const [state,setState]=useState<State>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [provider,setProvider]=useState('codex'),[model,setModel]=useState(''),[automation,setAutomation]=useState(false);
 const [tokens,setTokens]=useState<Partial<Record<Service,string>>>({}),[version,setVersion]=useState(''),[copiedPrompt,setCopiedPrompt]=useState('');
 async function refresh() {
  const response=await fetch('/api/starter/connections');
  if(!response.ok)throw new Error('Impossible de charger les connexions.');
  const data:State=await response.json();setState(data);setLoaded(true);
  if(data.ai){setProvider(data.ai.provider);setModel(data.ai.model);setAutomation(!!data.automation);}
 }
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 async function copyPrompt(service?:Service) {
  const prompt=`${setupPrompt(service)}\n\nApplication de cette session : ${window.location.origin}/admin/start-here`;
  setCopiedPrompt(prompt);setError('');
  try {await navigator.clipboard.writeText(prompt);setNotice('Prompt copié. Collez-le dans votre agent pour lancer le setup.');}
  catch {setNotice('Sélectionnez le prompt ci-dessous et copiez-le dans votre agent.');}
 }
 async function act(body:Record<string,unknown>) {
  setBusy(true);setError('');setNotice('');
  try {
   const response=await fetch('/api/starter/connections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Connexion impossible.');
   if(typeof body.service==='string' && body.token)setTokens(previous=>({...previous,[body.service as string]:''}));
   await refresh();
   setNotice(body.action==='test'?'Accès au compte vérifié. Votre agent peut maintenant vérifier les permissions utiles.':body.action==='ai'?'Votre IA est connectée.':body.action==='remove'?'Clé retirée.':'Clé enregistrée. Cliquez sur Vérifier l’accès.');
  }catch(e){setError(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}
 }
 return <div className="space-y-6">
  <section className="card-brutal p-6 border-lf-blue" aria-labelledby="setup-prompt-title">
   <span className="text-sm font-black text-lf-blue">ÉTAPE 1</span>
   <h2 id="setup-prompt-title" className="text-2xl font-black mt-2">Confiez le setup à votre agent</h2>
   <p className="my-3 max-w-3xl">Copiez ce prompt dans votre agent. Il cherche les accès déjà disponibles, configure les connexions et vous guide uniquement pour ce qui manque.</p>
   <button className="btn-primary" onClick={()=>copyPrompt()}>Copier le setup prompt</button>
   <p className="text-sm mt-3 text-lf-gray">Dans le CLI, cette mission est envoyée par défaut quand vous lancez votre agent.</p>
   <details className="mt-4"><summary className="font-bold cursor-pointer">Voir le prompt</summary><pre className="whitespace-pre-wrap text-sm mt-3 bg-gray-50 p-4 max-h-80 overflow-auto">{setupPrompt()}</pre></details>
  </section>
  {notice&&<p role="status" className="border-3 border-lf-blue bg-blue-50 p-4 font-medium">{notice}</p>}
  {error&&<p role="alert" className="border-3 border-red-600 p-4 text-red-700">{error}</p>}
  {copiedPrompt&&<details className="card-brutal-sm p-4"><summary className="cursor-pointer font-bold">Prompt prêt à transmettre à votre agent</summary><textarea aria-label="Prompt à transmettre" className="input-brutal mt-3 min-h-52 text-sm" readOnly value={copiedPrompt} onFocus={event=>event.target.select()}/></details>}
  <section aria-labelledby="connections-title">
   <span className="text-sm font-black text-lf-blue">ÉTAPE 2</span><h2 id="connections-title" className="text-2xl font-black mt-2">Connectez vos outils</h2>
   <p className="mt-2 mb-5 text-lf-gray">Ajoutez uniquement les clés utiles à votre activité. Votre agent peut vous aider à les trouver.</p>
   <div className="grid md:grid-cols-2 gap-4">{services.map(({id,name,description})=><article key={id} className="card-brutal-sm p-5">
    <div className="flex justify-between items-start gap-3"><h3 className="text-xl font-black">{name}</h3><span className={`text-xs font-bold rounded px-2 py-1 ${state[id]?.status==='verified'?'bg-green-50 text-green-800':'bg-gray-100 text-gray-700'}`}>{loaded?statusLabel(state[id]):'Chargement…'}</span></div>
    <p className="text-sm my-3 min-h-10">{description}</p>
    <label htmlFor={`token-${id}`} className="font-bold text-sm">Clé API / token {name}</label>
    <input id={`token-${id}`} className="input-brutal mt-1" type="password" autoComplete="off" spellCheck={false} value={tokens[id]||''} onChange={event=>setTokens(previous=>({...previous,[id]:event.target.value}))} placeholder={state[id]?.configured?'Clé enregistrée · remplacer si nécessaire':'Collez votre clé ici'}/>
    <div className="flex flex-wrap gap-2 mt-3"><button className="btn-primary text-sm" disabled={busy||!loaded||!tokens[id]?.trim()} onClick={()=>act({service:id,token:tokens[id]?.trim(),...(id==='meta'&&version?{version}:{}),...(id==='openrouter'&&model?{model}:{})})}>Enregistrer</button><button className="btn-secondary text-sm" disabled={busy||!state[id]?.configured} onClick={()=>act({action:'test',service:id})}>Vérifier l’accès</button></div>
    <button className="text-lf-blue text-sm font-bold underline mt-4 text-left" onClick={()=>copyPrompt(id)}>Ask agent to find it and update</button>
    <p className="text-xs text-lf-gray mt-1">Copie une demande pour cette connexion, à envoyer à votre agent.</p>
    <details className="mt-4 text-sm"><summary className="font-bold cursor-pointer">Aide et options</summary>
     {id==='meta'&&<label className="block mt-3">Version Graph API (facultative)<input className="input-brutal" value={version} onChange={event=>setVersion(event.target.value)} placeholder="Version utilisée par votre app Meta"/></label>}
     {catalog.filter(item=>item.id===id).map(item=><div key={item.id} className="mt-3"><ol className="list-decimal pl-5 space-y-2">{item.steps.map((step,index)=><li key={index}>{step}</li>)}</ol><div className="mt-3">{item.docs.map(doc=><a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="block underline text-lf-blue mt-2">{doc.label} ↗</a>)}</div></div>)}
     {state[id]?.configured&&<button className="underline mt-4" disabled={busy} onClick={()=>act({action:'remove',service:id})}>Retirer cette clé</button>}
    </details>
   </article>)}</div>
   <p className="text-xs text-lf-gray mt-4">Les clés restent côté serveur dans votre installation. Les prompts copiés ne contiennent aucune clé.</p>
  </section>
  <section className="card-brutal p-6"><span className="text-sm font-black text-lf-blue">ÉTAPE 3</span><h2 className="text-2xl font-black mt-2">Vérifiez et démarrez</h2><p className="my-3">Cliquez sur « Vérifier l’accès » pour chaque clé enregistrée. Votre agent vérifie ensuite les permissions Meta et le canal Slack externe nécessaires à votre activité.</p><p className="text-sm text-lf-gray mb-4">Le test confirme l’accès au compte. Les envois et synchronisations se configurent ensuite avec votre agent.</p><div className="flex flex-wrap gap-3"><button className="btn-primary" onClick={()=>copyPrompt()}>Demander à mon agent de terminer le setup</button><Link href="/admin/resources" className="btn-secondary">Voir les SOP</Link></div></section>
  <details className="card-brutal p-6"><summary className="font-black cursor-pointer">Options avancées · IA, équipe et sauvegardes</summary><div className="space-y-6 mt-6">
   <section><h2 className="font-black text-xl">IA des rôles de l’application</h2><p className="my-3 text-sm">Si vous utilisez déjà votre agent dans le CLI, vous pouvez continuer avec lui. Ce réglage sert aux missions lancées depuis les écrans de l’application.</p><div className="grid md:grid-cols-2 gap-4"><label className="font-bold">Fournisseur<select aria-label="Fournisseur IA" className="input-brutal" value={provider} onChange={event=>setProvider(event.target.value)}><option value="codex">Codex CLI</option><option value="claude">Claude Code CLI</option><option value="openrouter">OpenRouter</option></select></label><label className="font-bold">Modèle<input aria-label="Modèle IA" className="input-brutal" value={model} onChange={event=>setModel(event.target.value)} placeholder={provider==='openrouter'?'Identifiant du modèle requis':'Vide : modèle par défaut de votre CLI'}/></label></div><label className="flex gap-3 my-4"><input type="checkbox" checked={automation} onChange={event=>setAutomation(event.target.checked)}/>Lancer les quatre rôles de rédaction après un onboarding client terminé.</label><button className="btn-primary" disabled={busy} onClick={()=>act({action:'ai',provider,model,automation})}>Connecter l’IA aux rôles</button><p className="text-sm mt-3">{state.ai?`Configuré : ${state.ai.provider}`:'Aucun fournisseur configuré pour les rôles.'}</p></section>
   <section><h2 className="font-black text-xl mb-3">Équipe et données</h2><div className="flex flex-wrap gap-3"><Link className="btn-secondary" href="/admin/team">Mon équipe</Link><Link className="btn-secondary" href="/admin/agents">Mes agents</Link><Link className="btn-secondary" href="/onboarding">Brief client complet</Link><a className="btn-secondary" href="/api/starter/schema">Schéma SQL</a></div></section>
   <AgencyBackup/>
   {catalog.filter(item=>!services.some(service=>service.id===item.id)).map(item=><details key={item.id} className="card-brutal-sm p-4"><summary className="font-bold cursor-pointer">{item.title}</summary><p className="my-3">{item.purpose}</p><ol className="list-decimal pl-5 space-y-2">{item.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>{item.docs.map(doc=><a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="block text-lf-blue underline mt-3">{doc.label} ↗</a>)}</details>)}
  </div></details>
 </div>;
}
