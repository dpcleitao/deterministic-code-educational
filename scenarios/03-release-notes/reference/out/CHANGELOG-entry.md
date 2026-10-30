## [0.10.0]

### Breaking changes

- **auth:** refresh tokens before they expire (2c9f7b3)
  the onExpire callback is removed. Use onRefresh instead.
- **api:** rename client.fetchAll to client.list (5b3a9f4)

### Features

- **cli:** add a --json flag to the status command (e0b4c18)
- **config:** support extends in config files (0f6d2b8)

### Fixes

- **parser:** handle empty config files (7ad5512)
- return exit code 1 when a check fails (d4e8a21)
- **cli:** stop printing colour codes when output is piped (8e1b7c5)

### Other

- fix a typo in the README (4f1c9e2)
- **deps:** bump yaml from 2.5.1 to 2.6.0 (b83d0a7)
- **cache:** reuse parsed manifests between runs (c71e8d0)
- cover the retry path (a9c0f36)
- cache node_modules between jobs (6a2d4f9)

### Thanks

Lena Vogel, Marcus Reid, Priya Shah, Sam Okafor, Tomás Ortega, Wei Chen
