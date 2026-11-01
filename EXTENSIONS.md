# RobCo App & Plugin System v1

Open **APP MANAGER** from the desktop dock or search for **RobCo App Manager**.
The manager separates built-in apps from installed extensions. Built-ins cannot be
removed here. Choose **INSTALL .ROBCOAPP PACKAGE**, select a package, read the
native confirmation, and explicitly select **Install app**. Cancel is the default.
No extension is automatically installed or launched.

Try `samples/supply-planner.robcoapp`: install it, launch **Wasteland Supply Planner**
from the manager, desktop, or System Search, then calculate supplies. With two
travelers for three days it displays 12 water units and 18 meal packs. Disable it
to close its window and remove launchers/search results; enable restores them.
Uninstall asks for confirmation and removes the package. Replacements require
uninstalling the old package first; there is no silent update mechanism.

## Creating packages

A `.robcoapp` is a UTF-8 JSON document, **not a ZIP archive or executable**:

```json
{
  "manifest": {
    "formatVersion": 1,
    "id": "user.my-app",
    "name": "My App",
    "version": "1.0.0",
    "description": "An offline tool.",
    "entry": "index.html",
    "permissions": []
  },
  "files": {
    "index.html": "<!doctype html><html><head><meta charset=\"utf-8\"><link rel=\"stylesheet\" href=\"style.css\"></head><body><button id=\"hello\">Hello</button><script src=\"app.js\"></script></body></html>",
    "style.css": "body { background: #04170e; color: #a7ffb6; }",
    "app.js": "document.querySelector('#hello').onclick = () => { document.querySelector('#hello').textContent = 'Welcome to RobCo'; };"
  }
}
```

Use `JSON.stringify({manifest, files}, null, 2)` with each asset's UTF-8 contents
to create a package. No npm dependency, installer script, or build tool is required.
The supplied sample is original and can be copied as a starting point.

* `formatVersion` must be the number 1. Unknown fields and versions are rejected.
* IDs match `user.[a-z][a-z0-9-]{2,47}`. IDs are unique and case-sensitive.
* Names: 1–60 characters; descriptions: 1–240. Control characters and angle
  brackets are rejected. Versions are three dot-separated integers, each 1–4 digits.
* `entry` is exactly `index.html`. `permissions` must be an empty array.
* Only `index.html`, `style.css`, and `app.js` are allowed as file keys. HTML is
  required; CSS/JS are optional. Values are text strings without NUL characters.
* Maximum package: 512 KiB encoded JSON; maximum individual asset: 192 KiB UTF-8;
  maximum installed extensions: 32. Paths, archives, links, alternate streams,
  nested directories, binary assets, and remote resources are not supported.
* Load `app.js` and `style.css` through relative tags as above. Inline scripts,
  inline event handlers, inline styles, `eval`, imports from the network, frames,
  workers, form submissions and external images are blocked. Data images are allowed.

## Security boundary and storage

Packages are data until explicitly launched. The main process validates the
package but never evaluates its JavaScript. There is no archive extraction and
untrusted names are never used as filesystem paths. Native installation reads
at most 512 KiB + 1 byte before validation and confirmation.

Each launched extension has a separate Electron BrowserWindow and fresh in-memory
session. It has no preload, Node integration, Electron API, desktop DOM, opener,
or privileged message API. Sandboxing, context isolation and web security remain
enabled. The response-header CSP includes `sandbox allow-scripts`, giving the app
an opaque origin. There are **no host message APIs in v1**; messages sent by a
plugin are ignored by the manager. This deliberately avoids granting permissions
that an offline sample does not need.

The dedicated protocol serves only that app's three validated assets with a strict
CSP and MIME types. Request filtering blocks everything except those assets in
their expected resource roles. Navigation, new windows, downloads, webviews and
permission/device requests are denied. A dead local proxy and WebRTC IP policy
also constrain network routes. The desktop's existing IPC endpoints authenticate
both the sending webContents and main frame; plugin windows cannot call them.
The native window title identifies the content as an untrusted extension and
cannot be replaced by the app's document title.

Installed packages and enabled flags live in
`<Electron userData>/extensions/registry-v1.json` (normally under `%APPDATA%`),
never in the program installation directory. Writes replace the registry through
a temporary file. Existing virtual files, tasks, calendar, wallpapers and browser
data are untouched. A corrupt/unreadable registry fails closed: no extensions
launch, writes are blocked and the original file is preserved with a recovery
message. Close Fallout OS and restore that registry from a known-good backup.
Do not edit it while Fallout OS is running.

## Scope and limitations

Version 1 supports offline apps, not plugins that modify built-ins or the desktop.
It has no plugin data persistence, networking, host filesystem API, permissions,
background tasks, signatures, publisher verification, marketplace or automatic
updates. UI state inside an app resets when its window closes. Installed packages
and enable/disable states persist. A malicious app can still display misleading
content or consume CPU/memory; OS/Chromium sandboxing is not a resource quota or
an independent security audit. Never enter secrets into untrusted apps. Keep
Electron updated. Browser-mediated user file selections are not a host filesystem
API; v1 apps should not request files from users.

Web fallback retains all built-in apps and displays the App Manager with an
explanation; extension installation/execution is desktop-only. The Electron
security boundary is not weakened to emulate it in a browser.

## Verification

`npm test` includes malformed packages, traversal keys, size bounds, persistence,
uninstall and corruption recovery. `npm run test:extensions` exercises the real
Electron windows in temporary profiles, including cancel, invalid import,
install, sample interaction, search/desktop launchers, isolation checks, disable,
re-enable, uninstall and restart persistence. It mocks only the native dialog
responses from test code; there is no production test bypass or raw-package IPC.

Run existing desktop, browser, settings and search smoke tests plus
`npm run build:win` and the packaged desktop smoke before release. Windows build
scripts and runtime validation are preserved.

Security design reference: [Electron security recommendations](https://www.electronjs.org/docs/latest/tutorial/security).
