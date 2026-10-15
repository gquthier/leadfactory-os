import {importLocalData} from '@/lib/starter-backup';
export const runtime = 'nodejs';
export async function POST(request: Request) {return importLocalData(request);}
