import { PageHeader } from '@/components/PortalShell';
import { getSessionUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QRCodeShare } from './QRCodeShare';
import { getCurrentBuildingForSession } from '@/lib/building';

export default async function BuildingShare() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const { current: building } = await getCurrentBuildingForSession(session.user.id);
  if (!building) redirect('/building/onboarding');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const buildingUrl = `${appUrl}/b/${building.slug}`;

  return (
    <>
      <PageHeader
        eyebrow={building.name}
        title="Share with residents"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card p-8 text-center">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-4">Your building link</div>
          <QRCodeShare url={buildingUrl} buildingName={building.name} />
        </div>

        <div className="card p-6">
          <h3 className="font-display text-xl mb-2">How to share it</h3>
          <ol className="space-y-3 text-sm text-ink-300">
            <li className="flex gap-3">
              <span className="text-gleam font-bold">1.</span>
              <span>Print the QR code and post it in your lobby, elevator, or parking area.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gleam font-bold">2.</span>
              <span>Include the link in your resident newsletter or welcome packet.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-gleam font-bold">3.</span>
              <span>Residents scan, sign up, and book washes from their phones — no app download required.</span>
            </li>
          </ol>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-400">Next step</div>
              <div className="mt-1 font-display text-lg">Your operator</div>
              <p className="mt-1 text-sm text-ink-400">Lavo matches your building with an operator. Track their status here.</p>
            </div>
            <a href="/building/marketplace" className="btn-primary shrink-0">View →</a>
          </div>
        </div>
      </div>
    </>
  );
}
