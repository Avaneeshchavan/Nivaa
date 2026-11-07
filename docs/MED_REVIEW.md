# Medicine catalog review

This seed contains generic medicine names, formulation strengths, and forms only. It contains no dose, frequency, duration, indication, or prescribing recommendation. Each strength/form variant is one catalog record; the catalog is not 150 different active ingredients. Strength is included in `Medicine.name` because the model has no strength column.

Reference: [India National List of Essential Medicines 2022, hosted by WHO](https://cdn.who.int/media/docs/default-source/essential-medicines/national-essential-medicines-lists-(neml)/searo_neml/india-2022.pdf), especially sections 2, 6, 10, 16–18, 24 and 26. This is a source for catalog presentations, not evidence of current local availability. The seed is not a verbatim NLEM transcription.

## Doctor verification required

Please compare the full list in `prisma/medicine-catalog.ts` against the clinic's actual stock/formulary before clinical use. In particular, these supplemental presentations have not been confirmed from the reference's exact strength/form rows:

| Entries to check | Uncertainty to resolve |
|---|---|
| Aceclofenac, celecoxib, etoricoxib, naproxen and mefenamic acid | Confirm locally available strengths and forms. |
| Amoxicillin/clavulanic acid 875 mg + 125 mg; cefuroxime axetil; cefpodoxime proxetil; clarithromycin; levofloxacin; ofloxacin; tinidazole; nitrofurantoin | Confirm local oral formulations, salt naming and release type. |
| Ramipril, bisoprolol, chlorthalidone, rosuvastatin | Confirm strength variants and whether tablets/capsules match local products. |
| Glimepiride, gliclazide (including modified release), sitagliptin, vildagliptin, dapagliflozin, empagliflozin, pioglitazone, voglibose | Confirm exact formulation and strength variants used at the clinic. |
| Pantoprazole, rabeprazole, esomeprazole and famotidine oral forms | Confirm local presentations; the cited NLEM pantoprazole row is injectable, not the oral seed entry. |
| Aluminium hydroxide + magnesium hydroxide 250 mg + 250 mg/5 mL; sucralfate; lactulose; dicyclomine | Confirm concentration, active salt/compound quantities, and formulation against actual product labels. Antacid mixtures vary by product. |
| Levocetirizine, loratadine, fexofenadine, chlorpheniramine; dextromethorphan, guaifenesin, ambroxol, bromhexine | Confirm single-ingredient formulation availability and local restrictions. Combination cough/cold products are deliberately excluded. |
| Folic acid 1 mg, cyanocobalamin 50 mcg, zinc 20 mg elemental | Confirm available oral formulations and elemental-versus-compound strength conventions. |
| Diclofenac gel, terbinafine cream/tablet and levothyroxine | Confirm local product form and salt naming. |

For all entries: check salts (especially metoprolol and nitrofurantoin), release characteristics, inhaler strength per actuation, and liquid concentrations. Different release forms are separate entries. No brands or brand-to-generic equivalence have been inferred. Any correction to a seeded record should be made deliberately; re-running the seed preserves existing records rather than overwriting them.

## N1 NRCeS source review

Imported catalog records remain unverified for the clinic. Have the doctors review
the exact source name, form, composition and company. This package contains oral
and orodispersible Ondem MD records and only an injection presentation of Uprise
D3. No oral Uprise entry or dosing guidance has been invented. The source has no
discontinued flag and reports UNKNOWN marketing-license status; neither proves
current clinical suitability/approval. Supply actual top-100 brands, including
strength/form, to find coverage gaps before relying on the catalog in clinic.
