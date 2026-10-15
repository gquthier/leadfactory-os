import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resourceDraft} from '../src/lib/team-resources/draft';
import {handleLocalApi} from '../src/lib/starter-local-api';
import {LOCAL_ADMIN_ID} from '../src/lib/starter-local-store';

test('a copied resource persists independently and starts unpublished without inherited assignments', async t => {
  const dataDir=await mkdtemp(join(tmpdir(),'lf-resource-copy-'));
  t.after(()=>rm(dataDir,{recursive:true,force:true}));
  async function api(method:string,body?:unknown,path='/api/admin/team-resources') {
    const response=await handleLocalApi(new Request('http://localhost:3000'+path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})}),path,{dataDir});
    assert.equal(response.status,200);return response.json();
  }
  const {resource:original}=await api('POST',{title:'Onboarding client',kind:'sop',body_text:'Vérifier le brief puis les accès.',document_url:'https://example.com/brief',is_published:true});
  await api('POST',{resource_id:original.id,member_ids:[LOCAL_ADMIN_ID]},'/api/admin/team-resources/assign');
  const source=(await api('GET')).resources[0];
  const draft=resourceDraft(source,true);
  assert.equal(draft.id,null);assert.equal(draft.title,'Onboarding client — Copie');
  assert.equal(draft.is_published,false);assert.deepEqual(draft.assignee_ids,[]);
  assert.equal(draft.body_html,source.body_html);assert.equal(draft.document_url,source.document_url);
  const {resource:copy}=await api('POST',{...draft,body_text:source.body_text});
  assert.notEqual(copy.id,source.id);
  await api('PATCH',{id:copy.id,title:'Brief adapté',body_text:'Consignes adaptées à ce client.'});
  const saved=(await api('GET')).resources;
  assert.equal(saved.length,2);
  assert.equal(saved.find((r:any)=>r.id===source.id).body_text,'Vérifier le brief puis les accès.');
  assert.equal(saved.find((r:any)=>r.id===copy.id).body_text,'Consignes adaptées à ce client.');
  assert.deepEqual(saved.find((r:any)=>r.id===source.id).assignee_ids,[LOCAL_ADMIN_ID]);
  assert.deepEqual(saved.find((r:any)=>r.id===copy.id).assignee_ids,[]);
  assert.equal((await api('GET',undefined,'/api/team/resources')).resources.length,1);
});

test('new and edit drafts preserve the existing resource editor contract without mutating assignments',()=>{
  const blank=resourceDraft();assert.equal(blank.kind,'sop');assert.equal(blank.id,null);assert.equal(blank.title,'');
  const source={id:'r1',kind:'resource' as const,title:'Guide',loom_url:null,document_url:null,body_html:null,is_published:true,assignee_ids:['member-1']};
  const edit=resourceDraft(source);assert.equal(edit.id,'r1');assert.equal(edit.is_published,true);
  assert.equal(edit.loom_url,'');assert.equal(edit.document_url,'');assert.equal(edit.body_html,'');
  edit.assignee_ids.push('member-2');assert.deepEqual(source.assignee_ids,['member-1']);
});
