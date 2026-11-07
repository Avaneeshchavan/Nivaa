# N1 search performance

Local PostgreSQL-compatible PGlite/WASM scale check; synthetic fixture, never uploaded to clinic DB.

Rows: 250,007. Ten synthetic name families, 500 company variants, shared synthetic composition; seven explicitly labeled probe brands. This is not a substitute for the actual source distribution.

Samples: 150 after two warmups per query. SQL p95: 10.37 ms. Target: <150 ms; result: PASS. Excludes Auth, network, route serialization, typing debounce and browser rendering.

EXPLAIN below executes the exact application SQL. Candidate lookup uses a SQL function with local pg_trgm settings; its internal indexes are not expanded in this outer plan.

```text
Limit  (cost=7975.77..7992.77 rows=20 width=431) (actual time=1.756..1.795 rows=1 loops=1)
  Buffers: shared hit=45
  ->  Result  (cost=7975.77..8153.42 rows=209 width=431) (actual time=1.752..1.788 rows=1 loops=1)
        Buffers: shared hit=45
        ->  Sort  (cost=7975.77..7976.30 rows=209 width=432) (actual time=1.741..1.773 rows=1 loops=1)
              Sort Key: (CASE WHEN ((b."nameNormalized" = 'ondem md'::text) OR EXISTS(SubPlan 4)) THEN 0 WHEN (b."nameNormalized" ~~ 'ondem md%'::text) THEN 1 WHEN (NOT EXISTS(SubPlan 6)) THEN 2 WHEN (COALESCE(p."isFavorite", false) OR (COALESCE(p."useCount", 0) > 0)) THEN 3 WHEN (nivaa_brand_similarity('ondem md'::text, b."nameNormalized") >= '0.45'::double precision) THEN 4 ELSE 5 END), (COALESCE(p."isFavorite", false)) DESC, (COALESCE(p."useCount", 0)) DESC, p."lastUsedAt" DESC NULLS LAST, (nivaa_brand_similarity('ondem md'::text, b."nameNormalized")) DESC, b."nameNormalized", b.id
              Sort Method: quicksort  Memory: 17kB
              Buffers: shared hit=45
              ->  Nested Loop Left Join  (cost=27.29..7970.21 rows=209 width=432) (actual time=1.715..1.754 rows=1 loops=1)
                    Join Filter: (p."brandId" = b.id)
                    Buffers: shared hit=45
                    ->  Nested Loop  (cost=27.29..7853.69 rows=209 width=366) (actual time=1.634..1.666 rows=1 loops=1)
                          Buffers: shared hit=45
                          ->  HashAggregate  (cost=26.87..36.90 rows=1003 width=32) (actual time=1.544..1.567 rows=1 loops=1)
                                Group Key: nivaa_brand_candidates.id
                                Batches: 1  Memory Usage: 57kB
                                Buffers: shared hit=41
                                ->  Append  (cost=0.25..24.37 rows=1003 width=32) (actual time=1.494..1.541 rows=1 loops=1)
                                      Buffers: shared hit=41
                                      ->  Function Scan on nivaa_brand_candidates  (cost=0.25..10.25 rows=1000 width=32) (actual time=1.486..1.488 rows=1 loops=1)
                                            Buffers: shared hit=41
                                      ->  Subquery Scan on "*SELECT* 2"  (cost=9.08..9.09 rows=1 width=32) (actual time=0.016..0.024 rows=0 loops=1)
                                            ->  Sort  (cost=9.08..9.09 rows=1 width=37) (actual time=0.014..0.021 rows=0 loops=1)
                                                  Sort Key: p_1."brandId"
                                                  Sort Method: quicksort  Memory: 17kB
                                                  ->  Limit  (cost=9.07..9.07 rows=1 width=37) (actual time=0.010..0.015 rows=0 loops=1)
                                                        ->  Sort  (cost=9.07..9.07 rows=1 width=37) (actual time=0.008..0.012 rows=0 loops=1)
                                                              Sort Key: p_1."isFavorite" DESC, p_1."useCount" DESC
                                                              Sort Method: quicksort  Memory: 17kB
                                                              ->  Nested Loop  (cost=0.42..9.06 rows=1 width=37) (actual time=0.004..0.006 rows=0 loops=1)
                                                                    ->  Seq Scan on "DoctorMedicinePref" p_1  (cost=0.00..0.00 rows=1 width=37) (actual time=0.002..0.003 rows=0 loops=1)
                                                                          Filter: ("doctorId" = 'fixture-doctor'::text)
                                                                    ->  Index Scan using "Brand_pkey" on "Brand" b_1  (cost=0.42..8.44 rows=1 width=12) (never executed)
                                                                          Index Cond: (id = p_1."brandId")
                                                                          Filter: ("searchText" ~~* '%ondem%'::text)
                                      ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.001..0.002 rows=0 loops=1)
                                            One-Time Filter: false
                                      ->  Subquery Scan on "*SELECT* 4"  (cost=0.01..0.02 rows=1 width=32) (actual time=0.008..0.012 rows=0 loops=1)
                                            ->  Limit  (cost=0.01..0.02 rows=1 width=64) (actual time=0.006..0.009 rows=0 loops=1)
                                                  ->  Sort  (cost=0.01..0.02 rows=0 width=64) (actual time=0.004..0.006 rows=0 loops=1)
                                                        Sort Key: "nameNormalized"
                                                        Sort Method: quicksort  Memory: 17kB
                                                        ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.001..0.002 rows=0 loops=1)
                                                              One-Time Filter: false
                          ->  Index Scan using "Brand_pkey" on "Brand" b  (cost=0.42..7.79 rows=1 width=366) (actual time=0.055..0.062 rows=1 loops=1)
                                Index Cond: (id = nivaa_brand_candidates.id)
                                Filter: ((NOT "isDiscontinued") AND (NOT EXISTS(SubPlan 9)) AND (NOT EXISTS(SubPlan 7)) AND ((NOT EXISTS(SubPlan 10)) OR (nivaa_brand_similarity('ondem md'::text, "nameNormalized") >= '0.45'::double precision) OR EXISTS(SubPlan 11)))
                                Buffers: shared hit=4
                                SubPlan 9
                                  ->  Function Scan on unnest t_3  (cost=0.00..0.07 rows=1 width=0) (actual time=0.019..0.021 rows=0 loops=1)
                                        Filter: ((NOT EXISTS(SubPlan 8)) AND ((t ~ '[0-9]'::text) OR (t = ANY ('{md,lc,sr,xr,dsr,forte,plus}'::text[]))) AND (((' '::text || b."nameNormalized") || ' '::text) !~~ (('% '::text || t) || ' %'::text)))
                                        Rows Removed by Filter: 2
                                        SubPlan 8
                                          ->  Seq Scan on "BrandAlias" a_2  (cost=0.00..0.00 rows=1 width=0) (actual time=0.001..0.002 rows=0 loops=2)
                                                Filter: (("brandId" = b.id) AND (((' '::text || "aliasNormalized") || ' '::text) ~~ (('% '::text || t_3.t) || ' %'::text)))
                                SubPlan 7
                                  ->  Function Scan on unnest t_2  (cost=0.03..0.14 rows=1 width=0) (actual time=0.011..0.012 rows=0 loops=1)
                                        Filter: ((rtrim(t, 's'::text) = ANY ('{tablet,capsule,syrup,suspension,drop,injection,ointment,cream,gel,inhaler,powder,sachet}'::text[])) AND ((b.form)::text <> CASE WHEN (rtrim(t, 's'::text) = 'drop'::text) THEN 'DROPS'::text ELSE upper(rtrim(t, 's'::text)) END) AND (POSITION((((' '::text || t) || ' '::text)) IN (((' '::text || lower(b."formText")) || ' '::text))) <= 0))
                                        Rows Removed by Filter: 2
                                SubPlan 10
                                  ->  Function Scan on unnest t_4  (cost=0.00..0.03 rows=1 width=0) (actual time=0.005..0.006 rows=0 loops=1)
                                        Filter: (POSITION((t) IN (b."searchText")) = 0)
                                        Rows Removed by Filter: 2
                                SubPlan 11
                                  ->  Seq Scan on "BrandAlias" a_3  (cost=0.00..0.00 rows=1 width=0) (never executed)
                                        Filter: (("aliasNormalized" ~~ 'ondem md%'::text) AND ("brandId" = b.id))
                    ->  Seq Scan on "DoctorMedicinePref" p  (cost=0.00..0.00 rows=1 width=314) (actual time=0.002..0.002 rows=0 loops=1)
                          Filter: ("doctorId" = 'fixture-doctor'::text)
                    SubPlan 4
                      ->  Seq Scan on "BrandAlias" a_1  (cost=0.00..0.00 rows=1 width=0) (actual time=0.002..0.003 rows=0 loops=1)
                            Filter: (("brandId" = b.id) AND ("aliasNormalized" = 'ondem md'::text))
                    SubPlan 6
                      ->  Function Scan on unnest t_1  (cost=0.00..0.03 rows=1 width=0) (never executed)
                            Filter: (POSITION((t) IN (b."nameNormalized")) = 0)
        SubPlan 1
          ->  Seq Scan on "BrandAlias" a  (cost=0.00..0.00 rows=1 width=0) (actual time=0.001..0.002 rows=0 loops=1)
                Filter: (("brandId" = b.id) AND ("aliasNormalized" = 'ondem md'::text))
        SubPlan 3
          ->  Function Scan on unnest t  (cost=0.00..0.03 rows=1 width=0) (never executed)
                Filter: (POSITION((t) IN (b."nameNormalized")) = 0)
Planning:
  Buffers: shared hit=20
Planning Time: 2.653 ms
Execution Time: 2.064 ms
```

