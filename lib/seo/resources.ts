export type ResourceFaq = { question: string; answer: string };

export type ResourcePage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  opening: string;
  whatItIs: string[];
  howItWorks: string[];
  whoItIsFor: string[];
  whyItMatters: string[];
  faqs: ResourceFaq[];
  getStarted: string[];
  cta: { label: string; href: string };
  extraRelatedLinks?: { href: string; label: string }[];
};

export const RESOURCES: ResourcePage[] = [
  {
    slug: 'apartment-car-wash-amenity',
    title: 'Apartment Car Wash Amenity for Buildings | Lavo',
    description:
      'Learn how apartment buildings can offer mobile car wash as a no cost resident amenity while Lavo handles booking, operators, scheduling, and payments.',
    h1: 'Apartment Car Wash Amenity for Buildings',
    opening:
      'An apartment car wash amenity lets residents book mobile car washes directly from their building garage or parking area. With Lavo, buildings can offer this as a no cost resident amenity while Lavo handles operators, booking, scheduling, payments, and resident communication.',
    whatItIs: [
      'A car wash amenity is a resident-facing service offered inside or next to the building, not a discount at an off-site tunnel. Residents book from their phone, and a vetted mobile operator serves vehicles in the approved garage or lot.',
      'For property teams, the amenity is positioned like other convenience perks: easy to explain, easy to promote, and not tied to new capital equipment on the property.',
      'Lavo is the coordination layer between the building, residents, and operators. The building does not run wash logistics day to day.',
    ],
    howItWorks: [
      'A property manager adds the building to Lavo and shares a resident signup link or QR code. Residents create accounts tied to their unit and vehicle.',
      'The building connects with a mobile car wash operator in the area. Wash days or on-demand slots are scheduled based on garage access rules and operator capacity.',
      'Residents book and pay in the app. Operators see the day list with unit, vehicle, and parking spot details. After service, residents can review and rebook.',
      'Lavo handles payment collection and operator payouts. The building does not invoice residents or manage cash.',
    ],
    whoItIsFor: [
      'Property managers who want a visible resident perk without adding staff or vendor management overhead.',
      'Regional operators and owners who want differentiated amenities in lease marketing and renewals.',
      'Resident experience teams looking for practical perks that fit garage-based living.',
    ],
    whyItMatters: [
      'Car ownership in apartments is often inconvenient. Residents delay washes because they need to leave the property or coordinate with unknown vendors.',
      'A building-backed program sets clear access rules, pricing, and support paths. That reduces friction for residents and liability confusion for the property.',
      'Operators get grouped demand at one address, which can improve route efficiency compared to one-off street appointments.',
    ],
    faqs: [
      {
        question: 'Does the building pay for Lavo?',
        answer:
          'No. Buildings add Lavo as a no cost amenity. Residents pay for washes they book, and Lavo coordinates operator payouts.',
      },
      {
        question: 'Who chooses the operator?',
        answer:
          'The property team reviews nearby operators on Lavo and sends a partnership request. The operator accepts before residents can book.',
      },
      {
        question: 'Can we use our existing vendor?',
        answer:
          'If your vendor is on Lavo or willing to onboard, they can serve your building through the same booking flow.',
      },
      {
        question: 'What do residents need to get started?',
        answer:
          'Residents sign up with email, unit number, and vehicle details using the building link or QR code.',
      },
      {
        question: 'How do garage access rules work?',
        answer:
          'Wash timing and access are set with the building and operator so service happens only in approved areas and windows.',
      },
    ],
    getStarted: [
      'Share your building address and management contact. Lavo will confirm market availability and onboarding steps.',
      'Post the resident link in your welcome packet, lobby, or resident portal once live.',
    ],
    cta: { label: 'Add Lavo to your building', href: '/signup?role=building_manager' },
    extraRelatedLinks: [
      { href: '/resources/car-wash-amenity-for-property-managers', label: 'Car wash amenity for property managers' },
      { href: '/resources/car-wash-amenity-insurance-damage', label: 'Insurance and damage handling' },
    ],
  },
  {
    slug: 'free-resident-amenity-ideas',
    title: 'Free Resident Amenity Ideas for Apartment Buildings | Lavo',
    description:
      'Explore free and low cost resident amenity ideas for apartment buildings, including mobile car wash programs that add convenience without extra staffing.',
    h1: 'Free Resident Amenity Ideas for Apartment Buildings',
    opening:
      'Apartment buildings can add valuable resident amenities without taking on major costs or staffing. A mobile car wash program is one example because residents get convenience while the building avoids managing equipment, payments, or day to day operations.',
    whatItIs: [
      'Free or low cost amenities are services or perks where the property does not bill residents directly and does not carry heavy operating overhead.',
      'Strong examples include partner-run programs, digital perks, and on-site services coordinated by a platform instead of building staff.',
      'A mobile car wash amenity fits this model when residents pay for usage while the building pays nothing to offer the program.',
    ],
    howItWorks: [
      'Identify amenities that solve frequent resident friction. Parking, package handling, cleaning, and vehicle care are common themes in car-friendly buildings.',
      'Prefer programs with clear ownership: who handles scheduling, payments, support, and documentation.',
      'Launch with simple resident communication: one link, one QR code, and a short FAQ in your resident portal.',
      'Measure uptake through bookings and feedback rather than vanity usage metrics.',
    ],
    whoItIsFor: [
      'Property managers balancing resident satisfaction and operating budget.',
      'Owners comparing amenity ROI across assets in the same submarket.',
      'Leasing teams that need practical differentiators beyond generic gym posters.',
    ],
    whyItMatters: [
      'Residents compare buildings on convenience, not only square footage. Small perks that save time can influence renewal conversations.',
      'Amenities fail when they create hidden work for onsite teams. Programs with defined vendor roles tend to last longer.',
      'Car wash amenities are especially relevant where many residents have vehicles in attached garages or assigned spots.',
    ],
    faqs: [
      {
        question: 'What counts as a low cost amenity?',
        answer:
          'Low cost usually means no capital project and no full-time staff added. Partner platforms and resident-paid services often qualify.',
      },
      {
        question: 'Is a car wash amenity hard to explain?',
        answer:
          'No. Residents already understand mobile detailing. The building message is simple: book from your phone in the garage.',
      },
      {
        question: 'Do we need new equipment on site?',
        answer:
          'No equipment purchase is required for a Lavo program. Operators bring their own tools and supplies.',
      },
      {
        question: 'Can amenities vary by building type?',
        answer:
          'Yes. High rise garages, surface lots, and mixed-use podiums each need slightly different access rules.',
      },
    ],
    getStarted: [
      'Pick one amenity with clear resident demand and low property overhead. Pilot with strong signage and email placement.',
      'If vehicle care is a fit for your community, start a Lavo building page and share the resident signup link.',
    ],
    cta: { label: 'Bring Lavo to your property', href: '/buildings' },
    extraRelatedLinks: [
      { href: '/resources/apartment-car-wash-amenity', label: 'Apartment car wash amenity' },
    ],
  },
  {
    slug: 'mobile-car-wash-apartment-garage',
    title: 'Mobile Car Wash in Apartment Garages | Lavo',
    description:
      'See how mobile car wash works in apartment garages, including booking, access, scheduling, resident communication, and operator coordination.',
    h1: 'Mobile Car Wash in Apartment Garages',
    opening:
      'A mobile car wash can work inside an apartment garage when the building has an approved process for resident booking, operator access, service timing, and communication. Lavo coordinates the workflow so residents do not need to drive anywhere.',
    whatItIs: [
      'Garage-based mobile wash means the vehicle stays in the building parking structure or assigned area while the operator performs exterior cleaning and optional add-ons.',
      'The service is not a tunnel visit and not a street curb appointment with unclear access rights.',
      'Buildings define where washing is allowed, which levels or zones operators can use, and how residents label parking spots.',
    ],
    howItWorks: [
      'Residents book a slot in Lavo and enter vehicle details plus spot labels used by the garage.',
      'Operators receive a run sheet for the building day with unit and location context.',
      'Building management shares access instructions: check-in, escort rules, or pre-approved vendor lists as required.',
      'After service, photo confirmation and ratings help close the loop for residents and operators.',
    ],
    whoItIsFor: [
      'Residents in high rise or mid-rise buildings with attached parking.',
      'Operators who want repeatable building stops instead of scattered street jobs.',
      'Property teams that need structured vendor access in controlled garages.',
    ],
    whyItMatters: [
      'Garage access is the main reason ad hoc mobile washes fail at apartments. A defined program reduces confusion at the gate.',
      'Grouped bookings on the same floor or zone improve operator efficiency and can stabilize pricing for residents.',
      'Clear rules protect other residents: less idle traffic, less hose clutter, and predictable service windows.',
    ],
    faqs: [
      {
        question: 'Do operators need garage keys?',
        answer:
          'Access depends on building policy. Some properties escort vendors, others use vendor credentials or scheduled access windows.',
      },
      {
        question: 'Can washing happen on any level?',
        answer:
          'Only in areas approved by the building. Drainage, ventilation, and HOA rules may limit specific zones.',
      },
      {
        question: 'What about water use?',
        answer:
          'Operators follow their own methods and any building guidelines. Review your water policy with the property team if needed.',
      },
      {
        question: 'Can residents book if they park outside?',
        answer:
          'If the building includes exterior assigned spots in the program, residents can book when those spots are in scope.',
      },
    ],
    getStarted: [
      'Confirm your garage allows vendor service windows. Then request Lavo for your building address.',
      'Residents can share building interest with management using the same request flow.',
    ],
    cta: { label: 'See if your building is on Lavo', href: '/' },
    extraRelatedLinks: [
      { href: '/resources/mobile-car-wash-for-apartment-residents', label: 'Mobile car wash for apartment residents' },
    ],
  },
  {
    slug: 'do-you-need-to-be-home-for-mobile-car-wash',
    title: 'Do You Need to Be Home for a Mobile Car Wash? | Lavo',
    description:
      'In many apartment buildings, residents do not need to be home for a mobile car wash when the building has an approved booking and access process.',
    h1: 'Do You Need to Be Home for a Mobile Car Wash?',
    opening:
      'No, in many apartment buildings you do not need to be home for a mobile car wash if your building has an approved access and booking process. Lavo is designed so residents can book from their phone and get their car washed while they are home, working, or busy.',
    whatItIs: [
      'Being home is not always required when the building and operator agree on how to access the garage and identify the vehicle.',
      'The key is accurate booking details: plate, color, make, model, and parking spot label.',
      'Some buildings still require residents to meet vendors at the gate. That rule is set by the property, not by Lavo alone.',
    ],
    howItWorks: [
      'You book a wash day or open slot in Lavo and confirm vehicle location details.',
      'The operator uses the building run sheet to find your car in the approved area.',
      'You may receive notifications when service starts and completes.',
      'If your building requires presence, that will be stated in resident instructions before booking.',
    ],
    whoItIsFor: [
      'Residents with busy schedules who cannot wait curbside for a detailer.',
      'Remote workers who want service during the workday in the garage.',
      'Property managers who want fewer access incidents at the front desk.',
    ],
    whyItMatters: [
      'Apartment living already includes coordination overhead. Removing the need to hand off keys in person saves time.',
      'Operators complete more cars per visit when they can rely on spot labels instead of phone calls.',
      'Clear booking data reduces wrong-vehicle risk and speeds dispute review if something looks off.',
    ],
    faqs: [
      {
        question: 'Should I leave my keys?',
        answer:
          'Most exterior washes do not require keys. Interior services may need access per operator policy.',
      },
      {
        question: 'How does the operator find my car?',
        answer:
          'Your booking includes vehicle details and the parking spot label your building uses.',
      },
      {
        question: 'What if my spot changes that day?',
        answer:
          'Update your booking before the service window or contact support through the app if timing is tight.',
      },
      {
        question: 'Can I get notified when done?',
        answer:
          'Yes. Lavo supports completion notifications so you know when to expect a clean vehicle.',
      },
    ],
    getStarted: [
      'Check if your building is on Lavo. If not, submit your address so management can review the program.',
      'When live, book your first wash and confirm spot labels match garage signage.',
    ],
    cta: { label: 'Request Lavo at your building', href: '/' },
  },
  {
    slug: 'mobile-car-wash-for-apartment-residents',
    title: 'Mobile Car Wash for Apartment Residents | Lavo',
    description:
      'Learn how apartment residents can book mobile car washes from their building garage or parking area without leaving home.',
    h1: 'Mobile Car Wash for Apartment Residents',
    opening:
      'Mobile car wash for apartment residents means you can book a wash from your phone and have your car cleaned at your building. Lavo is built for residents who want convenience without driving to a car wash or coordinating with a random provider.',
    whatItIs: [
      'Resident-focused mobile wash is booking, payment, and service tied to your building address and approved operator.',
      'You see pricing before you pay. No cash, no negotiation in the garage.',
      'Add-ons like interior care or tire dressing may be available depending on operator services.',
    ],
    howItWorks: [
      'Sign up through your building QR or link with unit and vehicle details.',
      'Pick a building wash day for building-rate slots or an on-demand day when the operator has capacity.',
      'Pay in the app. Track status and history from your resident dashboard.',
      'Leave a review after service to help your building and operator improve.',
    ],
    whoItIsFor: [
      'Residents in urban and suburban apartments with on-site parking.',
      'Households with one or more vehicles that rarely visit tunnel washes.',
      'Anyone who wants vetted operators instead of unknown door-to-door flyers.',
    ],
    whyItMatters: [
      'Time saved matters more in dense housing. A 20 minute trip to a wash plus wait time is a real weekend cost.',
      'Building-backed operators are screened and tied to your property rules, which is harder to get from random social posts.',
      'Wash day pricing at your building can be lower than one-off street bookings when demand is grouped.',
    ],
    faqs: [
      {
        question: 'How do I know if my building is live?',
        answer:
          'Search your address on the Lavo homepage or ask your property manager for the resident link.',
      },
      {
        question: 'Can I choose my operator?',
        answer:
          'Your building partners with an operator on Lavo. You book within that approved relationship.',
      },
      {
        question: 'What payment methods are supported?',
        answer:
          'Residents pay through secure in-app checkout. Tips and add-ons follow the same flow.',
      },
      {
        question: 'What if I have an issue after a wash?',
        answer:
          'File a report in the app with photos. See the damage policy for how reviews are handled.',
      },
    ],
    getStarted: [
      'Ask your building for the Lavo resident link if you do not have it yet.',
      'Complete your vehicle profile so operators can service the right car at the right spot.',
    ],
    cta: { label: 'Request Lavo at your building', href: '/' },
    extraRelatedLinks: [
      { href: '/resources/do-you-need-to-be-home-for-mobile-car-wash', label: 'Do you need to be home?' },
    ],
  },
  {
    slug: 'car-wash-amenity-for-property-managers',
    title: 'Car Wash Amenity for Property Managers | Lavo',
    description:
      'Lavo helps property managers add a convenient car wash amenity without staffing, equipment, payments, or day to day vendor management.',
    h1: 'Car Wash Amenity for Property Managers',
    opening:
      'A car wash amenity gives property managers a simple way to add resident convenience without staffing, equipment, or day to day vendor management. Lavo brings vetted mobile car wash operators to apartment buildings and handles the booking flow for residents.',
    whatItIs: [
      'For property managers, the amenity is a packaged resident perk with defined roles: building approves access, operator serves, Lavo runs booking and payments.',
      'It is not a capital project and not a new onsite hire.',
      'Reporting focuses on participation and resident satisfaction rather than utility-style metering.',
    ],
    howItWorks: [
      'Create the building profile, publish the resident link, and select an operator partnership.',
      'Set expectations with onsite staff about vendor check-in and garage zones.',
      'Promote during move-in, renewal season, and resident newsletters.',
      'Use Lavo support for booking issues while keeping management involvement light.',
    ],
    whoItIsFor: [
      'Onsite managers at garden-style, mid-rise, and high-rise communities.',
      'Regional supervisors standardizing amenities across a portfolio.',
      'Third-party managers answering owner requests for competitive perks.',
    ],
    whyItMatters: [
      'Managers already balance maintenance, leasing, and resident requests. Amenities that create daily tickets are hard to sustain.',
      'A car wash program addresses a frequent resident need with minimal desk load when access rules are clear.',
      'Grouped operator visits can reduce random vendor knock-on doors and uninsured one-offs.',
    ],
    faqs: [
      {
        question: 'How long does setup take?',
        answer:
          'Many buildings publish a resident link in minutes after address verification. Operator matching depends on local supply.',
      },
      {
        question: 'Do we sign a long contract?',
        answer:
          'Lavo is designed as a no cost amenity for buildings. Review terms for your portfolio standards before launch.',
      },
      {
        question: 'Who supports angry residents?',
        answer:
          'Lavo handles booking and platform support. Serious damage or access disputes follow documented escalation paths.',
      },
      {
        question: 'Can we pause the program?',
        answer:
          'Yes. Buildings can adjust promotion and scheduling with Lavo if operations need a pause.',
      },
    ],
    getStarted: [
      'Book a short intro with Lavo to confirm garage fit and operator availability.',
      'Prepare a resident email template and lobby QR placement for launch week.',
    ],
    cta: { label: 'Talk to Lavo', href: '/contact' },
    extraRelatedLinks: [
      { href: '/resources/apartment-car-wash-amenity', label: 'Apartment car wash amenity overview' },
    ],
  },
  {
    slug: 'car-wash-amenity-insurance-damage',
    title: 'Insurance and Damage Handling for Apartment Car Wash Programs | Lavo',
    description:
      'Learn how apartment car wash programs can handle operator documentation, insurance requests, resident reports, and damage review workflows.',
    h1: 'Insurance and Damage Handling for Apartment Car Wash Programs',
    opening:
      'Apartment car wash programs need a clear process for operator documentation, building requirements, resident communication, and issue handling. Lavo helps organize these steps so buildings and residents know how concerns are reviewed.',
    whatItIs: [
      'Insurance and damage handling covers certificates operators may need, how residents report issues, and how evidence is collected.',
      'It is not a promise that nothing will ever go wrong. It is a defined workflow when something does.',
      'Buildings may require COI naming, additional insured language, or garage-specific endorsements.',
    ],
    howItWorks: [
      'Operators submit documentation during onboarding and updates as policies renew.',
      'Buildings request what they need before approving wash days in sensitive garages.',
      'Residents file issues with photos, booking IDs, and timestamps in the app.',
      'Lavo support reviews operator responses and policy terms. See the damage policy for resident-facing steps.',
    ],
    whoItIsFor: [
      'Risk-conscious property managers and asset managers.',
      'Residents who want a clear path if paint, trim, or interior items are affected.',
      'Operators who already carry business insurance and want apartment demand.',
    ],
    whyItMatters: [
      'Unstructured vendor programs push liability questions to the front desk with no records.',
      'Documented workflows reduce ambiguity about who responds and what evidence is required.',
      'Photo proof before and after washes supports fair outcomes for residents and operators.',
    ],
    faqs: [
      {
        question: 'Does Lavo replace building insurance review?',
        answer:
          'No. Buildings should still review certificates against their standards. Lavo helps collect and coordinate requests.',
      },
      {
        question: 'What should residents photograph?',
        answer:
          'Wide shots and close-ups of affected areas, plus booking details and time of service.',
      },
      {
        question: 'How fast are issues reviewed?',
        answer:
          'Timelines are listed in the damage policy. Complex cases may need operator and insurer follow-up.',
      },
      {
        question: 'Are all operators insured?',
        answer:
          'Lavo requires active insurance for operators on the platform. Buildings may require additional coverage limits.',
      },
    ],
    getStarted: [
      'Read the Lavo damage policy and safety overview before launch.',
      'Share building certificate requirements early so onboarding is not delayed.',
    ],
    cta: { label: 'View Lavo safety process', href: '/safety' },
    extraRelatedLinks: [
      { href: '/legal/damage-policy', label: 'Damage policy' },
    ],
  },
  {
    slug: 'mobile-detailing-leads-apartments',
    title: 'How Mobile Detailers Can Get Recurring Apartment Customers | Lavo',
    description:
      'Learn how mobile detailers and car wash operators can use apartment building wash days to create recurring local demand.',
    h1: 'How Mobile Detailers Can Get Recurring Apartment Customers',
    opening:
      'Mobile detailers can get more recurring customers by serving apartment buildings through scheduled wash days. Lavo helps operators connect with apartment communities where multiple residents can book service in the same location.',
    whatItIs: [
      'Apartment demand is different from retail driveway leads. You get many cars in one garage with one access approval.',
      'Recurring wash days turn scattered marketing into a calendar rhythm residents learn.',
      'Lavo is a demand and booking layer, not a replacement for your service quality or crew training.',
    ],
    howItWorks: [
      'Apply as an operator and define your service radius and offerings.',
      'Accept building partnership requests that fit your route and capacity.',
      'Run wash days with a resident booking list instead of chasing individual DMs.',
      'Collect payouts through Stripe with transaction history in your dashboard.',
    ],
    whoItIsFor: [
      'Mobile exterior wash crews expanding beyond one-off street jobs.',
      'Detailers adding exterior maintenance routes between full details.',
      'Owner-operators who want predictable local volume without ad spend spikes.',
    ],
    whyItMatters: [
      'Customer acquisition cost drops when one building produces multiple bookings per visit.',
      'Reviews from real residents in the same community build trust faster than anonymous ads.',
      'You spend less time on scheduling texts and more time on service.',
    ],
    faqs: [
      {
        question: 'Do I set my own prices?',
        answer:
          'Yes. Operators set rates for wash days and open slots. Residents see pricing before booking.',
      },
      {
        question: 'How do I get building leads?',
        answer:
          'Buildings request partnerships on Lavo. You can also pursue buildings in your radius that are not live yet.',
      },
      {
        question: 'What about platform fees?',
        answer:
          'Lavo retains a platform fee per booking. See operator onboarding for current terms.',
      },
      {
        question: 'Can I bring my existing apartment client?',
        answer:
          'Yes. Existing relationships can run through Lavo so residents get a standard booking experience.',
      },
    ],
    getStarted: [
      'Apply with service photos, insurance, and coverage map.',
      'Start with one building wash day pilot, then expand to nearby properties on the same route.',
    ],
    cta: { label: 'Apply as a Lavo operator', href: '/signup?role=operator' },
    extraRelatedLinks: [
      { href: '/resources/apartment-wash-day-playbook', label: 'Apartment wash day playbook' },
    ],
  },
  {
    slug: 'apartment-wash-day-playbook',
    title: 'Apartment Wash Day Playbook for Operators | Lavo',
    description:
      'A practical guide for mobile car wash operators running scheduled apartment wash days with resident bookings and building coordination.',
    h1: 'Apartment Wash Day Playbook for Operators',
    opening:
      'An apartment wash day lets a mobile car wash operator serve multiple residents at one building during a scheduled service window. This can reduce drive time, improve route efficiency, and create more predictable local demand.',
    whatItIs: [
      'A wash day is a scheduled window where residents book slots and you service cars in one approved garage or lot.',
      'It is different from on-demand-only models because marketing is concentrated and access is pre-cleared.',
      'Your run sheet becomes the day plan: vehicle, spot label, service type, and add-ons.',
    ],
    howItWorks: [
      'Confirm building access rules and arrival check-in 24 hours before the window.',
      'Stage supplies for volume: towels, chemicals, trash bags, and spot label tape if needed.',
      'Work floor by floor or zone to reduce elevator time in high rises.',
      'Mark jobs complete in the crew tool so payouts and resident notifications trigger.',
      'Capture issues immediately with photos if a vehicle does not match the booking.',
    ],
    whoItIsFor: [
      'Operators moving from retail driveways to structured multifamily routes.',
      'Crew leads training new staff on garage etiquette and quiet hours.',
      'Owners building weekly density in one submarket before expanding miles away.',
    ],
    whyItMatters: [
      'Drive time between paid jobs is the hidden tax in mobile wash. Buildings cut that tax.',
      'Predictable volume helps you staff correctly and buy supplies in bulk.',
      'Strong wash day execution leads to rebookings and additional building referrals.',
    ],
    faqs: [
      {
        question: 'How many cars fit in one window?',
        answer:
          'Depends on crew size, service type, and garage layout. Start conservative, then tune capacity from completion data.',
      },
      {
        question: 'What if access is delayed?',
        answer:
          'Notify residents through the platform and adjust order. Document delays for building review.',
      },
      {
        question: 'Should I offer interior on wash days?',
        answer:
          'Only if keys and time windows are realistic. Many buildings start exterior-only.',
      },
      {
        question: 'How do tips and add-ons work?',
        answer:
          'Residents purchase in app. Your dashboard shows gross, fees, and net per job.',
      },
    ],
    getStarted: [
      'Join Lavo and complete compliance onboarding.',
      'Pick one building, one weekly window, and one clear service menu for the first month.',
    ],
    cta: { label: 'Join Lavo', href: '/signup?role=operator' },
    extraRelatedLinks: [
      { href: '/resources/mobile-detailing-leads-apartments', label: 'Recurring apartment customers' },
    ],
  },
];

export const RESOURCE_SLUGS = RESOURCES.map((r) => r.slug);

export function getResourceBySlug(slug: string): ResourcePage | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}
