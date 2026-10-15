import {createHash} from 'node:crypto';
import {realpath} from 'node:fs/promises';
import {join, resolve} from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lets the local CLI distinguish this checkout from another server on the port. */
export async function GET() {
  const root = await realpath(process.cwd());
  const data = resolve(process.env.LEADFACTORY_STARTER_DATA_DIR || join(root, '.local-data'));
  const workspaceId = createHash('sha256').update(`${root}\0${data}`).digest('hex').slice(0, 24);
  return Response.json({app: 'leadfactory', mode: process.env.LEADFACTORY_DATA_MODE === 'supabase' ? 'supabase' : 'local', workspaceId},
    {headers: {'Cache-Control': 'no-store'}});
}
