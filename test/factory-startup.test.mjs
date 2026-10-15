import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {startFactoryServices} from '../lib/factory-startup.mjs';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'lf-startup-'));t.after(()=>rm(root,{force:true,recursive:true}));return root;}
test('returns control to the CEO before the app is ready; media starts only after readiness',async t=>{
 const root=await fixture(t);let finish,stopped=0,media=0;const ready=new Promise(resolve=>finish=resolve);
 const job=await startFactoryServices(root,{port:14320,createApp:()=>({start:()=>ready,stop:async()=>{stopped++;}}),installMedia:async()=>{media++;}});
 assert.equal(job.state.app,'preparing');assert.equal(media,0);finish({url:'http://127.0.0.1:14320',owned:true});await job.done;assert.equal(job.state.app,'ready');assert.equal(job.state.sops,'ready');assert.equal(media,1);await job.stop();assert.equal(stopped,1);
});
test('media failure does not hide a working app and no rejection escapes in the background',async t=>{
 const root=await fixture(t);const job=await startFactoryServices(root,{createApp:()=>({start:async()=>({url:'http://127.0.0.1:14320'}),stop:async()=>{}}),installMedia:async()=>{throw Error('download failed');}});await job.done;const state=JSON.parse(await readFile(join(root,'.leadfactory/startup.json')));assert.equal(state.app,'ready');assert.equal(state.sops,'error');assert.match(state.message,/SOP/);await job.stop();
});
test('background cancellation propagates, waits for cleanup and never downloads after quitting',async t=>{
 const root=await fixture(t);let media=0;const job=await startFactoryServices(root,{createApp:(_,{signal})=>({start:()=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})),stop:async()=>{}}),installMedia:async()=>{media++;}});await job.stop();assert.equal(media,0);assert.equal(job.state.app,'stopped');
});

test('dashboard readiness does not wait for the video library',async t=>{
 const root=await fixture(t);let finish;const media=new Promise(resolve=>finish=resolve);
 const job=await startFactoryServices(root,{createApp:()=>({start:async()=>({url:'http://127.0.0.1:14320'}),stop:async()=>{}}),installMedia:()=>media});
 assert.equal(await job.ready,'http://127.0.0.1:14320');assert.equal(job.state.sops,'downloading');finish();await job.done;await job.stop();
});
test('setup never follows a log symlink outside its private workspace',async t=>{
 const root=await fixture(t),target=join(root,'outside');await writeFile(target,'preserve');await mkdir(join(root,'.leadfactory'));await symlink(target,join(root,'.leadfactory/setup.log'));
 await assert.rejects(startFactoryServices(root));assert.equal(await readFile(target,'utf8'),'preserve');
});
