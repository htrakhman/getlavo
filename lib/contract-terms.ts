/**
 * The agreement's legal prose, in one place.
 *
 * These clauses are rendered in four files — the signed PDF, the manager's
 * view, the operator's view, and the operator's pre-send preview — and they
 * drifted apart badly enough that the two parties were once looking at
 * different terms. Holding the wording here makes that structurally
 * impossible: there is one string, and every rendering prints it.
 *
 * NOT LEGAL ADVICE. This was written to close specific, identifiable gaps and
 * to say plainly what the platform actually does. A lawyer admitted in the
 * governing state should review it before it is used at volume, particularly
 * the indemnity, the liability cap, and the insurance clause.
 *
 * A standing rule for this file: it must not state as fact anything the
 * platform does not actually check. Both defects found so far were of that
 * shape — marketing claimed background checks that never ran, and this
 * agreement specified insurance coverage nobody read off the certificate.
 */

/**
 * Insurance.
 *
 * This clause used to require garagekeepers legal liability at $100,000 per
 * vehicle, plus additional-insured status on a primary and non-contributory
 * basis with waiver of subrogation. That is the right coverage on the merits —
 * a standard CGL policy carries a care, custody and control exclusion and so
 * generally does not answer a claim for a car damaged while being washed. It
 * was also a promise the platform never checked. Onboarding requires one thing:
 * that a certificate file exists. Nothing reads its coverage type, its limits,
 * or whether anyone is named on it.
 *
 * A contract that tells a commercial landlord their vendor carries specific
 * coverage, on the strength of a PDF nobody opened, is the same defect as
 * advertising background checks that never ran: a statement of fact made to
 * someone who relies on it, that the maker has no basis for. The gap is the
 * problem, not the direction — so the clause is written down to what is
 * actually verified.
 *
 * What remains is an obligation on Service Provider to carry and maintain
 * insurance appropriate to the Services, and to produce a certificate. What is
 * removed is Lavo asserting the specifics. Property Manager is told plainly
 * that it may set its own requirements and should check the certificate
 * against them — which is what a commercial landlord's vendor onboarding does
 * anyway, and it puts that requirement between the two parties who can
 * actually verify it rather than in a promise Lavo cannot keep.
 *
 * Garagekeepers cover is named as a recommendation, not a condition, so the
 * operator learns the coverage exists and why it matters without the agreement
 * warranting that they bought it.
 *
 * IF VERIFICATION IS BUILT: if the platform ever reads coverage type, limits
 * and additional-insured status off the certificate, this clause can require
 * those specifics again — deliberately, and only to the extent checked.
 */
export const INSURANCE_CLAUSE_BASE =
  'Service Provider shall obtain and maintain, throughout the term of this Agreement, general liability insurance and any commercial auto liability and workers’ compensation coverage required by law, in each case appropriate to the Services and in amounts no less than those required by applicable law or by Property Manager. Because a standard commercial general liability policy generally excludes loss of or damage to property in the insured’s care, custody or control, Service Provider is strongly encouraged to carry garagekeepers legal liability or equivalent cover for the vehicles it services. Service Provider shall provide Property Manager, on request, with a certificate of insurance and shall notify Property Manager promptly if its coverage lapses. Property Manager may set its own insurance requirements for vendors operating at the Property, including minimum limits and additional-insured status, and is responsible for reviewing any certificate against those requirements before granting access. Lavo collects certificates from operators as a convenience and does not verify, endorse or warrant the existence, scope, adequacy or continuation of any coverage.';

export const RESPONSIBILITY_CLAUSE =
  'Service Provider performs the Services as an independent contractor. It is not an employee, agent, partner or joint venturer of Lavo or of Property Manager, and it alone directs and controls the manner in which the Services are performed, including the selection, supervision and payment of its personnel and any subcontractors. Service Provider is solely responsible for the Services and for any loss of or damage to a vehicle, to property in or on a vehicle, or to the Property, and for any personal injury, arising out of or relating to the Services, whether caused by Service Provider, its personnel or its subcontractors.';

export const OPERATOR_CAP_CLAUSE =
  'As between Service Provider and Property Manager only, Service Provider’s liability for a commercial dispute under this Agreement is limited to the retail value of the service rendered. That limit does not apply to, and does not reduce, Service Provider’s responsibility for loss of or damage to a vehicle or its contents, for personal injury, or for its indemnity obligations under this Agreement, and it confers no benefit on Service Provider as against an Occupant or any other third party. Property Manager is not liable for vehicles damaged during service.';

