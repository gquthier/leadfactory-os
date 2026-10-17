import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import type {TeamResource} from '@/types/index';

export type SopResource = TeamResource & {video_url?:string;captions_url?:string;chapters_url?:string;guide_url?:string;poster_url?:string;youtube_video_id?:string;youtube_url?:string;audience:'client'|'agency';duration_seconds:number};
type Item = {id:string;title:string;description?:string;audience:'client'|'agency';durationSeconds:number;files:{video:string;captions:string;chapters:string;guide:string;poster?:string;model?:string}};

export async function loadSops(root=path.join(process.cwd(),'public/sops'),hostedPath=path.join(process.cwd(),'resources/sops-youtube.json')):Promise<SopResource[]> {
 const [local,hosted]=await Promise.all([loadLocalSops(root),loadHostedSops(hostedPath)]);
 const merged=new Map(local.map(item=>[item.id,item]));
 for(const item of hosted)merged.set(item.id,{...item,...merged.get(item.id),youtube_video_id:item.youtube_video_id,youtube_url:item.youtube_url});
 return [...merged.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

async function loadHostedSops(file:string):Promise<SopResource[]> {
 let catalog;
 try {catalog=JSON.parse(await readFile(file,'utf8'));}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 if(catalog.version!==1||!Array.isArray(catalog.items)||catalog.items.length>200)throw new Error('Catalogue SOP YouTube invalide.');
 const seen=new Set<string>();
 return catalog.items.map((item:Omit<Item,'files'>&{youtubeVideoId:string},index:number):SopResource=>{
  if(!item||typeof item.id!=='string'||!/^[a-z0-9-]+$/.test(item.id)||typeof item.title!=='string'||!item.title.trim()||!['client','agency'].includes(item.audience)||!Number.isFinite(item.durationSeconds)||item.durationSeconds<=0)throw new Error('Entrée SOP invalide.');
  if(typeof item.youtubeVideoId!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(item.youtubeVideoId))throw new Error('Identifiant YouTube invalide.');
  if(seen.has(item.id))throw new Error('Identifiant SOP dupliqué.');seen.add(item.id);
  return {id:'library-'+item.id,created_by:null,kind:'sop',title:item.title,loom_url:null,document_url:null,body_html:null,body_text:item.description??null,is_published:true,order_index:index,created_at:'',updated_at:'',audience:item.audience,duration_seconds:item.durationSeconds,youtube_video_id:item.youtubeVideoId,youtube_url:'https://www.youtube.com/watch?v='+item.youtubeVideoId};
 });
}

async function loadLocalSops(root:string):Promise<SopResource[]> {
 let catalog;
 try {catalog=JSON.parse(await readFile(path.join(root,'catalog.json'),'utf8'));}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 if(catalog.version!==1||!Array.isArray(catalog.items)||catalog.items.length>200)throw new Error('Catalogue SOP invalide.');
 const base=await realpath(root),seen=new Set<string>();
 async function asset(relative:string) {
  if(typeof relative!=='string'||!relative||relative.startsWith('/')||relative.split('/').some(part=>part==='..'||part==='.'||!part)||/[\\:#?%\x00-\x1f]/.test(relative))throw new Error('Chemin de média SOP invalide.');
  const file=path.join(base,relative);
  try {
   const resolved=await realpath(file);
   if(!resolved.startsWith(base+path.sep))throw new Error('Média SOP à l’extérieur du dossier autorisé.');
   const info=await stat(resolved);if(!info.isFile()||!info.size)return null;
   return '/sops/'+relative.split('/').map(encodeURIComponent).join('/');
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 }
 const results:SopResource[]=[];
 for(const [index,item] of (catalog.items as Item[]).entries()) {
  if(!item||typeof item.id!=='string'||!/^[a-z0-9-]+$/.test(item.id)||typeof item.title!=='string'||!item.title.trim()||!['client','agency'].includes(item.audience)||!Number.isFinite(item.durationSeconds)||item.durationSeconds<=0||!item.files)throw new Error('Entrée SOP invalide.');
  if(seen.has(item.id))throw new Error('Identifiant SOP dupliqué.');seen.add(item.id);
  const [video,captions,chapters,guide,poster,model]=await Promise.all([asset(item.files.video),asset(item.files.captions),asset(item.files.chapters),asset(item.files.guide),item.files.poster?asset(item.files.poster):null,item.files.model?asset(item.files.model):null]);
  if(!video||!captions||!chapters||!guide)continue;
  results.push({id:'library-'+item.id,created_by:null,kind:'sop',title:item.title,loom_url:null,document_url:model,body_html:null,body_text:item.description??null,is_published:true,order_index:index,created_at:'',updated_at:'',video_url:video,captions_url:captions,chapters_url:chapters,guide_url:guide,...(poster?{poster_url:poster}:{}),audience:item.audience,duration_seconds:item.durationSeconds});
 }
 return results;
}
