"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {AlertCircle, Copy, FileText, Loader2, Pencil, Plus, Trash2, Users, Video} from "lucide-react";
import type {TeamResourceKind, TeamResourceWithAssignees} from "@/types/index";
import {TeamResourceView} from "@/components/team/TeamResourceView";
import {ResourceEditor, type ResourceMember} from "@/components/team/ResourceEditor";
import {resourceDraft, type ResourceDraft} from "@/lib/team-resources/draft";

function kindBadge(kind: TeamResourceKind) {
  return kind === "sop"
    ? { label: "SOP", cls: "bg-lf-blue text-white border-lf-blue" }
    : { label: "Ressource", cls: "bg-lf-pink text-black border-black" };
}

/* -------------------------------------------------------------------------- */
/*  Panneau principal (liste)                                                 */
/* -------------------------------------------------------------------------- */

export function TeamResourcesPanel({ members }: { members: ResourceMember[] }) {
  const [resources, setResources] = useState<TeamResourceWithAssignees[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<ResourceDraft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(m.id, m.full_name);
    return map;
  }, [members]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch("/api/admin/team-resources");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Chargement impossible");
      }
      const { resources } = await res.json();
      setResources(resources ?? []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => setEditing(resourceDraft());
  const openEdit = (r: TeamResourceWithAssignees) => setEditing(resourceDraft(r));

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette ressource ?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/team-resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      window.alert("Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider">Ressources & SOP</h2>
          <p className="text-sm font-medium text-lf-gray">
            Centralisez vos SOP, documents et accès, et attribuez-les à vos membres.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 self-start border-3 border-black bg-lf-green px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:shadow-brutal"
        >
          <Plus className="h-4 w-4" /> Nouvelle ressource
        </button>
      </div>

      {loadErr && (
        <div className="flex items-start gap-2 border-3 border-red-400 bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {loadErr}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 border-3 border-black bg-white p-6 text-sm font-bold">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : resources.length === 0 ? (
        <div className="border-3 border-dashed border-black bg-gray-50 p-8 text-center">
          <Video className="mx-auto mb-2 h-6 w-6 opacity-40" />
          <p className="text-sm font-bold">Aucune ressource pour le moment.</p>
          <p className="text-xs font-medium text-lf-gray">Cliquez sur « Nouvelle ressource » pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => {
            const badge = kindBadge(r.kind);
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="border-3 border-black bg-white">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className={`border-2 px-2 py-1 text-[10px] font-black uppercase tracking-wider ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black uppercase">{r.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-lf-gray">
                        {r.loom_url && <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Loom</span>}
                        {r.document_url && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> Doc</span>}
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.assignee_ids.length} attribué·s</span>
                        {!r.is_published && <span className="border border-orange-400 bg-orange-50 px-1.5 text-orange-700">Brouillon</span>}
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="flex items-center gap-1.5 border-3 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-gray-100"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button type="button" onClick={() => setEditing(resourceDraft(r, true))} className="flex items-center gap-1.5 border-3 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-gray-100">
                      <Copy className="h-3.5 w-3.5" /> Dupliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="border-3 border-black bg-white p-1.5 hover:bg-red-50 disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-600" />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t-3 border-black bg-gray-50 p-4">
                    {r.assignee_ids.length > 0 && (
                      <p className="mb-3 text-xs font-medium text-lf-gray">
                        Attribuée à : {r.assignee_ids.map((id) => memberName.get(id) ?? "—").join(", ")}
                      </p>
                    )}
                    <TeamResourceView resource={r} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ResourceEditor
          draft={editing}
          members={members}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
