import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { insuranceDocViewUrl } from '@/lib/insurance-doc';
import { InsuranceUploader } from '../profile/InsuranceUploader';

export default async function OperatorCompliancePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const { data: op } = await sb
    .from('operators')
    .select('id, insurance_carrier, insurance_policy_number, insurance_coverage_amount_cents, insurance_expires_at, insurance_doc_url, insurance_uploaded_at, insurance_review_status, insurance_review_note')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!op) redirect('/operator/onboarding');

  const docViewUrl = await insuranceDocViewUrl(op.insurance_doc_url);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl">Insurance &amp; compliance</h1>
        <p className="mt-2 text-sm text-ink-400">
          Upload your current certificate of insurance (COI). Your policy must carry active general
          liability insurance — additional insured wording must name partnered buildings.
        </p>
      </div>
      <div className="card p-6">
        <InsuranceUploader op={op} docViewUrl={docViewUrl} />
      </div>
    </main>
  );
}
