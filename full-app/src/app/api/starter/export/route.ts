import {exportLocalData} from '@/lib/starter-backup';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {return exportLocalData(request);}
