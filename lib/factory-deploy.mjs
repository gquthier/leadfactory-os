import {access} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';

async function execute(command,args) {
 return new Promise(resolve=>execFile(command,args,{timeout:15000,maxBuffer:1024*1024,windowsHide:true},(error,stdout)=>resolve({ok:!error,stdout:error?'':stdout})));
}
async function present(file){try{await access(file);return true;}catch{return false;}}

export async function deploymentCheck(root,{run=execute,env=process.env,verify=false}={}) {
 const [supabase,railway,podman]=await Promise.all(['supabase','railway','podman'].map(async name=>{
  const result=await run(name,['--version']);return {installed:result.ok,version:result.ok?result.stdout.trim().split('\n')[0].slice(0,120):null};
 }));
 const checked=async(tool,command,args)=>!tool.installed?'not_installed':!verify?'not_checked':(await run(command,args)).ok?'verified':'unavailable';
 const [supabaseAccount,railwayAccount,podmanEngine,environmentFilePresent,supabaseConfig,railwayConfig]=await Promise.all([
  checked(supabase,'supabase',['projects','list','--output','json']),checked(railway,'railway',['whoami','--json']),checked(podman,'podman',['info','--format','json']),
  Promise.all(['.env','.env.local','full-app/.env','full-app/.env.local'].map(file=>present(join(root,file)))).then(values=>values.some(Boolean)),
  present(join(root,'supabase/config.toml')),Promise.all(['railway.json','railway.toml','full-app/railway.json','full-app/railway.toml'].map(file=>present(join(root,file)))).then(values=>values.some(Boolean)),
 ]);
 return {version:1,verifiedConnections:verify,environmentFilePresent,
  supabase:{...supabase,account:supabaseAccount,tokenPresent:!!env.SUPABASE_ACCESS_TOKEN,projectConfig:supabaseConfig,role:'database'},
  railway:{...railway,account:railwayAccount,tokenPresent:!!(env.RAILWAY_TOKEN||env.RAILWAY_API_TOKEN),projectConfig:railwayConfig,role:'hosting'},
  podman:{...podman,engine:podmanEngine,role:'local_container'},
  publicReady:false,blockers:['Authentification distante et séparation de deux clients à recetter.','RLS, Storage, callbacks et sauvegarde distante à vérifier.','Licence et périmètre de publication de full-app à confirmer.'],
  next:'Choisir une destination et confier la préparation à votre agent. Le diagnostic ne crée aucune ressource distante.'};
}

export function deploymentPrompt(target,report) {
 if(!['railway','supabase','podman'].includes(target))throw new Error('Destination attendue : railway, supabase ou podman.');
 return `Prépare le partage de mon dashboard LeadFactory, destination choisie : ${target}.
Lis docs/DEPLOYMENT.md, docs/LAUNCH-READINESS.md et full-app/NOTICE.md. Diagnostic sans secrets : ${JSON.stringify(report)}
Vérifie les outils et sessions globales existantes avec leurs CLI ; réutilise seulement les comptes/projets autorisés pour cette installation. Ne réaffiche aucun token ni contenu de configuration privée. Une présence de configuration ne prouve pas la connexion.
Railway héberge l’application, Supabase fournit la base/Auth/Storage, Podman exécute le conteneur. Ne les traite pas comme trois hébergeurs équivalents. Propose une seule prochaine action à la fois, avec la commande exacte et son résultat attendu. Prépare tous les fichiers et vérifications possibles avant toute question.
Pour Podman, utilise le paquet deploy/Containerfile, une persistance explicite et un port publié uniquement sur 127.0.0.1 ; vérifie le démarrage et la reprise des données. Pour un partage Internet, termine la recette Auth, autorisations, RLS entre deux clients, Storage, callbacks et sauvegardes avant exposition ; ne contourne pas le garde local en changeant seulement LEADFACTORY_DATA_MODE. N’utilise aucune donnée de l’agence d’origine. Ne publie pas un dépôt ou une image dont la licence reste à confirmer.
Choisis avec moi le projet et l’environnement s’ils ne sont pas déterminés, annonce les ressources payantes envisagées et respecte les autorisations déjà données. Déploie uniquement dans le périmètre autorisé après les vérifications nécessaires, puis teste l’URL et documente les preuves, limites, coût connu et reprise dans .leadfactory/NEXT.md. Ne déclare pas le dashboard partagé sur la seule réussite d’un build.`;
}
