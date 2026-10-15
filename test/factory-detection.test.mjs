import test from 'node:test';
import assert from 'node:assert/strict';
import {detectAgents,preferredAgent,configuredModel} from '../lib/factory-detection.mjs';

test('detects installed sessions without exposing auth output or running inference',async()=>{
 const calls=[];const run=async(command,args)=>{calls.push([command,args]);if(args[0]==='--version')return {code:0,stdout:command+' 1.2.3'};return command==='codex'?{code:0,stderr:'Logged in using API key: sk-secret-fixture'}:{code:0,stdout:JSON.stringify({loggedIn:true,email:'private@example.invalid',accessToken:'never-copy'})};};
 const agents=await detectAgents({run,model:async()=>null});assert.ok(agents.every(a=>a.installed&&a.authentication==='ready'));assert.doesNotMatch(JSON.stringify(agents),/sk-secret|private@|never-copy/);assert.equal(calls.length,4);assert.ok(calls.every(([,args])=>['--version','login','auth'].includes(args[0])));
});
test('prefers a connected agent and keeps explicit or saved choices',()=>{
 const agents=[{id:'codex',installed:true,authentication:'login_required'},{id:'claude',installed:true,authentication:'ready'}];assert.equal(preferredAgent(agents),'claude');assert.equal(preferredAgent(agents,'codex'),'codex');assert.equal(preferredAgent(agents,'manual'),'manual');assert.equal(preferredAgent([]),'manual');
});
test('missing binaries and unsupported authentication checks remain distinguishable',async()=>{
 const agents=await detectAgents({run:async(command,args)=>{if(command==='codex')return {code:null,error:'ENOENT'};if(args[0]==='--version')return {code:0,stdout:'Claude 2.0'};return {code:2,stdout:'unsupported'};},model:async()=>null});assert.equal(agents[0].installed,false);assert.equal(agents[1].authentication,'unknown');
});
test('reads model settings only, respecting environment and Codex profiles',async()=>{
 const read=async path=>path.endsWith('config.toml')?'model = "gpt-test"\nprofile = "work"\n[profiles.work]\nmodel = "gpt-profile"\n':'{"model":"opus","env":{"PRIVATE_TOKEN":"secret"}}';
 assert.equal(await configuredModel('codex',{read,env:{},userDirectory:'/fake'}),'gpt-profile');assert.equal(await configuredModel('claude',{read,env:{},userDirectory:'/fake'}),'opus');assert.equal(await configuredModel('claude',{read,env:{ANTHROPIC_MODEL:'sonnet'},userDirectory:'/fake'}),'sonnet');assert.equal(await configuredModel('codex',{read:async()=>{throw Error('invalid');},env:{},userDirectory:'/fake'}),null);
});