Authenticated HTTP and physical-iPad measurements remain pending.

## Hosted real-catalog verification

Counts: [{"source":"SEED_CDCI","system":"OTHER","records":93897},{"source":"LEGACY","system":"ALLOPATHY","records":202},{"source":"LEGACY","system":"AYUSH","records":65}]. Legacy Medicine rows retained: 267.
Database bytes: 229575827. Client-to-DB query round-trip p95: 95.13 ms over 130 warm samples. Includes local-machine network; excludes Supabase Auth, HTTP routing, debounce and rendering.
This is not an authenticated HTTP or iPad timing claim. All five new tables have RLS enabled and SELECT denied to both browser roles. No patient rows or clinical records were read.

| Query | Results (cap 20) | First source presentation |
| --- | --- | --- |
| ondem | 11 | Ondem 2 mg/5 mL oral solution |
| ondem md | 4 | Ondem-Md 4 mg oral tablet |
| ondem 4 | 6 | Ondem 4 mg oral tablet |
| uprise | 1 | Uprise D3 600000 iu/ml solution for injection |
| uprise d3 | 1 | Uprise D3 600000 iu/ml solution for injection |
| aciloc | 5 | Aciloc 150 mg oral tablet |
| aciloc 300 | 1 | Aciloc 300 mg oral tablet |
| pan 40 | 20 | Pan 40 mg gastro-resistant oral tablet |
| dolo 650 | 3 | Dolo 650 mg oral tablet |
| azithral | 15 | Azithral 10 mg/mL eye drops |
| montair lc | 3 | Montair LC 5 mg + 10 mg oral tablet |
| ondansetron | 20 | Ondansetron 2 mg/5 mL |
| alkem | 20 | Alkem Amoxicillin 250 mg oral capsule |

