import { permanentRedirect } from 'next/navigation';

export default function LegacyBuildingSlug({ params }: { params: { slug: string } }) {
  permanentRedirect(`/building/${params.slug}`);
}