/**
 * Lavo's position.
 *
 * Split deliberately into what Lavo is (an intermediary), what it does not
 * promise, and what it is not liable for. A single sentence claiming Lavo is
 * "not liable for anything" invites a court to strike the whole provision;
 * stating the role, the disclaimers and a cap separately means the rest can
 * survive if any one part is challenged, which is what the severability
 * sentence at the end is for.
 */
export const LAVO_ROLE_CLAUSE =
  'Lavo operates a platform that introduces Property Manager and Service Provider to one another and processes payments between an Occupant or Property Manager and Service Provider. Lavo is not a party to the service relationship, is not the provider of the Services, does not perform, direct, supervise, inspect or control the Services, and does not employ or engage Service Provider or its personnel. Lavo does not select vehicles, handle keys, or take custody of any vehicle at any time.';

export const LAVO_DISCLAIMER_CLAUSE =
  'Lavo does not guarantee any volume of bookings, the attendance of Service Provider on any date, or the quality, timeliness or fitness of any Services performed. Lavo is not liable to Property Manager, to Service Provider, to any Occupant, or to any other person for loss of or damage to any vehicle or its contents, for damage to the Property, for personal injury or death, or for any other loss arising out of or relating to the Services, however caused and on any theory of liability, whether or not Lavo was advised of the possibility of such loss. Any claim arising out of the Services is to be made against Service Provider, and against Service Provider’s insurance to the extent it responds.';

export const INDEMNITY_CLAUSE =
  'Service Provider shall defend, indemnify and hold harmless Lavo and Property Manager, and their officers, employees and agents, from and against any claim, demand, proceeding, loss, liability, damage, cost or expense (including reasonable legal fees) brought by any person and arising out of or relating to the Services, the acts or omissions of Service Provider, its personnel or subcontractors, or Service Provider’s breach of this Agreement. This obligation is not limited by any insurance Service Provider carries, and survives termination of this Agreement.';

export const LAVO_CAP_CLAUSE =
  'Lavo’s aggregate liability to Property Manager and to Service Provider under this Agreement, on any theory, shall not exceed the platform fees Lavo actually collected in respect of the Property in the one (1) month preceding the event giving rise to the claim. In no event shall Lavo be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits or lost business. Lavo’s sole obligation in respect of a cancelled date is to return to the affected Occupants the payments it collected for it.';

/**
 * Lavo signs nothing. Without this, Lavo is a stranger to a contract that
 * grants it protections, and in most states a non-signatory cannot enforce
 * terms written in its favour unless the parties said it could. This is the
 * sentence that lets Lavo actually rely on everything above.
 */
export const THIRD_PARTY_BENEFICIARY_CLAUSE =
  'Lavo is an express third-party beneficiary of this Agreement with respect to every provision made for its benefit, including the disclaimers, indemnities and limitations above, and may enforce those provisions directly against either party notwithstanding that it is not a signatory. Those provisions, together with the insurance obligations, survive termination or expiry of this Agreement. If any provision of this section is held unenforceable, it shall be enforced to the greatest extent permitted and the remainder shall continue in full force.';

/** Rendered in order under "Limitation of Liability". */
export const LIABILITY_CLAUSES = [
  RESPONSIBILITY_CLAUSE,
  OPERATOR_CAP_CLAUSE,
  LAVO_ROLE_CLAUSE,
  LAVO_DISCLAIMER_CLAUSE,
  INDEMNITY_CLAUSE,
  LAVO_CAP_CLAUSE,
  THIRD_PARTY_BENEFICIARY_CLAUSE,
] as const;

export function insuranceClause(args: {
  approved?: boolean;
  expiresAt?: string | null;
}): string {
  if (args.approved) {
    const expiry = args.expiresAt ? `, as stated on that certificate expiring ${args.expiresAt.slice(0, 10)}` : '';
    // "on file" and not "verified": Lavo stores the document, it does not read
    // the policy behind it, and the clause above says so.
    return `${INSURANCE_CLAUSE_BASE} A certificate is on file with Lavo${expiry}.`;
  }
  return `${INSURANCE_CLAUSE_BASE} No certificate is on file with Lavo yet.`;
}
