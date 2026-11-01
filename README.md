# Fallout OS — RobCo Calculator v0.7

## RobCo Calculator

Select **CALCULATOR** on the desktop or type `CALCULATOR` / `CALC` in the terminal. Edit expressions with the keyboard or keypad, then press Enter, `=`, or COMPUTE. Includes arithmetic, decimals, parentheses, clear and backspace. Escape closes with the shared window focus behavior; switching apps retains the current expression.

Scientific mode adds square root, powers (`^`), sine/cosine/tangent, pi, natural and base-10 logarithms. Trig defaults to degrees; choose radians as needed. Percent always divides the preceding value by 100 (`200*10% = 20`, `200+10% = 200.1`). Powers associate rightward, and `-2^2 = -4`; use `(-2)^2` for 4. Multiplication must be explicit. Results use JavaScript floating-point arithmetic and display 12 significant digits.

The controlled parser accepts only arithmetic and named math functions, limits expressions to 512 characters, and reports invalid expressions, division by zero and nonfinite results without adding failed calculations to history. No eval or dynamic code execution is used.

The latest 50 successful calculations and scientific/angle settings persist under the independent `robco.calculator.v1` key. Select a history row to restore its expression and angle mode. CLEAR HISTORY removes calculator history only. Damaged storage and conflicting writes are preserved; calculation continues in session memory if persistence fails. Existing app data is untouched.

Run `node --test *.test.cjs` with Playwright and Microsoft Edge available. Calculator parser and browser tests cover math precedence, scientific functions, invalid input, editing, history, persistence, focus and responsive geometry alongside the existing core regression suites.

Open `index.html` in a browser, or serve this directory with a static web server. Start the system, then select **HOLOTAPES** or **MUSIC / RADIO** directly on the desktop. Both also have shortcuts in **FILES**. Browser v0.2 is still available through **VAULTNET** or `BROWSER`.

## Files and terminal commands

- `FILES`: open the current terminal directory in the explorer.
- `DIR [path]`: list a directory, including locked folder indicators.
- `CD VAULT`, `CD ..`, `CD /`: change directory, go up, or return to root.
- `OPEN /VAULT/REACTOR.DAT`: display a file in the terminal and explorer.
- Legacy names such as `OPEN SECURITY.DAT`, `OPEN CLASSIFIED.DAT`, and `OPEN OVERSEER.LOG` resolve to the built-in records. Names and paths are case-insensitive; spaces and quoted paths work.

Click a folder to enter it or a file to edit it. NEW FILE accepts `.DAT` and `.LOG`; NEW FOLDER creates a directory. SAVE FILE preserves text exactly. RENAME and DELETE act on the open file, or the current folder when no file is open. Folders must be empty before deletion. Navigation and closing ask before discarding unsaved edits.

SYSTEM files, reactor/security status records, and the live Overseer log are read-only. Built-in folders and records cannot be renamed or deleted. CLASSIFIED, PERSONNEL, and LOGS require the existing `OVERSEER` / `PASSWORD` authorization. The log viewer reflects existing `WRITELOG` entries and lockdown status. Other terminal commands remain available.

## Storage and future desktop migration

`filesystem.js` owns paths, seed records, permissions, validation, and mutations. `explorer.js` connects that service to the UI and terminal. Persistence is injected through a `getItem` / `setItem` adapter; UI code does not serialize file records itself. An Electron implementation can replace this boundary with an asynchronous IPC adapter and retain the service contract, adding OS-level access checks in the main process.

Files use the versioned `robco.files.v1` localStorage key; existing `vaultLogs` remains separate. Data is local to the browser profile and site origin. Private browsing, changing origins, or clearing site storage can remove or hide saved files. There is no GitHub synchronization of user-created files. Each file is limited to 200,000 characters and browser storage quotas still apply.

Failed storage writes leave the in-memory filesystem unchanged and report NOT SAVED. Malformed or unavailable storage opens a read-only recovery view without overwriting the saved data. Conflicting writes from another tab require a reload before saving. Overseer clearance is an in-app role gate, not encryption or a security boundary against someone with browser developer tools; it resets on reload.

## Verification

Requires Node.js with `structuredClone` support. Run `node filesystem.test.cjs` for dependency-free service tests. For interaction tests, install Playwright in your development environment and ensure Microsoft Edge is available, then run `node browser.test.cjs` and `node explorer.test.cjs`. These tests serve the app locally and use isolated headless browser profiles; screenshots go to the OS temporary directory.

