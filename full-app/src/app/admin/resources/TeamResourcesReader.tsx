"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, BookOpen, Copy, Download, FileText, Loader2, Pencil, Play, Plus, X } from "lucide-react";
import type { TeamResource, TeamResourceKind } from "@/types/index";
import type {ResourceMember} from "@/components/team/ResourceEditor";
import {resourceDraft, type ResourceDraft} from "@/lib/team-resources/draft";
import {SopVideo} from "@/components/resources/SopVideo";

const ResourceEditor = dynamic(() => import("@/components/team/ResourceEditor").then(m => m.ResourceEditor), {loading: () => <p role="status">Chargement de l’éditeur…</p>});
const TeamResourcesPanel = dynamic(() => import("../team/TeamResourcesPanel").then(m => m.TeamResourcesPanel), {loading: () => <p role="status">Chargement des ressources…</p>});

type ResourceItem = TeamResource & Partial<{assignee_ids:string[];video_url:string;youtube_video_id:string;captions_url:string;chapters_url:string;guide_url:string;poster_url:string;audience:"client"|"agency";duration_seconds:number}>;
const isLibraryVideo=(resource:ResourceItem)=>Boolean(resource.video_url||resource.youtube_video_id);

function kindBadge(kind: TeamResourceKind) {
  return kind === "sop"
    ? { label: "SOP", cls: "bg-lf-blue text-white border-lf-blue" }
    : { label: "Ressource", cls: "bg-lf-pink text-black border-black" };
}

