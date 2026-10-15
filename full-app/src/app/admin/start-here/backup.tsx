"use client";

import {useState} from 'react';

export function AgencyBackup() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !confirmed || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (file.size > 25_000_000) throw new Error('Fichier limité à 25 Mo.');
      const response = await fetch('/api/starter/import', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: file});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Restauration impossible.');
      setNotice(`Données restaurées : ${result.counts.clients} client(s), ${result.counts.campaigns} campagne(s), ${result.counts.tasks} tâche(s). Vous pouvez ouvrir le Dashboard.`);
      setConfirmed(false);
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Restauration impossible.');}
    finally {setBusy(false);}
  }

  return <section className="card-brutal p-6" aria-labelledby="backup-title">
    <h2 id="backup-title" className="text-xl font-black uppercase">Sauvegarde des données de l’agence</h2>
    <p className="my-3">Téléchargez vos clients, campagnes, briefs, tâches, ressources et livrables dans un fichier JSON. Conservez-le dans un emplacement privé.</p>
    <p className="text-sm mb-4">Les connexions, tokens et l’historique des agents ne sont pas inclus. La restauration fonctionne uniquement dans une installation vide ; elle n’écrase aucune donnée existante.</p>
    <a href="/api/starter/export" className="btn-secondary">Télécharger mes données</a>
    <form onSubmit={restore} className="mt-6 space-y-4">
      <label className="block font-bold">Sauvegarde JSON à restaurer
        <input type="file" accept=".json,application/json" className="block mt-2 max-w-full" disabled={busy} onChange={event => {setFile(event.target.files?.[0] || null); setConfirmed(false); setError(''); setNotice('');}} />
      </label>
      <label className="flex gap-3 items-start"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Je souhaite restaurer ce fichier dans cette installation vide.</label>
      <button type="submit" className="btn-primary" disabled={busy || !file || !confirmed}>{busy ? 'Restauration…' : 'Restaurer mes données'}</button>
    </form>
    {error && <p role="alert" className="mt-4 text-red-700 font-bold">{error}</p>}
    {notice && <p role="status" className="mt-4 border-3 border-black bg-lf-yellow p-4">{notice}</p>}
  </section>;
}
