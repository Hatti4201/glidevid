# Privacy and permissions

GlideVid v0.1 has no backend, advertising, analytics, or telemetry.

- `storage` keeps video progress and speed settings locally in browser extension storage.
- The extension requests `host_permissions: ["<all_urls>"]` because video players can be embedded inside third-party iframes. Grant access only to sites you trust. A future version should narrow host permissions where possible.
- Screenshot data is produced locally from accessible video frames and downloaded by the browser when permitted by CORS/media restrictions.
- There is **no cloud sync**. Data does not automatically move between devices.

This reflects the code in the current prototype; review permissions before public distribution.
