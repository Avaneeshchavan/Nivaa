# N2 performance budget and evidence

November 7, 2026. Target workflow: a doctor completes a typical four-medicine Rx on an iPad in under 60 seconds. That target is **not yet demonstrated**. Do not substitute Node model timings for device or authenticated HTTP timings.

| Measurement | Target | Result / evidence |
|---|---|---|
| Input to next paint, p95 | <100 ms | Browser measurement pending |
| First search input through fourth medicine added | <60 seconds | Doctor/device run pending |
| Save action round trip, p95 | <1 second warm local; record production separately | Authenticated measurement pending |
| React commit duration | Record median/p95; no whole form render per keystroke | Profiler installed; capture pending |
| Edit + validation + serialize + memory write, four medicines | Diagnostic only | 500 synthetic samples: median 0.093 ms, p95 0.123 ms |
| Same core diagnostic, 100 medicines | Diagnostic only | 500 synthetic samples: median 0.544 ms, p95 0.681 ms |
| Four synchronous store additions with quantity math | Diagnostic only | 0.211 ms; excludes searching, taps, rendering and saving |

Core run: `node scripts/benchmark-rx-core.cjs`, Node 22 on this developer Mac. Fifty warmup iterations precede each 500-sample group. The fake in-memory storage avoids persisting clinical data. Browser localStorage is synchronous and may be materially slower, especially with handwriting or a nearly full device. Results are a single run, not a comparative before/after benchmark.

## Implemented controls

- RxBuilder subscribes only to patient ID. Memoized diagnosis, advice, measurement, handwriting and medicine sections own their subscriptions. Medicine list subscribes to stable IDs with shallow equality; each memoized row selects its own medicine object.
- The Save bar separately validates changing content. Opening live PDF preview intentionally adds rendering work; preview remains opt-in. Diagnosis typing can rerender its own bounded template list; it does not rerender medicine rows.
- Search caches at most 60 doctor/query/system entries in memory, for 30 seconds. Cache invalidates after medicine preference/favorite/custom changes. No patient search data or durable medicine-result cache was added. A reload clears this cache. Network search retains debounce, cancellation and stale-response guards.
- Cloud saves debounce 1.5 seconds and serialize requests. Device backup is written immediately after valid content changes. History is capped at 20 actions. Support queries run in parallel, with diagnosis scan capped at the doctor's latest 200 prescriptions, 30 diagnosis results, 30 recent instructions and 300 snippets. Owned templates/preferences remain unpaginated; revisit if doctors create very large libraries.
- Production first-load JS for `/prescriptions/new`: 212 kB (Next build estimate). No dependency or auth changes.

## Reproduce the missing real measurements

1. Run `npm run dev`. Use only synthetic patients in an isolated development database and sign in normally; no auth bypass is provided.
2. Open the builder on the intended iPad or a desktop browser with a representative iPad viewport. Keep preview closed for the primary run. Select a synthetic patient, then start searching and add four medicines with explicit doctor-entered patterns/durations. Save a synthetic Rx.
3. Development builds wrap the builder in React Profiler. `window.__NIVAA_RX_METRICS__` contains at most 200 **numeric** samples with fixed names: `react-commit`, `input-to-next-paint-approx`, `four-medicines-first-search-to-fourth-add`, `save-action-round-trip`, `save-and-draft-cleanup`. No patient/medicine strings, IDs or field values are recorded. The last metric includes waiting for in-flight draft sync/deletion after the Rx is written; it excludes router rendering and PDF generation. No samples are sent to a server or persisted.
4. In browser developer tools, copy `JSON.stringify(window.__NIVAA_RX_METRICS__)`. Repeat at least 20 warm runs, reset by reopening the builder, and separately record cold load, preview-on and slow-network/offline behavior. Record browser/device and connection. The two-animation-frame input metric approximates presentation delay; it is not an Event Timing INP measurement. Profiler measures React commit work, not complete interaction latency. Development-mode results are not production guarantees.
5. For production save/network measurements use browser Network/Performance against a synthetic record, with no PHI in exported traces. Record real doctor completion time separately. No Playwright dependency was added.

The browser integration lists the signed-in tab but attaching still fails with `browser.user is unavailable`. Therefore no actual React Profiler samples, Playwright run, authenticated save timings or iPad completion times were collected. This acceptance item remains open in TASKS.md/BLOCKERS.md; N3 must wait for the user's review checkpoint.
