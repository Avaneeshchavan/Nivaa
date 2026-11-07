# N1 medicine-data source decision

Selected source: **NRCeS Common Drug Codes for India — Flat Files Package**, confirmed by the owner.

Status: **Package and License.txt not yet supplied; license UNVERIFIED; no production import performed.**
Checked November 7, 2026. Source selection remains the owner's decision.

| Candidate | Evidence | License / implementation status |
| --- | --- | --- |
| NRCeS Common Drug Codes for India, Flat Files Package | [Official national releases](https://www.nrces.in/services/national-releases), [download resources](https://www.nrces.in/resources). The official description says the package contains linked TSV masters for substances, brands, suppliers, forms and generic medicines. | **UNVERIFIED**: the applicable terms are inside the package's License.txt, which has not been supplied or reviewed. Availability does not establish unrestricted reuse. This is distinct from the terminology-integrated/SNOMED package. Exact file headers and joins must be inspected from the chosen release. |
| “Indian Medicine Dataset” mentioned in the V2 prompt | The prompt describes columns including id, name, manufacturer_name, type, pack_size_label and short_composition1/2, but identifies no exact repository, release or license file. | **UNVERIFIED**. Do not choose an arbitrary similarly named repository. Supply the exact source URL, release, provenance and license before importing. Do not scrape a commercial pharmacy site or assume a public download implies reuse rights. |
| Clinic-owned formulary | A list entered by the doctors from their own formulary, with brand/form/strength/company/composition explicitly reviewed by them. | Source ownership and any third-party restrictions still need confirmation. No external compositions or dosage guidance will be invented. Start with the actual 100 frequently used brands to measure coverage. |

The official download page lists newer releases than the June 2025 release quoted
in the review. No current row count or license permission is inferred from those
older release notes. Preserve release/version, original package and license for
traceability. Keep raw data locally under ignored data/brands/.

## Owner steps for the recommended official-source route

1. Open https://www.nrces.in/resources .
2. Find **Common Drug Codes for India**.
3. Choose **Get Common Drug Codes for India (Flat Files Package)**. Avoid selecting
   Terminology Integrated Package or DISB just because they appear alongside it.
4. Complete any site verification yourself. If terms or registration appear,
   review them before accepting; this task has not accepted any terms for you.
5. Download and extract the package locally. Keep its License.txt and release notes.
6. Put the extracted package under data/brands/nrces/ in this repository. This
   directory is ignored by Git. Tell Codex the local location and which source you
   selected. The package's actual headers and joins can then be implemented without
   guessed mappings. No need to paste credentials into chat.
7. Separately create data/brands/parents_top100.csv, with a `name` header and one
   brand as your parents write it per row. Names alone are sufficient for this
   coverage list; clinical dosing instructions are unnecessary.

The implemented preflight checker only inspects individual local CSV/TSV/JSON
files. An NRCeS master with unfamiliar headers is reported UNMAPPED, not imported
as if it were a flattened pharmacy dataset. The full relational importer, brand
schema, search ranking, preferences and UI integration are still N1 work.
