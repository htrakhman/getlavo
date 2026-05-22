import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';

type ContentPageShellProps = {
  children: React.ReactNode;
  fadeHeight?: string;
};

export function ContentPageShell({ children, fadeHeight = 'h-[400px]' }: ContentPageShellProps) {
  return (
    <main className="relative">
      <div className={`absolute inset-x-0 top-0 ${fadeHeight} bg-gleam-fade`} />
      <MarketingNav />
      <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-10">{children}</div>
      <MarketingFooter />
    </main>
  );
}
