# RobCo App & Plugin System — v0.9.0

Built on local commit `f356893` (System Search). GitHub main was checked before
implementation and was at `40560b1`; it is an ancestor of the local desktop
milestones. This release retains those newer Electron, VaultNet v2, Windows
packaging, Calendar, Settings and 24-hour-clock changes.

## Delivered

* App Manager with built-in/installed lists and explicit native install confirmation.
* Enable/disable, uninstall confirmation, and desktop/System Search integration.
* Versioned offline packages, strict structural/path/size validation and an original
  installable Wasteland Supply Planner app.
* Separate sandboxed windows without a preload or privileged message API, opaque
  origins, restrictive CSP, request filtering and navigation/permission denial.
* Persistent installation state under Electron userData, atomic replacement,
  corruption recovery without overwriting damaged data, and a five-second startup
  timeout for apps that stall during loading.
* Creating/installing instructions and explicit v1 limitations in EXTENSIONS.md.

## Validation

* Full `npm test`: 19 tests passed, including existing built-in apps and saved-data
  behavior, 24-hour time, responsive layouts and new package/storage tests.
* Desktop, VaultNet Browser v2, Settings and System Search smoke suites passed.
  Settings and Search include web fallback checks.
* Real Electron extension lifecycle passed: cancelled install, invalid JSON,
  confirmed install, working sample, launcher/search indexing, disable, re-enable,
  uninstall and multiple process restarts with the same temporary profile.
* Isolation checks passed: no Node, process, desktop bridge or opener; desktop
  storage inaccessible; network/desktop fetch, popups, inline scripts and navigation
  blocked. Damaged extension registry remains unchanged and blocks imports.
* Windows x64 installer and full runtime ZIP built with the existing pipeline.
  Runtime verification now checks the extension assets as well as VaultNet.
* Packaged Electron lifecycle and desktop smoke checks run against the actual
  distribution. A deliberately infinite-looping startup app exercises timeout
  recovery and subsequent disable.
* App Manager and working sample screenshots visually reviewed.

Tests use isolated temporary profiles and do not migrate or reset the user's
existing data. Native dialog responses are mocked from test code; no bypass is
shipped. The installer wizard itself is not automated or run over the user's
existing installation. The installer is unsigned. This is not an independent
security audit. Extensions are offline and desktop-only, and app-internal UI
state is not persistent in v1; installation/enabled state is persistent.
