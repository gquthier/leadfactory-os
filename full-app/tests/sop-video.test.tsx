import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SopVideo} from '../src/components/resources/SopVideo';

test('YouTube SOPs embed a validated video, offer a shareable link and preserve local playback',()=>{
 const html=renderToStaticMarkup(createElement(SopVideo,{title:'Accès Meta',youtubeVideoId:'Abc_123-xyz',videoUrl:'/sops/meta/video.mp4'}));
 assert.match(html,/https:\/\/www.youtube-nocookie.com\/embed\/Abc_123-xyz/);
 assert.match(html,/https:\/\/www.youtube.com\/watch\?v=Abc_123-xyz/);
 assert.match(html,/Copier le lien/);assert.match(html,/Lire le MP4 local/);
 assert.match(html,/strict-origin-when-cross-origin/);assert.doesNotMatch(html,/<video/);
});
test('local SOPs keep subtitles and never offer a localhost sharing link',()=>{
 const html=renderToStaticMarkup(createElement(SopVideo,{title:'CRM',videoUrl:'/sops/crm/video.mp4',captionsUrl:'/sops/crm/captions.vtt',chaptersUrl:'/sops/crm/chapters.vtt'}));
 assert.match(html,/<video/);assert.match(html,/kind="subtitles"/);assert.match(html,/kind="chapters"/);
 assert.doesNotMatch(html,/Copier le lien|iframe/);
});
test('the video component rejects malformed external ids even before API validation',()=>{
 const html=renderToStaticMarkup(createElement(SopVideo,{title:'Test',youtubeVideoId:'evil.test/?x=1'}));
 assert.doesNotMatch(html,/iframe|evil.test|Copier le lien/);
});
