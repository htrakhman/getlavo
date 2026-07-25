import { redirect } from 'next/navigation';

// Garage layout now lives on the Settings page; keep old links working.
export default function GarageLayoutPage() {
  redirect('/building/settings');
}
