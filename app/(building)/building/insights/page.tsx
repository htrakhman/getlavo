import { redirect } from 'next/navigation';

// Insights merged into the Overview dashboard; keep old links working.
export default function InsightsPage() {
  redirect('/building');
}
