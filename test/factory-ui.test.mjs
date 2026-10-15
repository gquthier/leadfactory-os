import test from 'node:test';import assert from 'node:assert/strict';import {PassThrough} from 'node:stream';
import {createTerminalUI,selectOption} from '../lib/factory-ui.mjs';
test('plain output has no escape sequences and reports real failures',async()=>{let result='';const out={isTTY:false,write:s=>{result+=s;}};const ui=createTerminalUI({output:out});ui.banner();await assert.rejects(ui.task('Préparer',async()=>{throw Error('offline');}),/offline/);assert.match(result,/LeadFactory/);assert.doesNotMatch(result,/\x1b/);assert.match(result,/Préparer/);});
test('keyboard picker supports arrows and restores raw mode after selection or cancellation',async()=>{
 const input=new PassThrough();input.isTTY=true;input.isRaw=false;input.setRawMode=v=>{input.isRaw=v;};let output='';const out={isTTY:true,columns:80,write:s=>output+=s};
 const choice=selectOption('Assistant',['Codex','Claude'],{input,output:out});input.emit('keypress','',{name:'down'});input.emit('keypress','',{name:'return'});assert.equal(await choice,1);assert.equal(input.isRaw,false);
 const controller=new AbortController();const aborted=selectOption('Assistant',['Codex'],{input,output:out,signal:controller.signal});controller.abort();await assert.rejects(aborted,{name:'AbortError'});assert.equal(input.isRaw,false);assert.equal(input.listenerCount('keypress'),0);assert.ok(output.endsWith('\x1b[?25h'));
});

test('branding stays aligned and accessible modes suppress terminal controls',()=>{
 let result='';const output={isTTY:true,columns:80,write:s=>{result+=s;}};
 createTerminalUI({output,env:{}}).banner();
 const lines=result.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').trimEnd().split('\n').filter(Boolean);
 assert.equal(new Set(lines.map(line=>Array.from(line).length)).size,1);
 result='';createTerminalUI({output,env:{NO_COLOR:''}}).banner();assert.doesNotMatch(result,/\x1b/);
 result='';createTerminalUI({output:{...output,columns:40},env:{}}).banner();assert.doesNotMatch(result,/\x1b/);
});
