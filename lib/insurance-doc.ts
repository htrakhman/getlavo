import { supabaseAdmin } from '@/lib/supabase/admin';

const PUBLIC_MARKER = '/object/public/insurance-docs/';

// The insurance-docs bucket is private, but historical operator rows stored
// public URLs that 404. Accepts either form (public URL or bare storage
// path) and returns the object path inside the bucket, or null when the
// stored value points somewhere else entirely.
function storagePath(docUrl: string | null | undefined): string | null {
  if (!docUrl) return null;
  const i = docUrl.indexOf(PUBLIC_MARKER);
  if (i !== -1) return decodeURIComponent(docUrl.slice(i + PUBLIC_MARKER.length));
  if (!docUrl.startsWith('http')) return docUrl;
  return null;
}

// Returns a short lived signed URL for viewing, falling back to the stored
// value if signing fails.
export async function insuranceDocViewUrl(docUrl: string | null | undefined): Promise<string | null> {
  if (!docUrl) return null;
  const path = storagePath(docUrl);
  if (!path) return docUrl;
  try {
    const { data } = await supabaseAdmin().storage.from('insurance-docs').createSignedUrl(path, 3600);
    return data?.signedUrl ?? docUrl;
  } catch {
    return docUrl;
  }
}

/**
 * Downloads the certificate itself so it can ride along on an email as an
 * attachment — the admin reviewing it shouldn't have to click through to a
 * signed URL to read the form. Returns null when there is nothing to fetch.
 */
export async function insuranceDocFile(
  docUrl: string | null | undefined,
): Promise<{ bytes: Buffer; filename: string } | null> {
  const path = storagePath(docUrl);
  if (!path) return null;
  try {
    const { data, error } = await supabaseAdmin().storage.from('insurance-docs').download(path);
    if (error || !data) return null;
    const bytes = Buffer.from(await data.arrayBuffer());
    const filename = path.split('/').pop() || 'certificate-of-insurance';
    return { bytes, filename };
  } catch {
    return null;
  }
}
