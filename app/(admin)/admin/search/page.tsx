import { PageHeader } from '@/components/PortalShell';
import { supabaseServer } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminSearch({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const sb = supabaseServer();

  let users: any[] = [];
  let buildings: any[] = [];
  let operators: any[] = [];

  if (q.length >= 2) {
    const like = `%${q}%`;
    const [u, b, o] = await Promise.all([
      sb.from('profiles').select('id, full_name, email, role').or(`full_name.ilike.${like},email.ilike.${like}`).limit(20),
      sb.from('buildings').select('id, name, city, address_line1, status').or(`name.ilike.${like},city.ilike.${like},slug.ilike.${like},address_line1.ilike.${like}`).limit(20),
      sb.from('operators').select('id, name, status').ilike('name', like).limit(20),
    ]);
    users = u.data ?? [];
    buildings = b.data ?? [];
    operators = o.data ?? [];
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Search" />
      <form className="mb-8 max-w-md">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, email, building, operator…"
          autoFocus
          className="field"
        />
      </form>

      {q.length < 2 ? (
        <p className="text-sm text-ink-400">Type at least 2 characters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Section title="Users" empty="No matching users.">
            {users.map((u) => (
              <Link key={u.id} href={`/admin/users#${u.id}`} className="block py-2 text-sm hover:text-gleam">
                <div>{u.full_name}</div>
                <div className="text-xs text-ink-500">{u.email} · {u.role ?? '—'}</div>
              </Link>
            ))}
          </Section>
          <Section title="Buildings" empty="No matching buildings.">
            {buildings.map((b) => (
              <Link key={b.id} href={`/admin/buildings/${b.id}`} className="block py-2 text-sm hover:text-gleam">
                <div>{b.name}</div>
                <div className="text-xs text-ink-500">{b.address_line1 ? `${b.address_line1} · ` : ''}{b.city} · {b.status}</div>
              </Link>
            ))}
          </Section>
          <Section title="Operators" empty="No matching operators.">
            {operators.map((o) => (
              <Link key={o.id} href={`/admin/operators/${o.id}`} className="block py-2 text-sm hover:text-gleam">
                <div>{o.name}</div>
                <div className="text-xs text-ink-500">{o.status}</div>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = !!(Array.isArray(children) ? children.length : children);
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg mb-2">{title}</h3>
      {hasChildren ? <div className="divide-y divide-white/5">{children}</div> : <p className="text-sm text-ink-400">{empty}</p>}
    </div>
  );
}
