## BitCalculator – Obvious bugs and risky patterns

- **Crashes from thrown errors in UI paths**
  - [ ] Item-not-found causes hard crash instead of user-friendly fallback
    - `bitcraft-planner/src/components/RecipeResolverView.tsx` line ~31: `throw new Error(...)`
    - `bitcraft-planner/src/utils/recipeResolver.ts` line ~45: `throw new Error(...)`
  - [ ] Service-layer throws likely bubble to UI without graceful handling
    - `bitcraft-planner/src/services/settlementV2Service.ts` (e.g., ~490, ~624, ~653, ~698, ~957, ~961, ~1048)
    - `bitcraft-planner/src/utils/debugDatabase.ts` (e.g., ~734, ~787, ~808)
    - `bitcraft-planner/src/services/firebaseService.ts` (~225)

- **Dev/debug artifacts in production bundle**
  - [ ] Global window hooks exposed (security/behavioral risk)
    - `bitcraft-planner/src/App.tsx`: `(window as any).__setIsRestoring = ...`
    - `bitcraft-planner/src/utils/projectLogger.ts`: `(window as any).__projectLogger = projectLogger`
    - `bitcraft-planner/src/utils/debugDatabase.ts`: `emergencyProjectRecovery`, `adminProjectRecovery`, `immediateEmergencyRecovery` exported on `window`
    - `bitcraft-planner/src/components/DatabaseDebugger.tsx` references these globals
  - [ ] Excessive `console.log`/`console.error` in production-critical flows
    - `bitcraft-planner/src/App.tsx` has extensive logging throughout lifecycle (performance/noise/privacy)

- **Blocking browser dialogs (poor UX / automation-unfriendly)**
  - [ ] `alert`/`confirm` used in multiple components
    - Examples: `bitcraft-planner/src/components/DataManager.tsx`, `InventoryInput.tsx`, and others

- **Type-safety holes**
  - [ ] Widespread use of `any` reduces safety and hides bugs
    - Examples: `bitcraft-planner/src/App.tsx`, `components/*`, `utils/*`, `services/settlementV2Service.ts`, `types/NormalizedDatabase.ts`

- **Unfinished/legacy code present in repository**
  - [ ] Incomplete `.todo` modules left in `src/services` (unfinished features)
    - `bitcraft-planner/src/services/migrationService.ts.todo`
    - `bitcraft-planner/src/services/normalizedFirebaseService.ts.todo`
  - [ ] Legacy backups in `src/components` that can be accidentally imported
    - `SettlementInventory.tsx.bak`, `SettlementOverview.tsx.bak`, `TaskManagement.tsx.bak`

- **Suspicious input guards indicating upstream defects**
  - [ ] String literal checks for `'undefined'` suggest earlier serialization bugs
    - `bitcraft-planner/src/services/settlementV2Service.ts` checks `userId === 'undefined'` / `settlementId === 'undefined'`

- **Data/versioning risks**
  - [ ] Modified data file not committed and ad-hoc backup alongside it
    - `bitcraft-planner/public/data/recipes.json` (modified)
    - `bitcraft-planner/public/data/recipes.json.backup` (untracked)

### Quick remediation suggestions
- Replace UI `throw new Error` with user-facing fallbacks and error boundaries.
- Gate dev tools/logging behind an environment flag and remove global `window` hooks from production builds.
- Replace `alert/confirm` with non-blocking toasts/modals.
- Gradually eliminate `any`, starting with public interfaces and service boundaries.
- Remove or move `.bak`/`.todo` files outside `src` (or conditionally exclude from build).
- Trace and fix any source that can produce `'undefined'` string IDs; convert guards to proper undefined/null checks.
- Commit or revert `recipes.json`; store backups outside the app bundle.