Application SQL EXPLAIN:
```text
Limit  (cost=7906.62..7985.12 rows=20 width=652) (actual time=3.258..3.280 rows=4 loops=1)
  Buffers: shared hit=242
  ->  Result  (cost=7906.62..8726.94 rows=209 width=652) (actual time=3.256..3.277 rows=4 loops=1)
        Buffers: shared hit=242
        ->  Sort  (cost=7906.62..7907.14 rows=209 width=653) (actual time=2.988..2.998 rows=4 loops=1)
              Sort Key: (CASE WHEN ((b."nameNormalized" = 'ondem md'::text) OR (ANY (b.id = (hashed SubPlan 5).col1))) THEN 0 WHEN (b."nameNormalized" ~~ 'ondem md%'::text) THEN 1 WHEN (NOT EXISTS(SubPlan 6)) THEN 2 WHEN (COALESCE(p."isFavorite", false) OR (COALESCE(p."useCount", 0) > 0)) THEN 3 WHEN (nivaa_brand_similarity('ondem md'::text, b."nameNormalized") >= '0.45'::double precision) THEN 4 ELSE 5 END), (COALESCE(p."isFavorite", false)) DESC, (COALESCE(p."useCount", 0)) DESC, p."lastUsedAt" DESC NULLS LAST, (nivaa_brand_similarity('ondem md'::text, b."nameNormalized")) DESC, b."nameNormalized", b.id
              Sort Method: quicksort  Memory: 28kB
              Buffers: shared hit=212
              ->  Nested Loop Left Join  (cost=23.90..7901.06 rows=209 width=653) (actual time=2.548..2.976 rows=4 loops=1)
                    Join Filter: (p."brandId" = b.id)
                    Buffers: shared hit=212
                    ->  Nested Loop  (cost=23.75..7460.31 rows=209 width=587) (actual time=2.248..2.605 rows=4 loops=1)
                          Buffers: shared hit=180
                          ->  HashAggregate  (cost=23.33..33.37 rows=1004 width=32) (actual time=2.200..2.218 rows=11 loops=1)
                                Group Key: nivaa_brand_candidates.id
                                Batches: 1  Memory Usage: 73kB
                                Buffers: shared hit=114
                                ->  Append  (cost=0.25..20.82 rows=1004 width=32) (actual time=2.167..2.193 rows=11 loops=1)
                                      Buffers: shared hit=114
                                      ->  Function Scan on nivaa_brand_candidates  (cost=0.25..10.25 rows=1000 width=32) (actual time=2.166..2.167 rows=11 loops=1)
                                            Buffers: shared hit=112
                                      ->  Subquery Scan on "*SELECT* 2"  (cost=3.02..5.54 rows=2 width=32) (actual time=0.012..0.014 rows=0 loops=1)
                                            Buffers: shared hit=2
                                            ->  Limit  (cost=3.02..5.54 rows=2 width=37) (actual time=0.011..0.013 rows=0 loops=1)
                                                  Buffers: shared hit=2
                                                  ->  Incremental Sort  (cost=3.02..5.54 rows=2 width=37) (actual time=0.010..0.012 rows=0 loops=1)
                                                        Sort Key: p_1."isFavorite" DESC, p_1."useCount" DESC
                                                        Presorted Key: p_1."isFavorite"
                                                        Full-sort Groups: 1  Sort Method: quicksort  Average Memory: 25kB  Peak Memory: 25kB
                                                        Buffers: shared hit=2
                                                        ->  Nested Loop  (cost=0.56..5.45 rows=1 width=37) (actual time=0.005..0.006 rows=0 loops=1)
                                                              Buffers: shared hit=2
                                                              ->  Index Scan Backward using "DoctorMedicinePref_doctorId_isFavorite_lastUsedAt_idx" on "DoctorMedicinePref" p_1  (cost=0.15..2.37 rows=1 width=37) (actual time=0.005..0.005 rows=0 loops=1)
                                                                    Index Cond: ("doctorId" = '<active-doctor>'::text)
                                                                    Buffers: shared hit=2
                                                              ->  Index Scan using "Brand_pkey" on "Brand" b_1  (cost=0.42..2.64 rows=1 width=70) (never executed)
                                                                    Index Cond: (id = p_1."brandId")
                                                                    Filter: ("searchText" ~~* '%ondem%'::text)
                                      ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.000..0.001 rows=0 loops=1)
                                            One-Time Filter: false
                                      ->  Subquery Scan on "*SELECT* 4"  (cost=0.01..0.02 rows=1 width=32) (actual time=0.004..0.005 rows=0 loops=1)
                                            ->  Limit  (cost=0.01..0.02 rows=1 width=64) (actual time=0.004..0.004 rows=0 loops=1)
                                                  ->  Sort  (cost=0.01..0.02 rows=0 width=64) (actual time=0.003..0.003 rows=0 loops=1)
                                                        Sort Key: "nameNormalized"
                                                        Sort Method: quicksort  Memory: 25kB
                                                        ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                                                              One-Time Filter: false
                          ->  Index Scan using "Brand_pkey" on "Brand" b  (cost=0.42..7.40 rows=1 width=587) (actual time=0.034..0.034 rows=0 loops=11)
                                Index Cond: (id = nivaa_brand_candidates.id)
                                Filter: ((NOT "isDiscontinued") AND (NOT EXISTS(SubPlan 7)) AND ((NOT EXISTS(SubPlan 10)) OR (nivaa_brand_similarity('ondem md'::text, "nameNormalized") >= '0.45'::double precision) OR EXISTS(SubPlan 11)) AND (NOT EXISTS(SubPlan 9)))
                                Rows Removed by Filter: 1
                                Buffers: shared hit=66
                                SubPlan 7
                                  ->  Function Scan on unnest t_2  (cost=0.03..0.14 rows=1 width=0) (actual time=0.002..0.002 rows=0 loops=11)
                                        Filter: ((rtrim(t, 's'::text) = ANY ('{tablet,capsule,syrup,suspension,drop,injection,ointment,cream,gel,inhaler,powder,sachet}'::text[])) AND ((b.form)::text <> CASE WHEN (rtrim(t, 's'::text) = 'drop'::text) THEN 'DROPS'::text ELSE upper(rtrim(t, 's'::text)) END) AND (POSITION((((' '::text || t) || ' '::text)) IN (((' '::text || lower(b."formText")) || ' '::text))) <= 0))
                                        Rows Removed by Filter: 2
                                SubPlan 10
                                  ->  Function Scan on unnest t_4  (cost=0.00..0.03 rows=1 width=0) (actual time=0.001..0.001 rows=1 loops=11)
                                        Filter: (POSITION((t) IN (b."searchText")) = 0)
                                        Rows Removed by Filter: 1
                                SubPlan 11
                                  ->  Index Only Scan using "BrandAlias_pkey" on "BrandAlias" a_3  (cost=0.42..1.54 rows=1 width=0) (never executed)
                                        Index Cond: ("brandId" = b.id)
                                        Filter: ("aliasNormalized" ~~ 'ondem md%'::text)
                                        Heap Fetches: 0
                                SubPlan 9
                                  ->  Function Scan on unnest t_3  (cost=0.00..3.17 rows=1 width=0) (actual time=0.010..0.010 rows=1 loops=11)
                                        Filter: (((t ~ '[0-9]'::text) OR (t = ANY ('{md,lc,sr,xr,dsr,forte,plus}'::text[]))) AND (((' '::text || b."nameNormalized") || ' '::text) !~~ (('% '::text || t) || ' %'::text)) AND (NOT EXISTS(SubPlan 8)))
                                        Rows Removed by Filter: 1
                                        Buffers: shared hit=22
                                        SubPlan 8
                                          ->  Index Only Scan using "BrandAlias_pkey" on "BrandAlias" a_2  (cost=0.42..1.55 rows=1 width=0) (actual time=0.010..0.010 rows=0 loops=7)
                                                Index Cond: ("brandId" = b.id)
                                                Filter: (((' '::text || "aliasNormalized") || ' '::text) ~~ (('% '::text || t_3.t) || ' %'::text))
                                                Rows Removed by Filter: 1
                                                Heap Fetches: 0
                                                Buffers: shared hit=22
                    ->  Materialize  (cost=0.15..2.37 rows=1 width=314) (actual time=0.001..0.001 rows=0 loops=4)
                          Buffers: shared hit=2
                          ->  Index Scan using "DoctorMedicinePref_pkey" on "DoctorMedicinePref" p  (cost=0.15..2.37 rows=1 width=314) (actual time=0.002..0.003 rows=0 loops=1)
                                Index Cond: ("doctorId" = '<active-doctor>'::text)
                                Buffers: shared hit=2
                    SubPlan 5
                      ->  Bitmap Heap Scan on "BrandAlias" a_1  (cost=27.31..29.53 rows=2 width=71) (actual time=0.206..0.209 rows=3 loops=1)
                            Recheck Cond: ("aliasNormalized" = 'ondem md'::text)
                            Heap Blocks: exact=3
                            Buffers: shared hit=30
                            ->  Bitmap Index Scan on "BrandAlias_aliasNormalized_idx"  (cost=0.00..27.31 rows=2 width=0) (actual time=0.199..0.199 rows=3 loops=1)
                                  Index Cond: ("aliasNormalized" = 'ondem md'::text)
                                  Buffers: shared hit=27
                    SubPlan 6
                      ->  Function Scan on unnest t_1  (cost=0.00..0.03 rows=1 width=0) (actual time=0.004..0.004 rows=0 loops=1)
                            Filter: (POSITION((t) IN (b."nameNormalized")) = 0)
                            Rows Removed by Filter: 2
        SubPlan 2
          ->  Bitmap Heap Scan on "BrandAlias" a  (cost=27.31..29.53 rows=2 width=71) (actual time=0.253..0.256 rows=3 loops=1)
                Recheck Cond: ("aliasNormalized" = 'ondem md'::text)
                Heap Blocks: exact=3
                Buffers: shared hit=30
                ->  Bitmap Index Scan on "BrandAlias_aliasNormalized_idx"  (cost=0.00..27.31 rows=2 width=0) (actual time=0.247..0.247 rows=3 loops=1)
                      Index Cond: ("aliasNormalized" = 'ondem md'::text)
                      Buffers: shared hit=27
        SubPlan 3
          ->  Function Scan on unnest t  (cost=0.00..0.03 rows=1 width=0) (actual time=0.005..0.005 rows=0 loops=1)
                Filter: (POSITION((t) IN (b."nameNormalized")) = 0)
                Rows Removed by Filter: 2
Planning:
  Buffers: shared hit=13
Planning Time: 1.571 ms
Execution Time: 3.501 ms
```
Token-index EXPLAIN:
```text
Limit  (cost=11.72..750.94 rows=600 width=70) (actual time=0.337..1.161 rows=600 loops=1)
  Buffers: shared hit=556
  ->  Bitmap Heap Scan on "Brand"  (cost=11.72..1472.92 rows=1186 width=70) (actual time=0.336..1.103 rows=600 loops=1)
        Recheck Cond: (to_tsvector('simple'::regconfig, "searchText") @@ '''ondansetron'''::tsquery)
        Heap Blocks: exact=552
        Buffers: shared hit=556
        ->  Bitmap Index Scan on "Brand_search_tokens_idx"  (cost=0.00..11.42 rows=1186 width=0) (actual time=0.216..0.217 rows=1169 loops=1)
              Index Cond: (to_tsvector('simple'::regconfig, "searchText") @@ '''ondansetron'''::tsquery)
              Buffers: shared hit=4
Planning:
  Buffers: shared hit=1
Planning Time: 0.154 ms
Execution Time: 1.222 ms
```
