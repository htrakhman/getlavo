import { redirect } from 'next/navigation';

// The comms kit was retired; keep old links working.
export default function BuildingCommsPage() {
  redirect('/building');
}
