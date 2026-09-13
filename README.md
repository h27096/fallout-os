# Fallout OS — File Explorer v0.3

Open `index.html` in a browser, or serve this directory with a static web server. Start the system, then select **FILES**. Browser v0.2 is still available through **VAULTNET** or `BROWSER`.

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

## Notes v0.4

Select NOTES or type `NOTES`. Create, search, edit, rename and delete personal logs. SAVE (or Ctrl/Cmd+S) persists the record; closing or switching records checks unsaved changes. VIEW IN FILES opens the same record in File Explorer. Notes live in `/VAULT/NOTES/*.LOG` with exact plain-text content and are accessible through `OPEN`. Titles follow filesystem naming rules and are normalized to uppercase. Rename saved titles with RENAME. Storage errors retain the draft, and edits made in Files are detected before overwriting a loaded note.

Run `node notes.test.cjs` for Notes interaction and persistence checks with the same Playwright setup above.

## Holotapes v0.5

Select HOLOTAPES or type `HOLOTAPES`. Saved tapes open in a read-only reader; EDIT TAPE switches to the editor, READ TAPE previews current text, and SAVE persists it. Tapes are plain-text `/VAULT/HOLOTAPES/*.DAT` records, intentionally compatible with Files and terminal OPEN. New tapes have no bundled copyrighted content.

COPY TO HOLOTAPE in Notes copies the current text into a new tape draft. COPY TO NOTES does the reverse. COPY FROM FILE accepts a vault file path and respects Overseer permissions. Copies are independent, require SAVE, and never overwrite the source. Switching between these apps retains any draft in memory; closing, replacing a draft, or leaving the site guards unsaved text. `node holotapes.test.cjs` covers reading, editing, copies, permissions and persistence.
