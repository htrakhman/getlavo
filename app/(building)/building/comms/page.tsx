import { PageHeader } from '@/components/PortalShell';

export default function BuildingCommsPage() {
  return (
    <>
      <PageHeader eyebrow="Building" title="Resident comms kit" />
      <p className="text-sm text-ink-400 mb-6">
        Download starter assets for lobby posters, elevator screens, and resident email copy. Customize with your building name before printing.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Plain anchors: these are file downloads, not client-side routes — <Link>
            would prefetch the PDF endpoint and route it through the app router. */}
        <a href="/api/building/comms-kit?kind=poster" download className="card p-5 hover:border-gleam/40">
          <div className="font-display text-lg">Lobby poster PDF</div>
          <p className="mt-2 text-xs text-ink-500">8.5x11 starter layout</p>
        </a>
        <a href="/api/building/comms-kit?kind=email" download className="card p-5 hover:border-gleam/40">
          <div className="font-display text-lg">Email snippet PDF</div>
          <p className="mt-2 text-xs text-ink-500">Copy for property newsletters</p>
        </a>
      </div>
    </>
  );
}
