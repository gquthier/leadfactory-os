import {loadSops} from '@/lib/starter-sops';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{return Response.json({resources:await loadSops()});}
 catch{return Response.json({error:'La bibliothèque SOP est illisible. Vérifiez le catalogue et les fichiers.'},{status:500});}
}
