import { permanentRedirect } from 'next/navigation';

// The Learn more content now lives on /how-it-works — the two pages said the
// same thing, so they were merged into one.
export default function LearnMorePage() {
  permanentRedirect('/how-it-works');
}
