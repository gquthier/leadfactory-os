"use client";

import {useMemo, useState} from "react";
import {useEditor, EditorContent, type Editor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {AlertCircle, Bold, Check, FileText, Italic, List, ListOrdered, Loader2, Pencil, Underline as UnderlineIcon, Users, Video, X} from "lucide-react";
import type {TeamResourceKind, TeamDashboardMember} from "@/types/index";
import type {ResourceDraft} from "@/lib/team-resources/draft";
import {toLoomEmbedUrl} from "@/lib/team-resources/loom";
export type ResourceMember = Pick<TeamDashboardMember, "id" | "full_name" | "email">;

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const btn = (active: boolean) =>
    `p-1.5 border-2 border-black transition-all ${active ? "bg-lf-black text-white" : "bg-white hover:bg-gray-100"}`;

  return (
    <div className="flex flex-wrap gap-1 border-b-3 border-black bg-gray-50 px-3 py-2">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Gras">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italique">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Souligné">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </button>
      <div className="mx-1 w-px bg-black" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Liste à puces">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Liste numérotée">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slide-over éditeur                                                        */
/* -------------------------------------------------------------------------- */

export function ResourceEditor({
  draft,
  members,
  onClose,
  onSaved,
}: {
  draft: ResourceDraft;
  members: ResourceMember[];
  onClose: () => void;
  onSaved: (resourceId: string) => void;
}) {
  const [form, setForm] = useState<ResourceDraft>(draft);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setField = <K extends keyof ResourceDraft>(key: K, value: ResourceDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Texte libre : consignes, étapes, liens utiles…",
      }),
    ],
    content: form.body_html || "",
    onUpdate: ({ editor: e }) => setField("body_html", e.getHTML()),
    editorProps: {
      attributes: {
        role: "textbox", "aria-label": "Texte libre", "aria-multiline": "true",
        class:
          "prose prose-sm max-w-none p-4 min-h-[160px] focus:outline-none [&_a]:text-lf-blue [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_li]:my-0.5",
      },
    },
  });

  const loomEmbed = useMemo(() => toLoomEmbedUrl(form.loom_url), [form.loom_url]);
  const loomInvalid = form.loom_url.trim() !== "" && !loomEmbed;

  const toggleMember = (id: string) =>
    setField(
      "assignee_ids",
      form.assignee_ids.includes(id)
        ? form.assignee_ids.filter((m) => m !== id)
        : [...form.assignee_ids, id],
    );

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErr("Le titre est requis.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      // 1) Créer ou mettre à jour la ressource.
      const payload = {
        id: form.id ?? undefined,
        kind: form.kind,
        title: form.title.trim(),
        loom_url: form.loom_url.trim() || null,
        document_url: form.document_url.trim() || null,
        body_html: form.body_html,
        body_text: editor?.getText() ?? null,
        is_published: form.is_published,
      };
      const res = await fetch("/api/admin/team-resources", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Échec de l'enregistrement");
      }
      const { resource } = await res.json();
      const resourceId = resource.id as string;
      setField("id", resourceId);

      // 2) Synchroniser les attributions.
      const aRes = await fetch("/api/admin/team-resources/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_id: resourceId, member_ids: form.assignee_ids }),
      });
      if (!aRes.ok) {
        const j = await aRes.json().catch(() => ({}));
        throw new Error(j.error || "Ressource enregistrée mais attribution échouée");
      }

      onSaved(resourceId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border-3 border-black bg-white focus:outline-none focus:border-lf-blue transition-colors";
  const labelCls = "text-[11px] font-black uppercase tracking-wider text-lf-gray mb-1 block";

  return (
    <div role="dialog" aria-modal="true" aria-label={form.id ? "Modifier la ressource" : "Nouvelle ressource"} className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l-3 border-black bg-canvas shadow-brutal">
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-black bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {form.id ? "Modifier la ressource" : "Nouvelle ressource"}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer l’éditeur" className="border-2 border-black bg-white p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Type + Titre */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <label htmlFor="resource-kind" className={labelCls}>Type</label>
              <select id="resource-kind"
                value={form.kind}
                onChange={(e) => setField("kind", e.target.value as TeamResourceKind)}
                className={inputCls}
              >
                <option value="sop">SOP</option>
                <option value="resource">Ressource</option>
              </select>
            </div>
            <div>
              <label htmlFor="resource-title" className={labelCls}>Titre</label>
              <input id="resource-title" autoFocus
                className={inputCls}
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Ex : SOP — Onboarding d'un nouveau client"
              />
            </div>
          </div>

          {/* Bloc 1 — Loom */}
          <div>
            <label htmlFor="resource-loom" className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Video className="h-3 w-3" /> Lien Loom (embed)
              </span>
            </label>
            <input id="resource-loom"
              className={inputCls}
              value={form.loom_url}
              onChange={(e) => setField("loom_url", e.target.value)}
              placeholder="https://www.loom.com"
            />
            {loomInvalid && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertCircle className="h-3 w-3" /> Lien Loom non reconnu.
              </p>
            )}
            {loomEmbed && (
              <div className="mt-3 border-3 border-black bg-black">
                <div className="relative w-full" style={{ paddingBottom: "62.5%" }}>
                  <iframe
                    src={loomEmbed}
                    title="Aperçu Loom"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                    frameBorder={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bloc 2 — Document */}
          <div>
            <label htmlFor="resource-document" className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Lien vers un document
              </span>
            </label>
            <input id="resource-document"
              className={inputCls}
              value={form.document_url}
              onChange={(e) => setField("document_url", e.target.value)}
              placeholder="https://drive.google.com"
            />
          </div>

          {/* Bloc 3 — Texte riche */}
          <div>
            <label className={labelCls}>Texte libre</label>
            <div className="border-3 border-black bg-white">
              <EditorToolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Attribution */}
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> Attribuer à ({form.assignee_ids.length})
              </span>
            </label>
            <div className="max-h-56 overflow-y-auto border-3 border-black bg-white">
              {members.length === 0 ? (
                <div className="p-4 text-sm font-medium text-lf-gray">Aucun membre d'équipe.</div>
              ) : (
                members.map((m) => {
                  const checked = form.assignee_ids.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex cursor-pointer items-center gap-3 border-b-2 border-black px-4 py-2.5 last:border-b-0 ${
                        checked ? "bg-lf-yellow/20" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} className="checkbox-brutal" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">{m.full_name}</span>
                        <span className="block text-xs font-medium text-lf-gray">{m.email}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Publication */}
          <label className="flex cursor-pointer items-center gap-3 border-3 border-black bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setField("is_published", e.target.checked)}
              className="checkbox-brutal"
            />
            <span className="text-sm font-bold">
              Publiée (visible par les membres attribués)
            </span>
          </label>

          {err && (
            <div className="flex items-start gap-2 border-3 border-red-400 bg-red-50 p-3 text-sm font-bold text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {err}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t-3 border-black bg-gray-50 px-5 py-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-black uppercase tracking-wider border-3 border-black bg-white hover:bg-gray-100">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 border-3 border-black bg-lf-green px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:shadow-brutal disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
