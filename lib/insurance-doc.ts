import { supabaseAdmin } from '@/lib/supabase/admin';

const PUBLIC_MARKER = '/object/public/insurance-docs/';

// The insurance-docs bucket is private, but historical operator rows stored
// public URLs that 404. Accepts either form (public URL or bare storage
// path) and returns a short lived signed URL for viewing, falling back to
// the stored value if signing fails.
export async function insuranceDocViewUrl(docUrl: string | null | undefined): Promise<string | null> {
  if (!docUrl) return null;
  let path: string | null = null;
  const i = docUrl.indexOf(PUBLIC_MARKER);
  if (i !== -1) path = decodeURIComponent(docUrl.slice(i + PUBLIC_MARKER.length));
  else if (!docUrl.startsWith('http')) path = docUrl;
  if (!path) return docUrl;
  try {
    const { data } = await supabaseAdmin().storage.from('insurance-docs').createSignedUrl(path, 3600);
    return data?.signedUrl ?? docUrl;
  } catch {
    return docUrl;
  }
}
