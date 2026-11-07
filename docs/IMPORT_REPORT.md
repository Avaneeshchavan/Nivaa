# N1 catalog import report

Mode: DATABASE IMPORT. Source: SEED_CDCI.
Attribution: NRCeS / C-DAC, Pune, CC BY 4.0 with supplied SNOMED/India conditions; owner confirmed applicable Affiliate License. Source entries normalized and linked for search. No clinical validation claimed.

Input: 93911; prepared: 93897; unique eligible: 93897; duplicate presentations merged: 0; discontinued skipped: 0.
Rejected/quarantined: 14; inserted this run: 0; already present on rerun: 93897.
Conservative preflight estimate (row JSON × 3): 212191140 bytes. DB bytes before: 229567635; after: 229575827; added: 8192.
This estimate is not a plan entitlement check. Import enforces a configurable database-size budget (default 450 MiB) and uses resumable transactional batches. No data is dropped to meet a budget.

NRCeS has no system/discontinued field: imported system OTHER, discontinuedKnown false. UNKNOWN marketing-license status is not interpreted as discontinued. Existing allopathic/Ayurvedic catalog preserved. Uprise D3 in this release is injection-only.

| Record | Reason |
| --- | --- |
| 93907 | BrandMaster.txt: Column count mismatch |
| 93910 | BrandMaster.txt: Column count mismatch |
| 4608 | BrandMaster.txt: Missing linked generic |
| 8422 | BrandMaster.txt: Missing linked generic |
| 10606 | BrandMaster.txt: Missing linked generic |
| 24069 | BrandMaster.txt: Missing linked generic |
| 25044 | BrandMaster.txt: Missing linked generic |
| 35622 | BrandMaster.txt: Missing linked generic |
| 53867 | BrandMaster.txt: Missing linked generic |
| 55559 | BrandMaster.txt: Missing linked generic |
| 93908 | BrandMaster.txt: Missing linked generic |
| 93909 | BrandMaster.txt: Missing linked generic |
| 93911 | BrandMaster.txt: Missing linked generic |
| 93912 | BrandMaster.txt: Missing linked generic |
