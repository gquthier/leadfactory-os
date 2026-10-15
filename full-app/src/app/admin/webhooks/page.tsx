import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient, createAdminClient} from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminWebhooksPage() {
  const supabase = createClient();
  const {data: {session}} = await supabase.auth.getSession();
  if (!session) redirect('/login');
  const admin = createAdminClient();
  const {data: me} = await admin.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (me?.role !== 'admin') redirect('/client/overview');

  return (
    <div className="max-w-5xl space-y-6 p-6 lg:p-8">
      <div>
        <div className="sticker-yellow mb-3 inline-block -rotate-1">CONNEXIONS</div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Webhooks</h1>
        <p className="mt-2 max-w-3xl font-medium text-lf-gray">
          Les webhooks permettent d’envoyer automatiquement les nouveaux leads d’un formulaire ou d’une campagne vers le CRM et les outils de votre équipe.
        </p>
      </div>
      <div className="card-brutal space-y-4 p-6">
        <h2 className="text-lg font-black uppercase">Comment ça fonctionne</h2>
        <ol className="list-decimal space-y-3 pl-5 font-medium">
          <li>Un prospect remplit un formulaire : ses coordonnées et les informations utiles sont collectées.</li>
          <li>La connexion envoie ces données vers la destination choisie, avec le bon client et la bonne campagne.</li>
          <li>Votre équipe retrouve le lead dans son outil de suivi et peut le contacter.</li>
        </ol>
        <p className="text-sm text-lf-gray">La connexion doit être configurée, puis vérifiée avec un lead de test avant son utilisation. Aucun service d’automatisation particulier n’est imposé.</p>
      </div>
      <div className="card-brutal space-y-3 p-6">
        <h2 className="text-lg font-black uppercase">Préparer la connexion avec votre agent</h2>
        <p className="font-medium">Indiquez à votre agent la source des leads, le client concerné et l’outil de destination. Il pourra préparer les accès nécessaires et vous guider pour vérifier la réception.</p>
        <Link href="/admin/start-here" className="btn-primary inline-flex">Configurer mes connexions</Link>
      </div>
    </div>
  );
}
