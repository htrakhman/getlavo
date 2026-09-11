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
 * the indemnity, the liability cap, and the insurance specification.
 */

/**
 * Insurance.
 *
 * The previous clause asked only for $1,000,000 of commercial general
 * liability, which is the wrong instrument for the risk that actually matters
 * here. A standard CGL policy carries a care, custody and control exclusion:
 * it generally does NOT cover damage to property the insured has taken charge
 * of, and a car being washed is squarely in the operator's charge. The policy
 * that answers a damaged-vehicle claim is garagekeepers legal liability, so
 * that is now required by name and by amount.
 *
 * Naming Lavo and the Property Manager as additional insureds, primary and
 * non-contributory, with waiver of subrogation, is what makes the operator's
 * insurer defend them rather than pay out and then sue them to get it back.
 */
export const INSURANCE_CLAUSE_BASE =
  'Service Provider shall maintain, throughout the term of this Agreement and for one (1) year after it ends: (a) commercial general liability insurance of no less than $1,000,000 per occurrence and $2,000,000 in the aggregate; (b) garagekeepers legal liability or equivalent coverage for loss of or damage to vehicles in Service Provider’s care, custody or control of no less than $100,000 per vehicle, a standard commercial general liability policy being understood not to cover such loss; and (c) any commercial auto liability and workers’ compensation coverage required by law. Lavo and Property Manager shall each be named as an additional insured on a primary and non-contributory basis, and Service Provider’s insurers shall waive rights of subrogation against them. Service Provider shall deliver certificates evidencing this coverage before the first service date and shall give thirty (30) days’ written notice before any cancellation or material reduction.';

/**
 * Who carries the risk of a damaged vehicle.
 *
 * The previous clause capped Service Provider's liability for any single
 * incident at "the retail value of the service rendered" — roughly the price
 * of one wash. That reads as protective boilerplate but works against
 * everyone except the operator: an Occupant whose paint is ruined cannot
 * recover a wash's worth of damage from the operator, so the claim goes
 * looking for whoever else is reachable, which is the property and Lavo. The
 * cap is now confined to commercial disputes between the two signatories and
 * expressly does not touch vehicle damage, injury, or the indemnities.
 */
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
  'Lavo does not guarantee any volume of bookings, the attendance of Service Provider on any date, or the quality, timeliness or fitness of any Services performed. Lavo is not liable to Property Manager, to Service Provider, to any Occupant, or to any other person for loss of or damage to any vehicle or its contents, for damage to the Property, for personal injury or death, or for any other loss arising out of or relating to the Services, however caused and on any theory of liability, whether or not Lavo was advised of the possibility of such loss. Any claim arising out of the Services is to be made against Service Provider, and Service Provider’s insurance is the source of recovery for it.';

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
    const expiry = args.expiresAt ? `, expires ${args.expiresAt.slice(0, 10)}` : '';
    return `${INSURANCE_CLAUSE_BASE} Current policy on file${expiry}.`;
  }
  return `${INSURANCE_CLAUSE_BASE} Proof of insurance to be provided prior to the first service date.`;
}
