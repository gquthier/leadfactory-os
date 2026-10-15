import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadSops} from '../src/lib/starter-sops';

test('library only serves complete local SOP packages and portable links', async t=>{
 const root=await mkdtemp(join(tmpdir(),'lf-sops-'));t.after(()=>rm(root,{recursive:true,force:true}));
 assert.deepEqual(await loadSops(root),[]);
 await mkdir(join(root,'01'),{recursive:true});
 const files={video:'01/video.mp4',captions:'01/captions.vtt',chapters:'01/chapters.vtt',guide:'01/FICHE.md',poster:'01/preview.png',model:'01/modele.html'};
 for(const file of Object.values(files))await writeFile(join(root,file),'fixture');
 const item={id:'01',title:'Un tutoriel',audience:'client',durationSeconds:125,files};
 async function catalog(items:unknown[]){await writeFile(join(root,'catalog.json'),JSON.stringify({version:1,items}));}
 await catalog([item]);const [sop]=await loadSops(root);
 assert.equal(sop.video_url,'/sops/01/video.mp4');assert.equal(sop.audience,'client');assert.equal(sop.kind,'sop');
 assert.equal(sop.guide_url,'/sops/01/FICHE.md');assert.equal(sop.duration_seconds,125);
 assert.equal(sop.document_url,'/sops/01/modele.html');
 await catalog([{...item,files:{...files,model:'../private.html'}}]);await assert.rejects(loadSops(root),/Chemin/);
 await catalog([item]);
 await rm(join(root,files.video));assert.deepEqual(await loadSops(root),[]);
 await writeFile(join(root,files.video),'');assert.deepEqual(await loadSops(root),[]);
 await writeFile(join(root,files.video),'fixture');
 await catalog([{...item,files:{...files,video:'../private.mp4'}}]);await assert.rejects(loadSops(root),/Chemin/);
 await catalog([{...item,files:{...files,video:'https://example.com/video.mp4'}}]);await assert.rejects(loadSops(root),/Chemin/);
 await catalog([{...item,audience:'unknown'}]);await assert.rejects(loadSops(root),/invalide/);
 await catalog([item,item]);await assert.rejects(loadSops(root),/dupliqué/);
 await writeFile(join(root,'catalog.json'),'{');await assert.rejects(loadSops(root));
 await catalog([item]);await rm(join(root,files.video));
 const outside=await mkdtemp(join(tmpdir(),'lf-outside-'));t.after(()=>rm(outside,{recursive:true,force:true}));
 await writeFile(join(outside,'secret'),'private');await symlink(join(outside,'secret'),join(root,files.video));
 await assert.rejects(loadSops(root),/extérieur/);
});