export function TeamResourcesReader({canManage = false, members = []}: {canManage?: boolean; members?: ResourceMember[]}) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<ResourceItem | null>(null);
  const [editing, setEditing] = useState<ResourceDraft | null>(null);
  const [managing, setManaging] = useState(false);
  const [reload, setReload] = useState(0);
  const [preferredId, setPreferredId] = useState<string | null>(null);

  const [audience,setAudience] = useState("all");
  useEffect(() => {
    let cancelled=false;
    setLoading(true);
    setErr(null);
    (async () => {
      const results = await Promise.allSettled([
        fetch(canManage ? "/api/admin/team-resources" : "/api/team/resources").then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Ressources indisponibles.");return data.resources??[];}),
        fetch("/api/starter/sops").then(async response=>{if(response.status===403||response.status===404)return [];const data=await response.json();if(!response.ok)throw new Error(data.error||"Bibliothèque SOP indisponible.");return data.resources??[];}),
      ]);
      if(cancelled)return;
      setResources(results.flatMap(result=>result.status==="fulfilled"?result.value:[]));
      const failures=results.filter(result=>result.status==="rejected");
      if(failures.length)setErr(failures.map(result=>result.status==="rejected"?String(result.reason.message):"").join(" "));
      setLoading(false);
    })();
    return ()=>{cancelled=true;};
  }, [canManage, reload]);

  // SOP d'abord, puis ressources écrites, en respectant order_index.
  const sorted = useMemo(() => {
    const rank = (k: TeamResourceKind) => (k === "sop" ? 0 : 1);
    return resources.filter(resource=>audience==="all"||(audience==="custom"?!isLibraryVideo(resource):resource.audience===audience)).sort(
      (a, b) => rank(a.kind) - rank(b.kind) || a.order_index - b.order_index,
    );
  }, [resources,audience]);

  // Sélectionne la première ressource par défaut (desktop).
  useEffect(() => {
    setActive(previous=>sorted.find(item=>item.id===preferredId)??sorted.find(item=>item.id===previous?.id)??sorted[0]??null);
  }, [sorted, preferredId]);

  const editResource = (resource: ResourceItem, copy = false) => setEditing(resourceDraft({...resource, assignee_ids: resource.assignee_ids ?? []}, copy));

  return (
    <div className="max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <div className="sticker-yellow -rotate-1 mb-3 inline-block">RESSOURCES</div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mes ressources &amp; SOP</h1>
        <p className="mt-1 max-w-2xl font-medium text-lf-gray">
          Tutoriels du logiciel, procédures à transmettre aux clients et ressources de votre équipe.
        </p>
        {canManage && <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={()=>setEditing(resourceDraft())}><Plus className="h-4 w-4"/> Nouvelle ressource</button>
          <button type="button" className="btn-secondary" onClick={()=>{setManaging(!managing);if(managing)setReload(n=>n+1);}}>{managing ? "Revenir à la bibliothèque" : "Gérer mes ressources"}</button>
        </div>}
      </div>

      {canManage && managing ? <TeamResourcesPanel key={reload} members={members}/> : <>
      <div className="flex flex-wrap gap-2" aria-label="Catégories de ressources">{[["all","Tout"],["agency","Logiciel"],["client","À transmettre aux clients"],["custom","Vos ressources"]].map(([id,label])=><button key={id} aria-pressed={audience===id} onClick={()=>setAudience(id)} className={audience===id?"btn-primary":"btn-secondary"}>{label} <span className="ml-1 text-xs">({resources.filter(item=>id==="all"||(id==="custom"?!isLibraryVideo(item):item.audience===id)).length})</span></button>)}</div>

      {err && (
        <div className="flex items-start gap-2 border-3 border-red-400 bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {err}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 border-3 border-black bg-white p-6 text-sm font-bold">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : sorted.length === 0 ? (
        <div className="border-3 border-dashed border-black bg-gray-50 p-8 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-40" />
          <p className="text-sm font-bold">Aucune ressource disponible dans cette catégorie pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          {/* ── Sidebar — liste des ressources (nom + catégorie) ─────────── */}
          <div className={`flex flex-col gap-2 ${active ? "lg:w-[340px] lg:min-w-[340px]" : "w-full"} transition-all`}>
            {sorted.map((r) => {
              const isActive = active?.id === r.id;
              const badge = kindBadge(r.kind);
              return (
                <button
                  key={r.id}
                  onClick={() => setActive(r)}
                  aria-pressed={isActive}
                  className={`card-brutal-sm w-full p-4 text-left transition-all ${
                    isActive ? "border-lf-blue bg-lf-blue/5 shadow-brutal-sm" : "hover:shadow-brutal-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isActive ? (
                        <Play className="h-5 w-5 text-lf-blue" />
                      ) : r.kind === "sop" ? (
                        <Play className="h-5 w-5 text-gray-300" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`inline-block border-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <p className={`mt-1 truncate text-sm font-bold ${isActive ? "text-lf-blue" : ""}`}>
                        {r.title}
                      </p>
                      {!r.is_published && <p className="mt-1 text-xs font-bold text-orange-700">Brouillon</p>}
                      {r.duration_seconds&&<p className="text-xs mt-1 text-lf-gray">{Math.floor(r.duration_seconds/60)} min {Math.round(r.duration_seconds%60).toString().padStart(2,"0")} · {r.audience==="client"?"Client":"Logiciel"}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Contenu — vidéo + texte en dessous ───────────────────────── */}
          {active && (
            <div className="min-w-0 flex-1">
              <div className="card-brutal overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b-3 border-black bg-lf-black px-5 py-3 text-white">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-wider text-white/60">
                      {kindBadge(active.kind).label}
                    </span>
                    <span className="truncate text-sm font-bold">{active.title}</span>
                  </div>
                  <button
                    onClick={() => setActive(null)}
                    className="flex-shrink-0 p-1 transition-colors hover:bg-white/10"
                    title="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {isLibraryVideo(active) && <SopVideo key={active.id} title={active.title} youtubeVideoId={active.youtube_video_id} videoUrl={active.video_url} captionsUrl={active.captions_url} chaptersUrl={active.chapters_url} posterUrl={active.poster_url}/>}
                {/* Player Loom */}
                {active.loom_url && (
                  <div className="relative w-full bg-black" style={{ paddingBottom: "62.5%" }}>
                    <iframe
                      src={active.loom_url}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      title={active.title}
                    />
                  </div>
                )}

                {/* Contenu sous la vidéo */}
                <div className="space-y-4 p-5">
                  {canManage && !isLibraryVideo(active) && <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary text-sm" onClick={()=>editResource(active)}><Pencil className="h-4 w-4"/> Modifier</button>
                    <button type="button" className="btn-secondary text-sm" onClick={()=>editResource(active,true)}><Copy className="h-4 w-4"/> Dupliquer</button>
                  </div>}
                  {isLibraryVideo(active)&&<>
                    <p className="text-sm font-medium">{active.audience==="client"?"Procédure en français, sans marque d’agence, à transmettre à vos clients.":"Tutoriel pas à pas pour utiliser votre logiciel."}</p>
                    {active.body_text&&<p className="text-sm">{active.body_text}</p>}
                    <div className="flex flex-wrap gap-2">
                      {active.video_url&&<a className="btn-primary text-sm" href={active.video_url} download><Download className="h-4 w-4"/> Télécharger la vidéo</a>}
                      {active.guide_url&&<a className="btn-secondary text-sm" href={active.guide_url} download>Fiche SOP</a>}
                      {active.captions_url&&<a className="btn-secondary text-sm" href={active.captions_url} download>Sous-titres</a>}
                      {active.chapters_url&&<a className="btn-secondary text-sm" href={active.chapters_url} download>Chapitres</a>}
                    </div>
                  </>}
                  {/* Lien document */}
                  {active.document_url && (
                    <a
                      href={active.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 border-3 border-black bg-lf-yellow px-4 py-3 text-sm font-black uppercase tracking-wider transition-all hover:shadow-brutal"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate">Ouvrir le document</span>
                    </a>
                  )}

                  {/* Texte riche */}
                  {active.body_html && active.body_html.trim() !== "" && (
                    <div
                      className="prose prose-sm max-w-none [&_a]:text-lf-blue [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-black [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-bold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: active.body_html }}
                    />
                  )}

                  {!isLibraryVideo(active) && !active.loom_url &&
                    !active.document_url &&
                    (!active.body_html || active.body_html.trim() === "") && (
                      <p className="text-sm font-medium text-lf-gray">
                        Cette ressource est vide pour le moment.
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state desktop */}
          {!active && (
            <div className="hidden flex-1 items-center justify-center lg:flex">
              <div className="text-center text-lf-gray">
                <Play className="mx-auto mb-4 h-16 w-16 opacity-20" />
                <p className="text-lg font-bold">Sélectionnez une ressource</p>
                <p className="mt-1 text-sm">Cliquez sur une ressource à gauche pour l&apos;afficher.</p>
              </div>
            </div>
          )}
        </div>
      )}
      </>}
      {canManage && editing && <ResourceEditor draft={editing} members={members} onClose={()=>setEditing(null)} onSaved={(id)=>{
        setEditing(null);setManaging(false);setAudience("custom");setPreferredId(id);setReload(n=>n+1);
      }}/>}
    </div>
  );
}
