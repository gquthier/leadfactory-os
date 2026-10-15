import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

const labels={codex:'Codex',claude:'Claude Code'};
function runStatus(command,args){return new Promise(resolve=>execFile(command,args,{timeout:4000,maxBuffer:65536,windowsHide:true,shell:false},(error,stdout,stderr)=>resolve({code:error?error.code:0,stdout,stderr,error:error?.code})));}
const modelName=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._/:+-]{0,119}$/.test(value)&&! /^(sk-|xox|ghp_|AIza)/.test(value)?value:null;
export async function configuredModel(provider,{read=readFile,env=process.env,userDirectory=homedir()}={}){
 try{
  if(provider==='claude'){
   if(env.ANTHROPIC_MODEL)return modelName(env.ANTHROPIC_MODEL);
   const text=await read(join(env.CLAUDE_CONFIG_DIR||join(userDirectory,'.claude'),'settings.json'),'utf8');
   if(text.length>262144)return null;
   return modelName(JSON.parse(text).model);
  }
  const text=await read(join(env.CODEX_HOME||join(userDirectory,'.codex'),'config.toml'),'utf8');if(text.length>262144)return null;
  const sections=text.split(/^\s*\[/m),top=sections[0];
  const value=(source,key)=>source.match(new RegExp('^\\s*'+key+'\\s*=\\s*["\']([^"\'\\n]+)["\']','m'))?.[1];
  const profile=value(top,'profile');
  const active=profile&&sections.find(section=>section.startsWith(`profiles.${profile}]`)||section.startsWith(`profiles."${profile}"]`));
  return modelName((active&&value(active,'model'))||value(top,'model'));
 }catch{return null;}
}
export async function detectAgents({run=runStatus,model=configuredModel}={}){
 return Promise.all(['codex','claude'].map(async id=>{
  const result={id,label:labels[id],installed:false,version:null,authentication:'not_installed',model:null};
  try{
   const version=await run(id,['--version']);if(version.code!==0)return result;
   result.installed=true;result.version=(version.stdout||'').match(/\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?/)?.[0]??null;
   const [auth,hint]=await Promise.all([run(id,id==='codex'?['login','status']:['auth','status','--json']),model(id)]);result.model=hint;
   result.authentication='unknown';
   if(id==='claude'){try{const data=JSON.parse(auth.stdout);if(typeof data.loggedIn==='boolean')result.authentication=data.loggedIn&&auth.code===0?'ready':'login_required';}catch{}}
   else if(/not logged|log in|login required/i.test((auth.stdout||'')+(auth.stderr||'')))result.authentication='login_required';
   else if(auth.code===0&&/logged in/i.test((auth.stdout||'')+(auth.stderr||'')))result.authentication='ready';
  }catch{if(result.installed)result.authentication='unknown';}
  return result;
 }));
}
export function preferredAgent(agents,preferred){
 if(preferred==='manual')return 'manual';
 if(agents.some(a=>a.id===preferred&&a.installed))return preferred;
 return agents.find(a=>a.authentication==='ready')?.id||agents.find(a=>a.installed)?.id||'manual';
}
