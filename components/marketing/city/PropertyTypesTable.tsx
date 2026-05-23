import type { PropertyTypeRow } from '@/lib/seo/cities/types';

type PropertyTypesTableProps = {
  title: string;
  rows: PropertyTypeRow[];
};

export function PropertyTypesTable({ title, rows }: PropertyTypesTableProps) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl text-ink-100">{title}</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-ink-200">
              <th scope="col" className="px-4 py-3 font-medium">
                Property type
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Why it works
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                What Lavo needs
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.propertyType} className="border-b border-white/5">
                <td className="px-4 py-3 font-medium text-ink-100">{row.propertyType}</td>
                <td className="px-4 py-3 text-ink-300">{row.whyItWorks}</td>
                <td className="px-4 py-3 text-ink-400">{row.whatLavoNeeds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
