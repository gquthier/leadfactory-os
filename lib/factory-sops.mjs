import {readFile,lstat,mkdir,open,rename,unlink,rmdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const HOSTS=new Set(['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
export function validateSopManifest(manifest){
  if(manifest?.version!==1||!/^v\d+\.\d+\.\d+$/.test(manifest.release)||!Array.isArray(manifest.files)||manifest.files.length>200)throw new Error('Manifeste SOP invalide.');
  const paths=new Set(),assets=new Set();let total=0;
  for(const file of manifest.files){
    if(typeof file.path!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(file.path)||file.path.split('/').some(p=>!p||p==='.'||p==='..')||file.path.includes('\\'))throw new Error('Chemin SOP invalide.');
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(file.asset)||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.bytes)||file.bytes<=0||file.bytes>500_000_000||paths.has(file.path)||assets.has(file.asset))throw new Error('Fichier SOP invalide.');
    total+=file.bytes;paths.add(file.path);assets.add(file.asset);
  }
  if(!paths.has('catalog.json')||total>3_000_000_000)throw new Error('Catalogue SOP absent ou bibliothèque trop volumineuse.');
  return manifest;
}

async function safeDir(path){
  try{const info=await lstat(path);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('Dossier SOP : lien symbolique ou fichier interdit.');}
  catch(error){if(error.code!=='ENOENT')throw error;await mkdir(path,{mode:0o700});}
}
async function digest(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function downloaded(path,file){
  try{const info=await lstat(path);if(info.isSymbolicLink()||!info.isFile())throw new Error('Fichier SOP symbolique interdit.');if(info.size!==file.bytes||await digest(path)!==file.sha256)throw new Error(`Fichier modifié conservé : ${file.path}. Déplacez-le avant de réinstaller les SOP.`);return true;}
  catch(error){if(error.code==='ENOENT')return false;throw error;}
}
async function request(url,fetchImpl,signal){
  for(let i=0;i<6;i++){
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!HOSTS.has(parsed.hostname)||parsed.username||parsed.password||parsed.port)throw new Error('Destination du téléchargement SOP refusée.');
    const response=await fetchImpl(parsed.href,{redirect:'manual',signal,headers:{'User-Agent':'LeadFactory-OS-SOP-Installer'}});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('Redirection SOP invalide.');url=new URL(location,parsed).href;continue;}
    if(!response.ok||!response.body)throw new Error(`Téléchargement SOP indisponible (${response.status}). Relancez « npm run factory -- sops ».`);
    return response;
  }
  throw new Error('Trop de redirections SOP.');
}

/** No archive extraction or downloaded code execution; catalog activated only after every hash passes. */
export async function installSops(root,{manifest,fetchImpl=fetch,onMessage=console.log,signal}={}){
  signal?.throwIfAborted();
  manifest=validateSopManifest(manifest??JSON.parse(await readFile(join(root,'resources/sops-manifest.json'),'utf8')));
  const base=join(resolve(root),'full-app/public/sops');
  for(const dir of [join(root,'full-app'),join(root,'full-app/public'),base])await safeDir(dir);
  const lock=join(base,'.install-lock');
  try{await mkdir(lock,{mode:0o700});}catch(error){if(error.code==='EEXIST')throw new Error('Une installation SOP est en cours. Si elle a été interrompue, retirez le dossier vide public/sops/.install-lock puis relancez.');throw error;}
  let downloadedFiles=0;
  try{
    const files=[...manifest.files].sort((a,b)=>Number(a.path==='catalog.json')-Number(b.path==='catalog.json'));
    for(const [index,file] of files.entries()){
      signal?.throwIfAborted();
      const parts=file.path.split('/');let folder=base;
      for(const part of parts.slice(0,-1)){folder=join(folder,part);await safeDir(folder);}
      const destination=join(base,file.path);
      if(await downloaded(destination,file))continue;
      onMessage(`SOP ${index+1}/${files.length} · ${file.path} (${Math.ceil(file.bytes/1e6)} Mo)`);
      const temporary=join(dirname(destination),'.download-'+randomUUID());let handle;
      try{
        const response=await request(`https://github.com/gquthier/leadfactory-os/releases/download/${manifest.release}/${file.asset}`,fetchImpl,signal?AbortSignal.any([signal,AbortSignal.timeout(600000)]):AbortSignal.timeout(600000));
        handle=await open(temporary,'wx',0o600);let bytes=0;const hash=createHash('sha256');
        for await(const chunk of response.body){bytes+=chunk.length;if(bytes>file.bytes)throw new Error('Taille du média SOP incorrecte.');hash.update(chunk);await handle.writeFile(chunk);}
        await handle.sync();await handle.close();handle=undefined;
        if(bytes!==file.bytes||hash.digest('hex')!==file.sha256)throw new Error('Contrôle d’intégrité SOP échoué. Aucun fichier téléchargé incorrect n’a été installé.');
        // Refuse concurrent user changes rather than replace a file they just created.
        if(await downloaded(destination,file)){await unlink(temporary);continue;}
        await rename(temporary,destination);downloadedFiles++;
      }finally{await handle?.close();await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
    }
    onMessage(`Bibliothèque SOP vérifiée (${manifest.files.length} fichiers, ${downloadedFiles} téléchargés).`);
    return {files:manifest.files.length,downloaded:downloadedFiles};
  }finally{await rmdir(lock);}
}
