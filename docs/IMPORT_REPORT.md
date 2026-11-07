# N1 NRCeS package inspection

Offline package inspection only. No database import, migration or production search change occurred.

Source: CommonDrugCodesForIndia_FlatFilePackage.zip, supplied by the owner.
Attribution: NRCeS / Centre for Development of Advanced Computing (C-DAC), Pune.
License.txt SHA-256: e1a39033f281c2798c5457564500efddb4862500a03753bef534bec5c1236a91.
The supplied license identifies CC BY 4.0 and additional SNOMED/India conditions. See MED_DATA_SOURCES.md. No legal compliance certification is implied.

## Source inventory

- BrandMaster.txt: 93909 structurally valid rows.
- GenericMaster.txt: 10305 structurally valid rows.
- ProductMaster.txt: 72284 structurally valid rows.
- SupplierMaster.txt: 8213 structurally valid rows.
- DrugFormMaster.txt: 423 structurally valid rows.
- Joined brand records available for later mapping: 93897.
- Quarantined malformed or unjoinable records across tables: 14.
- Production records imported / duplicate records merged / database bytes added: 0 / 0 / 0.

## Query inventory

Whole-token presence across source brand/company/composition text. These are inventory counts, not ranked-search or typo-tolerance acceptance tests.

| Query | Matching source records |
| --- | --- |
| ondem | 7 |
| ondem md | 3 |
| ondem 4 | 3 |
| uprise | 1 |
| uprise d3 | 1 |
| aciloc | 4 |
| aciloc 300 | 1 |
| pan 40 | 25 |
| dolo 650 | 1 |
| azithral | 15 |
| montair lc | 3 |
| ondansetron | 1167 |
| alkem | 759 |

Important: the Uprise D3 entry in this package is a solution for injection. No oral formulation can be inferred from that record. Doctors must review the actual presentation they intend to use.

## Quarantine

| File | Record | Reason |
| --- | --- | --- |
| BrandMaster.txt | 93907 | Column count mismatch |
| BrandMaster.txt | 93910 | Column count mismatch |
| BrandMaster.txt | 4608 | Missing linked generic |
| BrandMaster.txt | 8422 | Missing linked generic |
| BrandMaster.txt | 10606 | Missing linked generic |
| BrandMaster.txt | 24069 | Missing linked generic |
| BrandMaster.txt | 25044 | Missing linked generic |
| BrandMaster.txt | 35622 | Missing linked generic |
| BrandMaster.txt | 53867 | Missing linked generic |
| BrandMaster.txt | 55559 | Missing linked generic |
| BrandMaster.txt | 93908 | Missing linked generic |
| BrandMaster.txt | 93909 | Missing linked generic |
| BrandMaster.txt | 93911 | Missing linked generic |
| BrandMaster.txt | 93912 | Missing linked generic |

License Status is the manufacturer/marketing-license field. All supplied brand records say UNKNOWN. It is not a discontinued flag or proof that a medicine is approved/current. Missing discontinued status is retained as unknown; no active or discontinued status is invented.

Generic Name is preserved verbatim as compositionText. This checker does not fabricate per-ingredient strengths, calculate doses, import clinical indications, or turn source text into clinical advice.

Remaining N1 work: relational model/migration, resumable importer, aliases/ranked database search, per-doctor learning, snapshot/UI integration, coverage and scale verification. N2 remains unstarted.