Coverage includes boot, terminal, browser navigation and blocked-frame fallback, Overseer login, logs, lockdown, filesystem CRUD, path resolution, persistence after reload, unsaved edits, protected records, quota rollback, stale writes, recovery from damaged storage, mobile overflow, duplicate IDs, and browser JavaScript errors.

## Existing Notes data

The standalone Notes app, desktop and Files launchers, terminal app command, and Notes copy buttons have been removed. Existing `/VAULT/NOTES/*.LOG` records remain untouched in `robco.files.v1`. Read or edit them in Files, or use Holotapes **COPY FROM FILE** with the full note path and SAVE to create an independent tape. The original note is preserved; no migration or storage deletion runs.

## Holotapes v0.5

Select HOLOTAPES or type `HOLOTAPES`. Saved tapes open in a read-only reader; EDIT TAPE switches to the editor, READ TAPE previews current text, and SAVE persists it. Tapes are plain-text `/VAULT/HOLOTAPES/*.DAT` records, intentionally compatible with Files and terminal OPEN. New tapes have no bundled copyrighted content.

COPY FROM FILE accepts a vault file path and respects Overseer permissions. Copies are independent, require SAVE, and never overwrite the source. Switching apps retains any draft in memory; closing, replacing a draft, or leaving the site guards unsaved text. `node holotapes.test.cjs` covers reading, editing, copies, permissions and persistence.

## Music / Radio v0.6

Select MUSIC / RADIO or type `RADIO` or `MUSIC`. Create, rename and delete named stations/playlists; add direct HTTP(S) audio/stream URLs or select local audio files. Use ADD MUSIC to select multiple local audio files. Click a playlist track to start it, or use the existing PLAY/PAUSE control. Empty and non-audio files are skipped with feedback; unsupported codecs report a playback error. Use previous/next, pause, seek for finite media, volume, mute, shuffle and repeat (off/playlist/track). Reorder or remove tracks. Closing Radio pauses playback; switching to Holotapes keeps audio playing until Radio is paused or closed.

The library starts empty. Only add media you own or have permission to access. No Fallout soundtrack or third-party stream is bundled. Video/website URLs do not work as audio sources. Network failures and unsupported formats report a signal error. Live streams may not offer seeking or a finite duration.

`robco.radio.v1` stores playlist metadata, selected station/track, volume, mute, shuffle and repeat. Playback position is not saved and reload never autoplays. Local files are played with temporary object URLs and never uploaded or written to localStorage. Reselect the same files after reload to reconnect their saved entries (matching name, size and modification time); modified files become new entries. Clearing browser site data deletes saved metadata. Radio shares the filesystem's failure policy: quota and stale-write errors preserve saved state; damaged storage is preserved for recovery instead of overwritten.

`radio-store.js` owns validated metadata and the replaceable storage adapter; `radio.js` owns browser audio and local-file handles. Electron can replace these boundaries with IPC-backed storage and media paths. Existing Overseer gates remain application role checks, not encryption.

Run `node radio-store.test.cjs` and `node radio.test.cjs`. The browser test generates its own short WAV signal and serves it locally; no external media is fetched. The complete regression suite is `filesystem.test.cjs`, `browser.test.cjs`, `explorer.test.cjs`, `records.test.cjs`, `holotapes.test.cjs`, `radio-store.test.cjs`, and `radio.test.cjs`. All browser suites use Playwright with Microsoft Edge.

## App access and playlist files

The Files toolbar opens Holotapes even when its library is empty. When a record in `/VAULT/HOLOTAPES` is selected, its corresponding shortcut opens that saved record in the app. Files keeps its plain-text editor. Unsaved changes are checked before transferring to an app. The fixed desktop app dock stays above every window, including on short screens.

Radio's **SAVE PLAYLIST TO FILES** creates a new `.DAT` record in `/VAULT/MUSIC`. It contains a versioned `robco.playlist` JSON document with station metadata and media references, not audio bytes. Existing files are never overwritten. **COPY PLAYLIST FROM FILE** imports a validated independent playlist; alternatively select that file in Files and press **MUSIC / RADIO**. Other Files locations simply open the player. Local media must still be reselected. Invalid files, denied clearance and storage errors leave the saved radio library intact.

Run `node app-access.test.cjs` for actual desktop launch clicks at desktop and short mobile sizes, Files-to-Holotapes reading, playlist export/import, reload persistence and malformed-playlist rollback.

## September 13 repository audit

