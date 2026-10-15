import type {TeamResource, TeamResourceWithAssignees} from '@/types/index';

export type ResourceDraft = {
  id: string | null;
  kind: TeamResource['kind'];
  title: string;
  loom_url: string;
  document_url: string;
  body_html: string;
  is_published: boolean;
  assignee_ids: string[];
};

type Source = Pick<TeamResourceWithAssignees, 'id' | 'kind' | 'title' | 'loom_url' | 'document_url' | 'body_html' | 'is_published' | 'assignee_ids'>;

export function resourceDraft(source?: Source, copy = false): ResourceDraft {
  return {
    id: source && !copy ? source.id : null,
    kind: source?.kind ?? 'sop',
    title: source ? source.title + (copy ? ' — Copie' : '') : '',
    loom_url: source?.loom_url ?? '',
    document_url: source?.document_url ?? '',
    body_html: source?.body_html ?? '',
    is_published: copy ? false : source?.is_published ?? true,
    assignee_ids: copy ? [] : [...(source?.assignee_ids ?? [])],
  };
}
