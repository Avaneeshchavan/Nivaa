# N1 search performance

Local PostgreSQL-compatible PGlite/WASM scale check; synthetic fixture, never uploaded to clinic DB.

Rows: 250,007. Ten synthetic name families, 500 company variants, shared synthetic composition; seven explicitly labeled probe brands. This is not a substitute for the actual source distribution.

Samples: 150 after two warmups per query. SQL p95: 7.08 ms. Target: <150 ms; result: PASS. Excludes Auth, network, route serialization, typing debounce and browser rendering.

EXPLAIN below executes the exact application SQL. Candidate lookup uses a SQL function with local pg_trgm settings; its internal indexes are not expanded in this outer plan.

```text
Limit  (cost=7917.31..7934.31 rows=20 width=404) (actual time=1.061..1.087 rows=1 loops=1)
  Buffers: shared hit=45
  ->  Result  (cost=7917.31..8272.61 rows=418 width=404) (actual time=1.058..1.082 rows=1 loops=1)
        Buffers: shared hit=45
        ->  Sort  (cost=7917.31..7918.36 rows=418 width=405) (actual time=1.051..1.072 rows=1 loops=1)
              Sort Key: (CASE WHEN ((b."nameNormalized" = 'ondem md'::text) OR EXISTS(SubPlan 4)) THEN 0 WHEN (b."nameNormalized" ~~ 'ondem md%'::text) THEN 1 WHEN (NOT EXISTS(SubPlan 6)) THEN 2 WHEN (COALESCE(p."isFavorite", false) OR (COALESCE(p."useCount", 0) > 0)) THEN 3 WHEN (nivaa_brand_similarity('ondem md'::text, b."nameNormalized") >= '0.45'::double precision) THEN 4 ELSE 5 END), (COALESCE(p."isFavorite", false)) DESC, (COALESCE(p."useCount", 0)) DESC, p."lastUsedAt" DESC NULLS LAST, (nivaa_brand_similarity('ondem md'::text, b."nameNormalized")) DESC, b."nameNormalized", b.id
              Sort Method: quicksort  Memory: 17kB
              Buffers: shared hit=45
              ->  Nested Loop Left Join  (cost=27.29..7906.19 rows=418 width=405) (actual time=1.037..1.060 rows=1 loops=1)
                    Join Filter: (p."brandId" = b.id)
                    Buffers: shared hit=45
                    ->  Nested Loop  (cost=27.29..7673.15 rows=418 width=339) (actual time=0.990..1.010 rows=1 loops=1)
                          Buffers: shared hit=45
                          ->  HashAggregate  (cost=26.87..36.90 rows=1003 width=32) (actual time=0.945..0.960 rows=1 loops=1)
                                Group Key: nivaa_brand_candidates.id
                                Batches: 1  Memory Usage: 57kB
                                Buffers: shared hit=41
                                ->  Append  (cost=0.25..24.37 rows=1003 width=32) (actual time=0.915..0.947 rows=1 loops=1)
                                      Buffers: shared hit=41
                                      ->  Function Scan on nivaa_brand_candidates  (cost=0.25..10.25 rows=1000 width=32) (actual time=0.908..0.909 rows=1 loops=1)
                                            Buffers: shared hit=41
                                      ->  Subquery Scan on "*SELECT* 2"  (cost=9.08..9.09 rows=1 width=32) (actual time=0.011..0.016 rows=0 loops=1)
                                            ->  Sort  (cost=9.08..9.09 rows=1 width=37) (actual time=0.009..0.014 rows=0 loops=1)
                                                  Sort Key: p_1."brandId"
                                                  Sort Method: quicksort  Memory: 17kB
                                                  ->  Limit  (cost=9.07..9.07 rows=1 width=37) (actual time=0.007..0.010 rows=0 loops=1)
                                                        ->  Sort  (cost=9.07..9.07 rows=1 width=37) (actual time=0.005..0.008 rows=0 loops=1)
                                                              Sort Key: p_1."isFavorite" DESC, p_1."useCount" DESC
                                                              Sort Method: quicksort  Memory: 17kB
                                                              ->  Nested Loop  (cost=0.42..9.06 rows=1 width=37) (actual time=0.003..0.004 rows=0 loops=1)
                                                                    ->  Seq Scan on "DoctorMedicinePref" p_1  (cost=0.00..0.00 rows=1 width=37) (actual time=0.002..0.002 rows=0 loops=1)
                                                                          Filter: ("doctorId" = 'fixture-doctor'::text)
                                                                    ->  Index Scan using "Brand_pkey" on "Brand" b_1  (cost=0.42..8.44 rows=1 width=12) (never executed)
                                                                          Index Cond: (id = p_1."brandId")
                                                                          Filter: ("searchText" ~~* '%ondem%'::text)
                                      ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                                            One-Time Filter: false
                                      ->  Subquery Scan on "*SELECT* 4"  (cost=0.01..0.02 rows=1 width=32) (actual time=0.005..0.008 rows=0 loops=1)
                                            ->  Limit  (cost=0.01..0.02 rows=1 width=64) (actual time=0.004..0.006 rows=0 loops=1)
                                                  ->  Sort  (cost=0.01..0.02 rows=0 width=64) (actual time=0.003..0.004 rows=0 loops=1)
                                                        Sort Key: "nameNormalized"
                                                        Sort Method: quicksort  Memory: 17kB
                                                        ->  Result  (cost=0.00..0.00 rows=0 width=0) (actual time=0.001..0.001 rows=0 loops=1)
                                                              One-Time Filter: false
                          ->  Index Scan using "Brand_pkey" on "Brand" b  (cost=0.42..7.61 rows=1 width=339) (actual time=0.021..0.023 rows=1 loops=1)
                                Index Cond: (id = nivaa_brand_candidates.id)
                                Filter: ((NOT "isDiscontinued") AND (NOT EXISTS(SubPlan 7)) AND ((NOT EXISTS(SubPlan 8)) OR (nivaa_brand_similarity('ondem md'::text, "nameNormalized") >= '0.45'::double precision) OR EXISTS(SubPlan 9)))
                                Buffers: shared hit=4
                                SubPlan 7
                                  ->  Function Scan on unnest t_2  (cost=0.00..0.05 rows=2 width=0) (actual time=0.005..0.005 rows=0 loops=1)
                                        Filter: ((t ~ '[0-9]'::text) AND (((' '::text || b."nameNormalized") || ' '::text) !~~ (('% '::text || t) || ' %'::text)))
                                        Rows Removed by Filter: 2
                                SubPlan 8
                                  ->  Function Scan on unnest t_3  (cost=0.00..0.03 rows=1 width=0) (actual time=0.004..0.004 rows=0 loops=1)
                                        Filter: (POSITION((t) IN (b."searchText")) = 0)
                                        Rows Removed by Filter: 2
                                SubPlan 9
                                  ->  Seq Scan on "BrandAlias" a_2  (cost=0.00..0.00 rows=1 width=0) (never executed)
                                        Filter: (("aliasNormalized" ~~ 'ondem md%'::text) AND ("brandId" = b.id))
                    ->  Seq Scan on "DoctorMedicinePref" p  (cost=0.00..0.00 rows=1 width=314) (actual time=0.001..0.002 rows=0 loops=1)
                          Filter: ("doctorId" = 'fixture-doctor'::text)
                    SubPlan 4
                      ->  Seq Scan on "BrandAlias" a_1  (cost=0.00..0.00 rows=1 width=0) (actual time=0.002..0.002 rows=0 loops=1)
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
  Buffers: shared hit=19
Planning Time: 1.165 ms
Execution Time: 1.246 ms
```

Authenticated HTTP and physical-iPad measurements remain pending.
