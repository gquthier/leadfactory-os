import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deploymentCheck,deploymentPrompt} from '../lib/factory-deploy.mjs';

test('sharing audit detects installed tools and configuration presence without reading or leaking credentials',async t=>{
 const root=await mkdtemp(join(tmpdir(),'lf-deploy-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'full-app'),{recursive:true});await mkdir(join(root,'supabase'),{recursive:true});
 await writeFile(join(root,'supabase/config.toml'),'private-unread-fixture');
 await writeFile(join(root,'full-app/.env.local'),'PRIVATE_VALUE=not-to-print');
 const calls=[];const run=async(command,args)=>{calls.push([command,args]);return {ok:true,stdout:args.includes('--version')?'fixture-version':JSON.stringify([{secret:'DO_NOT_RETURN'}])};};
 const report=await deploymentCheck(root,{run,env:{SUPABASE_ACCESS_TOKEN:'PRIVATE',RAILWAY_TOKEN:'PRIVATE'}});
 assert.equal(report.supabase.installed,true);assert.equal(report.supabase.account,'not_checked');assert.equal(report.supabase.projectConfig,true);assert.equal(report.railway.tokenPresent,true);
 assert.equal(report.publicReady,false);assert.equal(report.environmentFilePresent,true);
 assert.ok(!JSON.stringify(report).includes('PRIVATE'));assert.ok(!JSON.stringify(report).includes('DO_NOT_RETURN'));
 assert.ok(calls.every(([,args])=>args.join(' ')==='--version'));
 const verified=await deploymentCheck(root,{run,env:{},verify:true});
 assert.equal(verified.supabase.account,'verified');assert.equal(verified.railway.account,'verified');assert.equal(verified.podman.engine,'verified');
 assert.ok(!JSON.stringify(verified).includes('DO_NOT_RETURN'));
 const missing=await deploymentCheck(root,{run:async()=>({ok:false,stdout:'secret failure'}),env:{},verify:true});
 assert.equal(missing.supabase.installed,false);assert.equal(missing.podman.engine,'not_installed');assert.ok(!JSON.stringify(missing).includes('secret failure'));
 const failed=await deploymentCheck(root,{run:async(_,args)=>({ok:args.includes('--version'),stdout:'v1'}),env:{},verify:true});
 assert.equal(failed.supabase.account,'unavailable');
});

test('deployment handoff distinguishes hosting, database and local container with evidence gates',()=>{
 for(const target of ['railway','supabase','podman']) {
  const prompt=deploymentPrompt(target,{publicReady:false});assert.match(prompt,/docs\/DEPLOYMENT.md/);assert.match(prompt,new RegExp(target,'i'));assert.match(prompt,/127.0.0.1/);assert.match(prompt,/RLS/);
 }
 assert.throws(()=>deploymentPrompt('other',{}),/Destination/);
});
