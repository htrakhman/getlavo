import { MarketingNav } from '@/components/MarketingNav';

type ContentPageShellProps = {
  children: React.ReactNode;
  fadeHeight?: string;
  wide?: boolean;
};

export function ContentPageShell({
  children,
  fadeHeight = 'h-[400px]',
  wide = false,
}: ContentPageShellProps) {
  const widthClass = wide ? 'max-w-4xl' : 'max-w-3xl';
  return (
    <main className="relative">
      <div className={`absolute inset-x-0 top-0 ${fadeHeight} bg-gleam-fade`} />
      <MarketingNav />
      <div className={`relative mx-auto ${widthClass} px-6 pb-20 pt-10`}>{children}</div>
    </main>
  );
}
