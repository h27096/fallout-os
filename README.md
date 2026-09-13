# Fallout OS — Personal Apps v0.6

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