At inspection, `main` ended at `491ea0f` (File Explorer v0.3). The separate `sprint/notes-holotapes-radio` branch already contained `602befa` (Notes), `1c26c48` (Holotapes), and `1e5faa5` (Music/Radio), including desktop buttons and tests. Those apps were implemented but had not reached main. The exact version loaded in a user's existing browser session cannot be inferred from repository history alone.

This follow-up retains all three original feature commits, adds explicit Files app shortcuts and playlist file integration, and prevents the terminal from overlapping desktop launchers on short screens. It does not change existing storage keys or rewrite user records. All eight suites above passed, including the existing Browser, Files, boot, terminal, Overseer, logs and lockdown regressions, and real local/URL WAV playback.


## Focused polish and bug-fix pass

- All five windows share sizing, focus stacking and close-focus recovery. The desktop dock switches apps without hiding drafts; close buttons and Escape retain the existing discard checks. Terminal can be closed and reopened from the dock. On small screens, content scrolls within the available window area and close controls remain reachable.
- The Logs shortcut lives in the terminal and invokes the existing command with its clearance check. They do not replace a pending password, log entry or typed command. The nonfunctional Settings placeholder was removed.
- Files reports unsaved changes and supports Ctrl/Cmd+S. The terminal scrolls to new output, ignores duplicate boot requests and preserves failed log-entry text.
- Overseer logs use the same stale-write and damaged-storage protections as the other stores. Storage keys remain `vaultLogs`, `robco.files.v1` (Files, Notes, Holotapes and exported playlists), and `robco.radio.v1` (Radio metadata/settings). No data migration is performed. Unsaved drafts, Overseer clearance, lockdown, browser navigation and playback position remain session-only.
- Radio retains track keyboard focus when redrawing, reports active playback or required local-file reselection on reopening, disables impossible reorder actions, and releases unused local audio URLs when a playlist is deleted. Closing pauses playback and invalidates pending playback feedback. Local music still stays on the device and must be reselected after reload.
- Detached browser frames no longer update current navigation feedback; controls share visible keyboard focus and reduced-motion preferences are respected.

Run `node --test *.test.cjs` with Playwright and Microsoft Edge available. The nine suites include `polish.test.cjs`, which checks duplicate boot prevention, window stacking, draft retention, close cancellation and focus, Files save feedback, terminal shortcuts, log conflicts/recovery, and 1280�720, 390�400 and 320�568 window geometry. Playback tests generate WAV audio locally. Browser embedding restrictions and codec support still depend on the browser/site.

## Functional app simplification

Based on polish commit `ecb6da5`, the desktop now contains Terminal, VaultNet Browser, Files, Holotapes and Music / Radio. Security, Reactor and Personnel have no app windows or launch buttons. Their existing terminal lore commands and built-in filesystem records remain for compatibility, with the same Overseer permissions. Shared window styling and record editor code remain in use by Holotapes and Radio. Storage keys, user holotapes, legacy notes, boot, Overseer and local music import are unchanged.

The nine regression suites include legacy Notes preservation and independent import into Holotapes, absence of removed launchers/windows, and shared editor checks in `records.test.cjs`.

## Windows desktop (Electron)

Install Node.js 22 LTS or newer (including npm), then in this directory run:

```powershell
npm ci
npm start
```

`npm run desktop` is an alias. The same HTML/CSS/JavaScript powers both versions.
For the website, run `npm run web` and open http://127.0.0.1:8080, or keep
hosting the root static assets as before. No web build step is required.

On Windows, run `npm ci`, then `npm run build:win` to create an x64 NSIS installer
and a complete no-install ZIP in `dist/`. Use `Fallout OS-0.8.1-Setup-x64.exe`
for normal installation and a desktop shortcut. Alternatively, extract **all** of
`Fallout OS-0.8.1-windows-x64.zip` into a permanent folder and launch `Fallout OS.exe`
there. Create a shortcut to that EXE; never move or copy the EXE by itself.
No Node.js installation is needed to run either packaged distribution.

`npm run pack:win` creates only the complete unpacked directory for development.
Both build commands remove this checkout's generated `dist/` first, never user
profiles or other builds. The after-pack check rejects missing/empty runtime
resources and verifies the app archive includes VaultNet v2. Run `npm run verify:win`
to repeat that check. Before delivery run both packaged smoke tests documented below.
Distribute the installer or entire ZIP, never a link to the inner EXE alone.

Electron 44.4.3 and electron-builder 26.15.3 remain pinned. These commands never
publish. The executables are unsigned and Windows may show an unknown-publisher
warning. No-install refers to installation, not portable user data.

