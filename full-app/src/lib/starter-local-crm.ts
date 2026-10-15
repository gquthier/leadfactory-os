import {randomUUID} from 'node:crypto';
import {localTransaction,seedLocalPipeline,LOCAL_ADMIN_ID} from './starter-local-store';
import type {StoreOptions} from './starter-local-store';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const now=()=>new Date().toISOString();
const row=(data:Record<string,unknown>)=>({id:randomUUID(),created_at:now(),updated_at:now(),...data});
function requireValue(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
function pick(data:any,keys:string[]){return Object.fromEntries(keys.filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));}

/** A scoped, disconnected CRM for the local operator's selected client preview. */
export async function handleLocalCrm(req:Request,path:string,data:any,options:StoreOptions):Promise<Response|undefined>{
 const match=path.match(/^\/api\/client\/(leads|pipeline-stages)(?:\/([^/]+))?(\/activities)?$/);
 const preferences=path==='/api/client/preferences/notifications';
 if(!match&&!preferences)return;
 if(match?.[2]==='import')return; // CSV import remains explicitly disconnected.
 const method=req.method,url=new URL(req.url);
 const raw=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('lf_preview_client_id='))?.slice(21);
 const clientId=raw?decodeURIComponent(raw):null;
 if(!clientId)return response({error:'Sélectionner un client en aperçu local'},403);
 return localTransaction(db=>{
  const client=db.tables.profiles.find(p=>p.id===clientId&&p.role==='client'&&p.is_active!==false);
  if(!client)return {body:{error:'Client local introuvable'},status:403};
  // Return plain data from the transaction; Response objects cannot be structuredClone'd.
  const ok=(body:unknown,status=200)=>({body,status});
  const no=(message:string,status=400)=>ok({error:message},status);
  if(preferences){
   if(!['GET','PATCH'].includes(method))return no('Méthode non autorisée',405);
   for(const key of ['notify_new_lead','notify_new_lead_email'])if(method==='PATCH'&&data[key]!==undefined){requireValue(typeof data[key]==='boolean','Préférence booléenne requise');client[key]=data[key];}
   return ok({notify_new_lead:client.notify_new_lead!==false,notify_new_lead_email:client.notify_new_lead_email!==false,local_only:true,email_sent:false});
  }
  const [,kind,id,activityPath]=match!;
  if(kind==='pipeline-stages'){
   if(activityPath)return no('Route inconnue',404);
   const stages=seedLocalPipeline(db,clientId);
   if(!id&&method==='GET')return ok({stages});
   const stage=id?stages.find(s=>s.id===id):undefined;
   if(id&&!stage)return no('Étape introuvable',404);
   if(method==='DELETE'&&stage){if(db.tables.leads.some(l=>l.pipeline_stage_id===id))return no('Déplacez les leads avant de supprimer cette étape.',409);db.tables.pipeline_stages=db.tables.pipeline_stages.filter(s=>s.id!==id);return ok({success:true});}
   if((method==='POST'&&!id)||(method==='PATCH'&&stage)){
    if(method==='POST'||data.name!==undefined)requireValue(text(data.name)&&text(data.name).length<=100,'Nom d’étape requis (100 caractères maximum)');
    if(data.color!==undefined)requireValue(/^#[0-9a-f]{6}$/i.test(data.color),'Couleur invalide');
    if(data.display_order!==undefined)requireValue(Number.isInteger(data.display_order)&&data.display_order>=0,'Ordre invalide');
    for(const key of ['is_won','is_lost'])if(data[key]!==undefined)requireValue(typeof data[key]==='boolean','Indicateur booléen requis');
    const changes=pick(data,['color','display_order','is_won','is_lost']);if(data.name!==undefined)changes.name=text(data.name);
    requireValue(!((changes.is_won??stage?.is_won)&&(changes.is_lost??stage?.is_lost)),'Une étape ne peut être gagnée et perdue');
    if(stage){Object.assign(stage,changes,{updated_at:now()});return ok({stage});}
    const added=row({client_id:clientId,color:'#3B82F6',display_order:stages.length,is_default:false,is_won:false,is_lost:false,...changes});db.tables.pipeline_stages.push(added);return ok({stage:added},201);
   }
   return no('Méthode non autorisée',405);
  }
  const leads=db.tables.leads.filter(l=>l.client_id===clientId),lead=id?leads.find(l=>l.id===id):undefined;
  if(id&&!lead)return no('Lead introuvable',404);
  const activities=()=>db.tables.lead_activities.filter(a=>a.lead_id===id&&a.client_id===clientId).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const addActivity=(leadId:string,values:Record<string,unknown>)=>{const activity=row({...values,lead_id:leadId,client_id:clientId,created_by:LOCAL_ADMIN_ID});db.tables.lead_activities.push(activity);return activity;};
  if(activityPath){
   if(method==='GET')return ok({activities:activities()});
   if(method==='POST'){
    requireValue(['note','call','email','meeting','task','whatsapp','sms','other'].includes(data.activity_type),'Type d’activité invalide');
    requireValue(text(data.title)&&text(data.title).length<=300,'Titre d’activité requis');
    return ok({activity:addActivity(id,{activity_type:data.activity_type,title:text(data.title),description:text(data.description)||null}),local_only:true,email_sent:false},201);
   }
   return no('Méthode non autorisée',405);
  }
  if(method==='GET'){
   if(lead)return ok({lead,activities:activities()});
   const filtered=leads.filter(l=>!url.searchParams.get('status')||l.status===url.searchParams.get('status')).sort((a,b)=>b.created_at.localeCompare(a.created_at));
   const offset=Math.max(0,Number(url.searchParams.get('offset'))||0),limit=Math.max(1,Math.min(1000,Number(url.searchParams.get('limit'))||100));
   return ok({leads:filtered.slice(offset,offset+limit).map(l=>({...l,campaigns:db.tables.campaigns.find(c=>c.id===l.campaign_id&&c.client_id===clientId)??null})),total:filtered.length});
  }
  if(method==='DELETE'&&lead){db.tables.leads=db.tables.leads.filter(l=>l.id!==id);db.tables.lead_activities=db.tables.lead_activities.filter(a=>a.lead_id!==id);return ok({success:true});}
  if((method==='POST'&&!id)||(method==='PATCH'&&lead)){
   const keys=['full_name','email','phone','company','city','source','notes','campaign_id','pipeline_stage_id','tags','preferred_contact','status','quality_score','revenue','cash_collected','last_contacted_at','next_follow_up','assigned_to'];
   const changes=pick(data,keys);
   if(method==='POST'||data.full_name!==undefined)requireValue(text(data.full_name),'Nom complet requis');
   for(const key of ['full_name','email','phone','company','city','source','notes','preferred_contact'])if(changes[key]!=null){requireValue(typeof changes[key]==='string'&&changes[key].length<=10000,'Texte invalide');changes[key]=changes[key].trim();}
   if(changes.email)changes.email=changes.email.toLowerCase();
   if(changes.campaign_id)requireValue(db.tables.campaigns.some(c=>c.id===changes.campaign_id&&c.client_id===clientId),'Campagne du client requise');
   if(changes.pipeline_stage_id)requireValue(db.tables.pipeline_stages.some(s=>s.id===changes.pipeline_stage_id&&s.client_id===clientId),'Étape du client requise');
   if(changes.assigned_to)requireValue(db.tables.profiles.some(p=>p.id===changes.assigned_to&&p.role==='admin'),'Responsable local requis');
   if(changes.status!==undefined)requireValue(['new','contacted','qualified','converted','lost'].includes(changes.status),'Statut invalide');
   if(changes.quality_score!=null)requireValue(Number.isInteger(changes.quality_score)&&changes.quality_score>=0&&changes.quality_score<=5,'Qualité de 0 à 5 requise');
   for(const key of ['revenue','cash_collected'])if(changes[key]!=null)requireValue(typeof changes[key]==='number'&&Number.isFinite(changes[key])&&changes[key]>=0,'Montant invalide');
   for(const key of ['next_follow_up','last_contacted_at'])if(changes[key]!=null)requireValue(typeof changes[key]==='string'&&Number.isFinite(Date.parse(changes[key])),'Date invalide');
   if(changes.tags!==undefined)requireValue(Array.isArray(changes.tags)&&changes.tags.length<=50&&changes.tags.every((tag:unknown)=>typeof tag==='string'&&tag.length<=100),'Liste de tags invalide');
   if(lead){
    for(const [key,activity_type,title] of [['pipeline_stage_id','stage_change','Étape modifiée'],['status','status_change','Statut modifié']])if(changes[key]!==undefined&&changes[key]!==lead[key])addActivity(id,{activity_type,title,metadata:{from:lead[key]??null,to:changes[key]}});
    Object.assign(lead,changes,{updated_at:now()});return ok({lead});
   }
   const stages=seedLocalPipeline(db,clientId),duplicate=leads.find(l=>(changes.email&&l.email===changes.email)||(changes.phone&&l.phone===changes.phone));
   const added=row({client_id:clientId,status:'new',source:'manual',tags:[],...changes,pipeline_stage_id:changes.pipeline_stage_id||stages.find(s=>s.is_default)?.id||stages[0].id});db.tables.leads.push(added);addActivity(added.id,{activity_type:'note',title:'Lead créé manuellement'});
   return ok({lead:added,warning:duplicate?`Un lead similaire existe déjà : ${duplicate.full_name}`:null,local_only:true,email_sent:false},201);
  }
  return no('Méthode non autorisée',405);
 },options,method!=='GET'||match?.[1]==='pipeline-stages').then(result=>response(result.body,result.status));
}
