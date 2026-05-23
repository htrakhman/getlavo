#!/usr/bin/env python3
"""Generate lib/seo/cities/content/{county}.ts from data/nj-municipalities.json."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "nj-municipalities.json"
CONTENT_DIR = ROOT / "lib" / "seo" / "cities" / "content"
OVERRIDES = ROOT / "scripts" / "nj-city-overrides.json"

COUNTY_PROFILE: dict[str, dict] = {
    "atlantic": {
        "region": "South Jersey shore and mainland",
        "parking": "shore towers, casino-area garages, and mainland garden lots near the Parkway",
        "commute": "Atlantic City hospitality workers and Philadelphia commuters",
        "corridor": "the White Horse Pike and Atlantic City Expressway corridors",
    },
    "bergen": {
        "region": "Bergen County",
        "parking": "Hudson River high-rise garages, Route 17 garden lots, and Palisades cliffside decks",
        "commute": "Manhattan bridge-and-tunnel commuters",
        "corridor": "Route 4, Route 17, and the Palisades Interstate Parkway",
    },
    "burlington": {
        "region": "Burlington County",
        "parking": "Pine Barrens edge garden communities and suburban lots along I-295",
        "commute": "Philadelphia and Shore commuters",
        "corridor": "Route 130 and the NJ Turnpike corridor",
    },
    "camden": {
        "region": "Camden County",
        "parking": "row-home adjacent lots, hospital-corridor apartments, and Cherry Hill garden stock",
        "commute": "Philadelphia cross-river commuters",
        "corridor": "Routes 38 and 70 and the PATCO line",
    },
    "cape-may": {
        "region": "Cape May County shore",
        "parking": "seasonal shore rentals, small borough lots, and wetland-adjacent garden apartments",
        "commute": "seasonal tourism and year-round shore residents",
        "corridor": "Garden State Parkway shore exits",
    },
    "cumberland": {
        "region": "Cumberland County",
        "parking": "wide surface lots at garden-style complexes and downtown Vineland/Millville stock",
        "commute": "regional employers and Shore weekend traffic",
        "corridor": "Route 55 and the Millville industrial corridor",
    },
    "essex": {
        "region": "Essex County",
        "parking": "Newark high-rise garages, South Orange/Montclair mid-rises, and Bloomfield garden lots",
        "commute": "NYC and Newark job-center commuters",
        "corridor": "Routes 3, 21, and 280",
    },
    "gloucester": {
        "region": "Gloucester County",
        "parking": "suburban garden apartments and townhome courts off major arterials",
        "commute": "Philadelphia and Wilmington commuters",
        "corridor": "Route 42 and the NJ Turnpike",
    },
    "hudson": {
        "region": "Hudson County",
        "parking": "structured garages in waterfront towers and tight mid-rise decks",
        "commute": "Manhattan PATH and ferry commuters",
        "corridor": "the Hudson waterfront and Kennedy Boulevard",
    },
    "hunterdon": {
        "region": "Hunterdon County",
        "parking": "low-rise garden apartments, farmhouse conversions, and rural road frontage lots",
        "commute": "Route 78 and I-78 corridor office parks",
        "corridor": "Routes 22, 31, and 202",
    },
    "mercer": {
        "region": "Mercer County",
        "parking": "Princeton/Trenton mixed stock from historic walk-ups to Route 1 garden complexes",
        "commute": "state government, education, and pharma campus workers",
        "corridor": "Route 1 and the Princeton corridor",
    },
    "middlesex": {
        "region": "Middlesex County",
        "parking": "NJ Turnpike-adjacent garden cities, New Brunswick mid-rises, and Edison lot stock",
        "commute": "NYC, Newark, and Middlesex County corporate campuses",
        "corridor": "Routes 1, 9, and 18",
    },
    "monmouth": {
        "region": "Monmouth County",
        "parking": "shore-adjacent garages, Route 35 corridor apartments, and western suburban lots",
        "commute": "NYC ferry/rail and local Shore tourism",
        "corridor": "Routes 35, 36, and the Garden State Parkway",
    },
    "morris": {
        "region": "Morris County",
        "parking": "Morris County garden communities, Morris Township corporate-adjacent stock, and Morristown mid-rises",
        "commute": "NYC and Morris County corporate campuses",
        "corridor": "Routes 10, 24, and 287",
    },
    "ocean": {
        "region": "Ocean County",
        "parking": "barrier-island seasonal stock and mainland Toms River/Lakewood garden lots",
        "commute": "Shore tourism and North Jersey bedroom-community commuters",
        "corridor": "Garden State Parkway and Route 9",
    },
    "passaic": {
        "region": "Passaic County",
        "parking": "Paterson/Clifton urban garages and Wayne/Pompton Lakes suburban lots",
        "commute": "NYC and North Jersey warehouse/logistics corridors",
        "corridor": "Routes 3, 23, and 46",
    },
    "salem": {
        "region": "Salem County",
        "parking": "rural highway-frontage apartments and small-town surface lots",
        "commute": "Delaware Valley and South Jersey employers",
        "corridor": "Routes 40 and 49",
    },
    "somerset": {
        "region": "Somerset County",
        "parking": "Route 287 corridor garden apartments and Bridgewater/Warren corporate-campus adjacent stock",
        "commute": "Somerset County pharma and finance campuses",
        "corridor": "Routes 22, 202, and 287",
    },
    "sussex": {
        "region": "Sussex County",
        "parking": "lake-community garden apartments and rural hillside lots",
        "commute": "I-80 and Route 15 corridor jobs",
        "corridor": "Routes 15, 23, and 94",
    },
    "union": {
        "region": "Union County",
        "parking": "Elizabeth/Union urban garages and Cranford/Westfield suburban garden stock",
        "commute": "NYC, Newark Airport, and Union County logistics",
        "corridor": "Routes 1, 9, 22, and the Garden State Parkway",
    },
    "warren": {
        "region": "Warren County",
        "parking": "river-valley garden apartments and small-town borough lots",
        "commute": "Lehigh Valley and I-78 corridor jobs",
        "corridor": "Routes 22, 31, and 57",
    },
}

TYPE_LABEL = {
    "city": "city",
    "township": "township",
    "borough": "borough",
    "town": "town",
    "village": "village",
}

PARKING_BY_TYPE = {
    "city": "urban garages, mid-rise decks, and mixed surface lots",
    "township": "garden-style surface lots, podiums, and scattered garage bays",
    "borough": "compact borough lots, small garages, and walkable street-adjacent parking",
    "town": "walkable downtown blocks with small garages and permitted lot zones",
    "village": "village-center lots and small shared parking courts",
}


def h(seed: str, n: int) -> int:
    return int(hashlib.md5(seed.encode()).hexdigest(), 16) % n


def pick(seed: str, options: list[str]) -> str:
    return options[h(seed, len(options))]


def neighbors(muni: dict, all_in_county: list[dict]) -> list[str]:
    names = sorted(m["name"] for m in all_in_county)
    idx = names.index(muni["name"])
    out = []
    if idx > 0:
        out.append(names[idx - 1])
    if idx < len(names) - 1:
        out.append(names[idx + 1])
    if idx > 1:
        out.append(names[idx - 2])
    return out[:2]


def ts_string(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def ts_array(items: list[str], indent: str = "      ") -> str:
    lines = [f"{indent}'{item.replace(chr(39), chr(92)+chr(39))}'," if "'" in item else f"{indent}{json.dumps(item)}," for item in items]
    # use json.dumps for safety
    lines = [f"{indent}{json.dumps(item)}," for item in items]
    return "\n".join(lines)


def build_page(muni: dict, all_in_county: list[dict], override: dict | None) -> dict:
    if override:
        page = {**override}
        page["county"] = muni["county"]
        page["countySlug"] = muni["countySlug"]
        return page

    name = muni["name"]
    slug = muni["slug"]
    county = muni["county"]
    county_slug = muni["countySlug"]
    mtype = muni["type"]
    seed = muni["geoid"]
    profile = COUNTY_PROFILE[county_slug]
    nb = neighbors(muni, all_in_county)
    type_label = TYPE_LABEL.get(mtype, mtype)
    parking = PARKING_BY_TYPE.get(mtype, "on-site parking areas")

    title = f"Mobile Car Wash for Apartment Buildings in {name} | Lavo"
    description = (
        f"Lavo helps {name} apartment residents book mobile car washes from their building "
        f"garage or parking area in {county} County, New Jersey."
    )
    h1 = f"Mobile Car Wash for Apartment Buildings in {name}"
    opening = (
        f"Lavo helps {name} apartment residents book mobile car washes directly from their "
        f"building garage or parking area. Property managers in this {county} County {type_label} "
        f"can offer the program as a no cost resident amenity while operators build local routes."
    )

    mobile = [
        f"{name} sits in {profile['region']} where apartment stock often includes {parking}. "
        f"Buildings in {name} along {profile['corridor']} see steady vehicle use from {profile['commute']}.",
        pick(
            seed + "m1",
            [
                f"Mobile washing works when {name} properties post clear garage or lot rules and operators stage equipment without blocking drive aisles.",
                f"Many {name} communities mix older garden stock with renovated leasing offices, so spot labeling in the app matters for first-time operator visits.",
                f"Winter road salt and summer shore dust both push {name} residents toward on-site service instead of weekend tunnel queues.",
            ],
        ),
        pick(
            seed + "m2",
            [
                f"In {name}, operators plan around {profile['parking']} typical of {county} County when scheduling wash days.",
                f"Property teams in {name} can start with one approved operator rather than dozens of uninsured knock-on vendors.",
                f"Residents who already pay for assigned parking in {name} prefer keeping the car in place for service.",
            ],
        ),
    ]

    residents = [
        pick(
            seed + "r0",
            [
                f"Book from your phone, enter your {name} unit and stall number, and pay before the crew arrives.",
                f"Residents in {name} can schedule around work-from-home days without losing a parking spot on the street.",
                f"Keep vehicle color and plate details current so operators find the right car in busy {name} lots.",
            ],
        ),
        pick(
            seed + "r1",
            [
                f"Building wash days in {name} can unlock neighbor pricing when your property sets a recurring window.",
                f"{name} residents see package pricing and history in the app for expense reporting or lease records.",
                f"Notifications tell you when service finishes at your {name} building so you can move the car if needed.",
            ],
        ),
        pick(
            seed + "r2",
            [
                f"If your {name} building is not live yet, submit the address so Lavo can alert your manager and nearby operators.",
                f"Rebook the same operator after a good visit to keep consistent quality in your {name} community.",
                f"Share the resident link with neighbors in {name} to help your building reach operator interest faster.",
            ],
        ),
    ]

    buildings = [
        f"Add Lavo in {name} without building a wash bay or hiring onsite wash staff.",
        pick(
            seed + "b1",
            [
                f"{name} management distributes one QR or link instead of approving random vendor calls at the desk.",
                f"Garage and lot rules for {name} properties are reflected in operator access instructions.",
                f"The program pairs with existing fitness, package, and coworking perks at {name} buildings without CapEx.",
            ],
        ),
        pick(
            seed + "b2",
            [
                f"Staff spend less time policing unauthorized detailers circling {name} parking areas.",
                f"Insurance and vendor packets for {name} are collected once per operator partnership.",
                f"Resident reviews at {name} stay tied to the building program so quality trends are visible.",
            ],
        ),
    ]

    pms = [
        pick(
            seed + "p0",
            [
                f"Market convenience to renters comparing {name} against nearby {county} County alternatives.",
                f"Use Lavo in {name} renewal conversations where parking is bundled but tunnel trips feel inconvenient.",
                f"Portfolio owners can align messaging across multiple {name} assets with the same operator standards.",
            ],
        ),
        pick(
            seed + "p1",
            [
                f"Document vendor insurance once for {name} board, lender, and auditor requests.",
                f"Reduce liability from unknown vendors entering {name} private parking without clearance.",
                f"Highlight the amenity on tours of garden and mid-rise stock throughout {name}.",
            ],
        ),
        pick(
            seed + "p2",
            [
                f"Start with a pilot building in {name}, then expand using resident booking data.",
                f"Standardize access hours and quiet rules at {name} properties before the first wash day.",
                f"Position the perk for {name} commuters who already treat car care as a time problem in {county} County.",
            ],
        ),
    ]

    nb_text = " and ".join(nb) if nb else f"nearby {county} County towns"
    operators = [
        pick(
            seed + "o0",
            [
                f"Operators can pair {name} with {nb_text} on the same {county} County wash day.",
                f"Routes through {profile['corridor']} can include {name} garden stops between retail driveway jobs.",
                f"Crews serving {name} familiar with {profile['parking']} work faster when buildings share spot maps up front.",
            ],
        ),
        pick(
            seed + "o1",
            [
                f"Wash days at larger {name} communities anchor mid-week revenue before retail appointments.",
                f"Lavo surfaces {name} building partnership requests so operators spend less time cold-calling leasing offices.",
                f"Assigned lots in {name} allow higher daily throughput than street scouting for one-off jobs.",
            ],
        ),
        pick(
            seed + "o2",
            [
                f"Serving {name} plus {nb_text} reduces windshield time across {county} County.",
                f"Exterior packages for {name} can be tuned for salt, pollen, and tree sap common in the region.",
                f"Buildings in {name} that pre-clear access make stops predictable for crew scheduling.",
            ],
        ),
    ]

    faqs = [
        {
            "question": pick(
                seed + "fq",
                [
                    f"Does Lavo work in {name} garden-style lots?",
                    f"Can {name} high-rise garages use Lavo?",
                    f"What parking types qualify in {name}?",
                ],
            ),
            "answer": pick(
                seed + "fa",
                [
                    f"Yes, when your {name} building approves private parking areas and an operator is active in {county} County. Surface spots and garages both work with clear labeling.",
                    f"Properties in {name} need management-approved service zones. Operators confirm access rules before the first wash day.",
                    f"Lavo supports assigned spots, podiums, and structured garages in {name} once ownership signs off on vendor access.",
                ],
            ),
        },
        {
            "question": f"How do {name} residents request launch?",
            "answer": f"Submit the building address on Lavo so demand is visible to property managers and operators serving {county} County.",
        },
        {
            "question": pick(
                seed + "fq2",
                [
                    f"Can one operator cover multiple {name} buildings?",
                    f"Do residents pay in the app?",
                    f"Is the building charged for Lavo?",
                ],
            ),
            "answer": pick(
                seed + "fa2",
                [
                    f"Yes. Route density improves when several {name} properties share a wash week.",
                    f"Residents in {name} pay for booked services in the app. Buildings add Lavo as a no cost amenity.",
                    f"Buildings in {name} are not charged for the program. Residents pay operators through Lavo for services they book.",
                ],
            ),
        },
    ]

    request = [
        f"Property managers in {name} can request onboarding with a lot or garage map and access contact.",
        pick(
            seed + "req",
            [
                f"Operators serving {county} County can add {name} to routes that already include {nb_text}.",
                f"Residents in {name} can submit their building address to flag demand while managers review operator options.",
                f"Start with one pilot property in {name}, then expand to sister assets nearby.",
            ],
        ),
    ]

    return {
        "slug": slug,
        "title": title,
        "description": description,
        "h1": h1,
        "opening": opening,
        "localName": name,
        "county": county,
        "countySlug": county_slug,
        "mobileCarWash": mobile,
        "residents": residents,
        "buildings": buildings,
        "propertyManagers": pms,
        "operators": operators,
        "faqs": faqs,
        "request": request,
    }


def emit_page(page: dict) -> str:
    faqs = ",\n".join(
        f"      {{ question: {json.dumps(f['question'])}, answer: {json.dumps(f['answer'])} }}"
        for f in page["faqs"]
    )
    return f"""  {{
    slug: {json.dumps(page['slug'])},
    title: {json.dumps(page['title'])},
    description: {json.dumps(page['description'])},
    h1: {json.dumps(page['h1'])},
    opening: {json.dumps(page['opening'])},
    localName: {json.dumps(page['localName'])},
    county: {json.dumps(page['county'])},
    countySlug: {json.dumps(page['countySlug'])},
    mobileCarWash: [
{ts_array(page['mobileCarWash'], '      ')}
    ],
    residents: [
{ts_array(page['residents'], '      ')}
    ],
    buildings: [
{ts_array(page['buildings'], '      ')}
    ],
    propertyManagers: [
{ts_array(page['propertyManagers'], '      ')}
    ],
    operators: [
{ts_array(page['operators'], '      ')}
    ],
    faqs: [
{faqs}
    ],
    request: [
{ts_array(page['request'], '      ')}
    ],
  }}"""


def main() -> None:
    manifest: list[dict] = json.loads(MANIFEST.read_text())
    overrides: dict[str, dict] = {}
    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text())

    by_county: dict[str, list[dict]] = {}
    for m in manifest:
        by_county.setdefault(m["countySlug"], []).append(m)

    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    for county_slug, munis in sorted(by_county.items()):
        munis = sorted(munis, key=lambda m: m["name"])
        pages = [
            build_page(m, munis, overrides.get(m["slug"]))
            for m in munis
        ]
        county_name = munis[0]["county"]
        export_name = "".join(w.capitalize() for w in county_slug.split("-")) + "CountyCities"
        body = ",\n".join(emit_page(p) for p in pages)
        content = f"""import type {{ CityPage }} from '../types';

export const {export_name}: CityPage[] = [
{body}
];
"""
        out = CONTENT_DIR / f"{county_slug}.ts"
        out.write_text(content)
        print(f"Wrote {out.name}: {len(pages)} cities")

    print("Done.")


if __name__ == "__main__":
    main()
