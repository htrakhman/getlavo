import type { ServiceRow } from '@/lib/seo/cities/types';

type ServicesTableProps = {
  title: string;
  rows: ServiceRow[];
};

export function ServicesTable({ title, rows }: ServicesTableProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-ink-200">
              <th scope="col" className="px-4 py-3 font-medium">
                Service
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Best for
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                What it usually includes
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.service} className="border-b border-white/5">
                <td className="px-4 py-3 font-medium text-ink-100">{row.service}</td>
                <td className="px-4 py-3 text-ink-300">{row.bestFor}</td>
                <td className="px-4 py-3 text-ink-400">{row.usuallyIncludes}</td>
                <td className="px-4 py-3 text-ink-400">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
