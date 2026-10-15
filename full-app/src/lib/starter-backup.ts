import {isLocalHost, isLocalOrigin} from './starter-origin';
import {LOCAL_ADMIN_ID, LOCAL_TABLES, localTransaction, rejectSecrets} from './starter-local-store';
import type {LocalDatabase, StoreOptions} from './starter-local-store';

const MAX_BYTES = 25_000_000;
const FORMAT = 'leadfactory-local-data';
class BackupError extends Error {
  constructor(message: string, readonly status = 400) {super(message);}
}
function guard(request: Request, method: string) {
  const url = new URL(request.url), host = request.headers.get('host') || url.host;
  if (process.env.LEADFACTORY_DATA_MODE === 'supabase' || !isLocalHost(url.host) ||
      !isLocalOrigin(host, request.headers.get('origin')) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new BackupError('Sauvegarde réservée à votre installation locale.', 403);
  }
  if (request.method !== method) throw new BackupError('Méthode non autorisée.', 405);
}
function failure(error: unknown) {
  return Response.json({error: error instanceof BackupError ? error.message : 'Sauvegarde invalide ou données locales illisibles.'}, {
    status: error instanceof BackupError ? error.status : 400, headers: {'Cache-Control': 'no-store'},
  });
}
async function readLimited(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new BackupError('Fichier limité à 25 Mo.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BackupError('Choisir une sauvegarde JSON.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {await reader.cancel(); throw new BackupError('Fichier limité à 25 Mo.', 413);}
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
function validate(snapshot: any): LocalDatabase {
  if (!object(snapshot) || snapshot.format !== FORMAT || snapshot.version !== 1 || !object(snapshot.database)) {
    throw new BackupError('Ce fichier n’est pas une sauvegarde des données de cette application.');
  }
  rejectSecrets(snapshot);
  const db = snapshot.database;
  if (db.version !== 1 || !object(db.tables) || Object.keys(db.tables).length !== LOCAL_TABLES.length) throw new BackupError('Tables de sauvegarde invalides.');
  for (const name of LOCAL_TABLES) {
    const rows = db.tables[name];
    if (!Array.isArray(rows)) throw new BackupError('Une table est absente ou invalide.');
    const ids = new Set<string>();
    for (const row of rows) {
      if (!object(row) || typeof row.id !== 'string' || !row.id.trim() || row.id.length > 200 || ids.has(row.id)) {
        throw new BackupError('Une ligne possède un identifiant absent ou dupliqué.');
      }
      ids.add(row.id);
    }
  }
  const admin = db.tables.profiles.find((row: any) => row.id === LOCAL_ADMIN_ID);
  if (!admin || admin.role !== 'admin' || admin.is_super_admin !== true || admin.is_active !== true) throw new BackupError('Administrateur local invalide.');
  // The local resource editor only stores escaped plain text. Import cannot bypass that boundary.
  for (const row of db.tables.team_resources) {
    const content = typeof row.body_text === 'string' ? row.body_text : '';
    const safeHtml = content ? `<p>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>')}</p>` : null;
    if (row.body_html != null && row.body_html !== safeHtml) throw new BackupError('Le contenu de cette ressource doit être exporté depuis l’éditeur local.');
    for (const key of ['document_url', 'loom_url']) {
      if (!row[key]) continue;
      const url = new URL(row[key]);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new BackupError('Lien de ressource invalide.');
      if (key === 'loom_url' && (!['loom.com', 'www.loom.com'].includes(url.hostname) || !/^\/embed\/[a-f0-9]{20,}$/i.test(url.pathname))) throw new BackupError('Lien Loom invalide.');
    }
  }
  if (Buffer.byteLength(JSON.stringify(db, null, 2)) > MAX_BYTES) throw new BackupError('Données limitées à 25 Mo.', 413);
  return db as LocalDatabase;
}

/** Only db.json: connection tokens and agent history never enter this export. */
export async function exportLocalData(request: Request, options: StoreOptions = {}) {
  try {
    guard(request, 'GET');
    const database = await localTransaction(db => db, options, false);
    const snapshot = {format: FORMAT, version: 1, exportedAt: new Date().toISOString(), database};
    return new Response(JSON.stringify(snapshot), {headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="leadfactory-data-${new Date().toISOString().slice(0, 10)}.json"`,
    }});
  } catch (error) {return failure(error);}
}

/** Serialized with other writes; restore is allowed only before the first business row exists. */
export async function importLocalData(request: Request, options: StoreOptions = {}) {
  try {
    guard(request, 'POST');
    const incoming = validate(await readLimited(request));
    const counts = await localTransaction(db => {
      const populated = LOCAL_TABLES.some(name => db.tables[name].some(row => name !== 'profiles' || row.id !== LOCAL_ADMIN_ID));
      if (populated) throw new BackupError('Cette installation contient déjà des données. Utiliser une installation vide pour restaurer.', 409);
      db.tables = incoming.tables;
      return {clients: db.tables.profiles.filter(row => row.role === 'client').length, campaigns: db.tables.campaigns.length, tasks: db.tables.client_tasks.length};
    }, options);
    return Response.json({ok: true, counts}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {return failure(error);}
}