If startup reports `Invalid file descriptor to ICU data received`, check that
`icudtl.dat`, the `.pak` files, `locales/`, DLLs and `resources/app.asar` are beside
the executable in the extracted/installed layout. Re-extract the complete ZIP
to a fresh folder instead of copying files from a different Electron version.
Do not delete your profile or older working build. A copied inner EXE is not
self-contained; see [Electron distribution](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)
and [Windows build targets](https://www.electron.build/v26/docs/api/app-builder-lib.interface.windowsconfiguration/).

The desktop stores data in its own Electron profile under `%APPDATA%/fallout-os`.
Existing browser data stays in the original browser and is not automatically
copied. Storage keys and file formats remain unchanged. File Explorer is still
the virtual vault filesystem. Local music import uses the existing file picker
and must be reselected after restart; audio is never uploaded.

Renderer Node integration is disabled; context isolation, sandboxing and web
security are enabled. The custom robco://app origin serves only root web assets.
Permissions and unsolicited popup windows are denied. CSP allows existing inline
handlers, but not eval. Do not disable web security to bypass site restrictions.
Keep Electron updated for Chromium security fixes.

Run `npm test` for the web regression suite (Microsoft Edge required).
Run `npm run test:desktop` for the Electron integration smoke test.

### Desktop browser compatibility

VaultNet Browser v2 uses an Electron 44 `WebContentsView`, owned by the main
process. Desktop pages, including YouTube, load as top-level remote webContents,
not iframes. RobCo's address bar, Go, Back, Forward, Reload, Home and Close remain
in the trusted app. HTTP(S) links, redirects and same-document history update
the controls. Ctrl+L returns from a remote page to the address bar. New-window
and target=_blank HTTP(S) links open in the current view; no independent popup
window receives app privileges. Home is a blank native history entry displaying
the local VaultNet welcome screen; Back can return to the previous page.

Remote pages have no preload, Node or Fallout OS APIs. They use a separate
`persist:vaultnet-v2` session, with context isolation, sandboxing and web security
enabled. That session cannot load app assets or local files. Permissions are
denied, including location, camera and microphone. IPC accepts only the exact
trusted app's main frame and exposes fixed navigation/layout operations, never
raw IPC or filesystem access. URL protocols, credentials and view bounds are
validated in the main process. Certificate errors and site security remain intact.

Switching apps hides and mutes the native view; returning restores it. Resizing
and minimizing synchronize its visibility and bounds. Close destroys remote
content and browsing history, while website cookies remain in the separate
profile partition. Reloading the app or exiting also disposes of the view.
Other apps and their stored data are unchanged.

Mail and telephone links require confirmation before opening an external app;
other non-web protocols are blocked. Downloads are canceled with a message to
use OPEN IN DEFAULT BROWSER. That button opens the current HTTP(S) address in
Windows' default browser. Sites requiring popup-based login, protected DRM,
unsupported codecs, special permissions or a supported browser may still need
that fallback. Authentication, DRM and certificate/security checks are never
bypassed. A successful YouTube page load does not guarantee every video or login
flow works in Electron.

The hosted web version retains its existing sandboxed iframe, entered-address
history and OPEN IN NEW TAB fallback. Desktop-only code activates only when the
narrow preload browser API is present; web hosting instructions are unchanged.

Run `npm run test:browser` for native navigation, anti-iframe, isolation and
window-lifecycle checks. `node tools/vaultnet-smoke.cjs --youtube` additionally
checks a live YouTube page (network access required). Add `--packaged` to test
the unpacked Windows build. Tests use temporary profiles, not normal app data.
Architecture references: [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)
and [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

### Tasks

The inspected upstream main (`40560b1`) and its only other branch did not contain
Tasks. This desktop branch adds it to both web and desktop: create/edit, complete,
delete, due dates, priorities, and All/Active/Completed filters. Open TASKS from the
dock or terminal. Data uses `robco.tasks.v1`; damaged, stale or failed storage
writes are preserved. Closing the panel retains the form until reload.

Desktop verification also supports `node tools/desktop-smoke.cjs --packaged`
after `npm run pack:win` or `npm run build:win`. Tests use temporary profiles and
never touch your normal app data. The desktop smoke covers Tasks creation,
editing, completion/filtering, persistence and damaged-data protection too.

To verify a delivered ZIP, extract it to a fresh folder, run
`node tools/verify-runtime.cjs "C:\path\to\extracted-folder"`, then set
`$env:FALLOUT_TEST_EXE = "C:\path\to\extracted-folder\Fallout OS.exe"` in PowerShell
and run `node tools/desktop-smoke.cjs --packaged` and
`node tools/vaultnet-smoke.cjs --packaged`. Both use temporary profiles. Remove the
override afterward with `Remove-Item Env:FALLOUT_TEST_EXE`.

## RobCo Clock & Calendar

Open CALENDAR on the desktop, or type CALENDAR / EVENTS in the terminal. TIME and DATE print local time/date. Select a day to browse its events; use the editor to save a title, local date/time and optional notes. EDIT and DELETE are available in the selected-day list and upcoming agenda. Closing the window keeps its draft; NEW / CANCEL EDIT clears it.

Events use the dedicated `robco.calendar.v1` localStorage key. Invalid saved data and conflicting writes are preserved rather than overwritten. All prior storage keys, Electron origin/profile, sandbox and Windows packaging settings remain unchanged.

Reminders are checked once per second while the renderer is running, including when the calendar window is closed. A due reminder raises the calendar with a persistent, dismissible in-app alert; VaultNet's native view is hidden by the existing stacking adapter. Native notifications are optional and permission-dependent (the current Electron permissions deny them, so in-app alerts remain the reliable fallback). No background service is installed: events that became due while Fallout OS was closed appear on their calendar date but do not generate retrospective alarms. Sleep or suspended execution can delay reminders until execution resumes. Dates are interpreted in the current local timezone; nonexistent daylight-saving times are rejected, and ambiguous fall-back times use JavaScript's first occurrence.

Validation: `node calendar.test.cjs`, `npm test`, `npm run test:desktop`, and `npm run test:browser`. Tests use isolated browser/Electron profiles.

## Settings and wallpapers (0.8.2)

Open SETTINGS in the desktop dock, or enter SETTINGS in the terminal. Choose Vault-Tec blue, RobCo terminal green, Wasteland, Classic black, or Original RobCo. Artwork is original SVG geometry embedded in the app; no game assets or remote requests. Fill covers the desktop, Fit shows the whole image, and Center uses its original size. Changes save automatically.

CHOOSE IMAGE FROM PC imports PNG, JPEG or WebP (up to 12 MB and 24 million pixels). Electron decodes the image to PNG and stores a private copy with the selection in `personalization/wallpaper.json` inside the existing Electron userData directory. Moving the original image does not affect the saved wallpaper. Images are not added to the repository or uploaded. Switching to a built-in keeps the custom copy available; RESTORE DEFAULT clears that copy, resets Fill, and restores the original #050505 RobCo desktop background. Other app data is untouched.

The web version stores the image in IndexedDB for this browser/site. Clearing site data or private browsing can remove it. Save/read errors are shown in Settings, canceled imports leave the selection intact, and damaged settings can be repaired with Restore Default.

Verification: `npm test`, `npm run test:settings`, `npm run test:desktop`, `npm run test:browser`. The settings smoke test uses temporary profiles and a mocked file picker with real decoding, IPC and disk storage; it checks a full Electron restart after deleting the original image. Pass `--packaged` to the smoke scripts to test the Windows distribution.

## 24-hour local clocks

The desktop top bar uses HH:mm; Clock & Calendar and terminal TIME use HH:mm:ss,
through the shared time-format.js formatter. All use PC local time, including midnight
as 00:00. Event entry and editing accept HH:mm (00:00–23:59), independent of the OS
12-hour input preference. Events, agenda and reminders retain their existing HH:mm
values. No saved events, timestamps, notification scheduling or time zones are migrated.

## RobCo System Search

Press Ctrl+Space anywhere in Fallout OS (including a native VaultNet page), or click SEARCH in the desktop top bar. Type an app name, file name/path, or holotape title. Use Up/Down to select, Enter to open, and Escape to return to your previous focus. Tab stays within the overlay. An empty query lists installed apps; search shows at most 100 matches and asks you to narrow larger result sets.

The index contains only built-in apps and the existing Fallout OS virtual filesystem, including saved holotapes. It does not scan PC disks, remote websites, unsaved drafts, or audio files that require reattachment. Clearance-protected names are excluded until Overseer access is granted; activation checks access again. The metadata index refreshes each time search opens. Existing editors retain their unsaved-change prompts. Search adds no storage keys or migrations.

Electron suppresses the native VaultNet view while search is open, even if layout updates arrive. Escape restores native focus when opened from a web page; launching another app respects normal stacking. In a regular browser the same overlay works with a modal dialog; when a cross-origin iframe owns keyboard focus, use the clickable SEARCH launcher.

Verification: npm run test:search (Electron and Edge, isolated profiles); node tools/search-smoke.cjs --packaged tests the Windows package.
