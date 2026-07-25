import { redirect } from 'next/navigation';

// Broadcast merged into Announcements (same audience, plus history and
// in-app notifications); keep old links working.
export default function BuildingBroadcastPage() {
  redirect('/building/announcements');
}
