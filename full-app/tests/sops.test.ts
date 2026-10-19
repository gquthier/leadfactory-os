import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadSops} from '../src/lib/starter-sops';

test('hosted SOPs work without downloaded media and expose only validated YouTube links', async t=>{
 const root=await mkdtemp(join(tmpdir(),'lf-hosted-sops-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const hosted=join(root,'hosted.json'),missing=join(root,'not-downloaded');
 const item={id:'01',title:'Partager un accès Meta',audience:'client',durationSeconds:306,youtubeVideoId:'Abc_123-xyz'};
 const save=async(items:unknown[])=>writeFile(hosted,JSON.stringify({version:1,items}));
 await save([item]);
 const [sop]=await loadSops(missing,hosted);
 assert.equal(sop.id,'library-01');assert.equal(sop.youtube_video_id,item.youtubeVideoId);
 assert.equal(sop.youtube_url,'https://www.youtube.com/watch?v=Abc_123-xyz');
 assert.equal(sop.video_url,undefined);
 for(const youtubeVideoId of ['javascript:alert(1)','https://evil.test/embed','../../token','short','Abc_123-xyz?autoplay=1']){
  await save([{...item,youtubeVideoId}]);await assert.rejects(loadSops(missing,hosted),/YouTube/);
 }
 await save([item,item]);await assert.rejects(loadSops(missing,hosted),/dupliqué/);
 await save([{...item,audience:'unknown'}]);await assert.rejects(loadSops(missing,hosted),/invalide/);
 await save([]);assert.deepEqual(await loadSops(missing,hosted),[]);
});

test('hosted links augment the matching local SOP without duplicates or losing downloads',async t=>{
 const root=await mkdtemp(join(tmpdir(),'lf-sops-merge-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const hosted=join(root,'hosted.json');
 const files={video:'video.mp4',captions:'captions.vtt',chapters:'chapters.vtt',guide:'FICHE.md'};
 for(const file of Object.values(files))await writeFile(join(root,file),'fixture');
 const item={id:'01',title:'Meta',audience:'client',durationSeconds:306};
 await writeFile(join(root,'catalog.json'),JSON.stringify({version:1,items:[{...item,files}]}));
 await writeFile(hosted,JSON.stringify({version:1,items:[{...item,youtubeVideoId:'Abc_123-xyz'}]}));
 const sops=await loadSops(root,hosted);assert.equal(sops.length,1);
 assert.equal(sops[0].video_url,'/sops/video.mp4');assert.equal(sops[0].guide_url,'/sops/FICHE.md');
 assert.equal(sops[0].youtube_url,'https://www.youtube.com/watch?v=Abc_123-xyz');
});

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
