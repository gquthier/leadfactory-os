import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalClient,localTransaction} from '../src/lib/starter-local-store';
import {handleLocalApi} from '../src/lib/starter-local-api';

test('local CRM persists the previewed client workflow and rejects cross-client references',async t=>{
 const dataDir=await mkdtemp(join(tmpdir(),'lf-crm-'));t.after(()=>rm(dataDir,{recursive:true,force:true}));const options={dataDir};
 await localTransaction(db=>{db.tables.profiles.push({id:'alice',role:'client',is_active:true},{id:'bob',role:'client',is_active:true});db.tables.campaigns.push({id:'campaign-a',client_id:'alice'},{id:'campaign-b',client_id:'bob'});},options);
 const db=createLocalClient(options);
 const seeds=await Promise.all([db.rpc('seed_default_pipeline_stages',{p_client_id:'alice'}),db.rpc('seed_default_pipeline_stages',{p_client_id:'alice'})]);
 assert.ok(seeds.every(x=>x.error===null));
 const stages=await db.from('pipeline_stages').select('*').eq('client_id','alice');assert.equal(stages.data.length,7);
 await db.rpc('seed_default_pipeline_stages',{p_client_id:'bob'});
 const other=await db.from('pipeline_stages').select('*').eq('client_id','bob');
 async function request(path:string,method='GET',body?:unknown,client='alice'){
  const response=await handleLocalApi(new Request('http://127.0.0.1:14320'+path,{method,headers:{host:'127.0.0.1:14320',origin:'http://127.0.0.1:14320',...(client?{cookie:'lf_preview_client_id='+client}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),path,options);
  return {status:response.status,data:await response.json()};
 }
 assert.ok((await request('/api/client/leads','GET',undefined,'')).status>=400);
 assert.equal((await request('/api/client/leads','GET',undefined,'unknown')).status,403);
 assert.ok((await request('/api/client/leads','POST',{full_name:'Bad',campaign_id:'campaign-b'})).status>=400);
 const created=await request('/api/client/leads','POST',{full_name:'Camille Test',email:'fixture@example.invalid',campaign_id:'campaign-a',client_id:'bob'});
 assert.equal(created.status,201);const lead=created.data.lead;assert.equal(lead.client_id,'alice');assert.equal(lead.pipeline_stage_id,stages.data[0].id);
 assert.ok((await request('/api/client/leads/'+lead.id,'PATCH',{pipeline_stage_id:other.data[0].id})).status>=400);
 assert.ok((await request('/api/client/leads/'+lead.id,'PATCH',{notes:'forged'},'bob')).status>=400);
 const updated=await request('/api/client/leads/'+lead.id,'PATCH',{pipeline_stage_id:stages.data[1].id,status:'contacted',quality_score:4,notes:'Responsable : Camille',next_follow_up:'2026-10-16'});
 assert.equal(updated.status,200);
 assert.equal((await request('/api/client/leads/'+lead.id+'/activities','POST',{activity_type:'call',title:'Simulation',description:'Aucun appel réalisé'})).status,201);
 const detail=await request('/api/client/leads/'+lead.id);assert.equal(detail.data.lead.quality_score,4);assert.equal(detail.data.activities.length,4);
 assert.equal((await request('/api/client/leads','GET',undefined,'bob')).data.leads.length,0);
 assert.ok((await request('/api/client/leads/'+lead.id+'/activities','GET',undefined,'bob')).status>=400);
 assert.ok((await request('/api/client/pipeline-stages/'+stages.data[1].id,'DELETE')).status>=400);
 const stage=(await request('/api/client/pipeline-stages','POST',{name:'Rappel',color:'#1565D8',display_order:6})).data.stage;
 assert.equal(stage.client_id,'alice');assert.equal((await request('/api/client/pipeline-stages/'+stage.id,'PATCH',{name:'À rappeler'})).data.stage.name,'À rappeler');
 assert.ok((await request('/api/client/pipeline-stages/'+stage.id,'DELETE',undefined,'bob')).status>=400);
 assert.equal((await request('/api/client/pipeline-stages/'+stage.id,'DELETE')).status,200);
 assert.equal((await request('/api/client/preferences/notifications','PATCH',{notify_new_lead_email:false})).status,200);
 assert.equal((await request('/api/client/preferences/notifications')).data.notify_new_lead_email,false);
 assert.equal((await request('/api/client/leads/'+lead.id,'DELETE')).status,200);
 assert.equal((await db.from('lead_activities').select('*').eq('lead_id',lead.id)).data.length,0);
});
