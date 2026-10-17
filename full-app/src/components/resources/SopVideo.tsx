"use client";

import React, {useState} from 'react';
import {Copy, ExternalLink} from 'lucide-react';

type Props={title:string;youtubeVideoId?:string;videoUrl?:string;posterUrl?:string;captionsUrl?:string;chaptersUrl?:string};

export function SopVideo({title,youtubeVideoId,videoUrl,posterUrl,captionsUrl,chaptersUrl}:Props) {
 const [local,setLocal]=useState(false);
 const [copyStatus,setCopyStatus]=useState('');
 const id=youtubeVideoId&&/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)?youtubeVideoId:null;
 const shareUrl=id?`https://www.youtube.com/watch?v=${id}`:null;
 async function copyLink(){
  if(!shareUrl)return;
  try{await navigator.clipboard.writeText(shareUrl);setCopyStatus('Lien copié.');}
  catch{setCopyStatus('Copie indisponible : ouvrez la vidéo sur YouTube pour copier son adresse.');}
 }
 return <>
  {id&&!local ? <iframe
   src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
   title={title}
   className="aspect-video w-full border-0 bg-white"
   loading="lazy"
   referrerPolicy="strict-origin-when-cross-origin"
   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
   allowFullScreen
  /> : videoUrl ? <video controls playsInline preload="metadata" poster={posterUrl} className="w-full bg-white" aria-label={title}>
   <source src={videoUrl} type="video/mp4"/>
   {captionsUrl&&<track kind="subtitles" src={captionsUrl} srcLang="fr" label="Français"/>}
   {chaptersUrl&&<track kind="chapters" src={chaptersUrl} srcLang="fr" label="Chapitres" default/>}
   Votre navigateur ne prend pas en charge la vidéo. Téléchargez le MP4 ci-dessous.
  </video> : null}
  {shareUrl&&<div className="space-y-2 border-b-3 border-black p-4">
   <div className="flex flex-wrap gap-2">
    <button type="button" className="btn-primary text-sm" onClick={copyLink}><Copy className="h-4 w-4"/> Copier le lien</button>
    <a className="btn-secondary text-sm" href={shareUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4"/> Ouvrir sur YouTube</a>
    {videoUrl&&<button type="button" className="btn-secondary text-sm" onClick={()=>setLocal(!local)}>{local?'Lire sur YouTube':'Lire le MP4 local'}</button>}
   </div>
   <p className="text-xs font-medium text-lf-gray">Ce lien peut être envoyé à votre équipe ou à vos clients.</p>
   <p className="text-sm" role="status">{copyStatus}</p>
  </div>}
 </>;
}
