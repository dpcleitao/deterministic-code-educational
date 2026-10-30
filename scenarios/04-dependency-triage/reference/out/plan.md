# Upgrade plan for harbour-web

## First: the three known vulnerabilities

1. **@acme/ui-kit** 0.4.2 has a high-severity XSS in Tooltip (ADV-2026-0203). The fix is 0.5.0,
   and `^0.4.2` does **not** allow it: below 1.0, a caret range stops at the next minor. Change the
   range in `package.json` to `^0.5.0` and check the Tooltip changes.
2. **dashkit** 4.17.4 has a high-severity prototype pollution in `merge()` (ADV-2026-0142). The fix is
   4.17.21 and `^4.17.4` already allows it, so a plain update is enough. Do it today.
3. **fetchline** 6.19.2 has a moderate header-injection issue (ADV-2026-0177). The fix is 6.19.8, but
   the version is pinned exactly. Change the pin in `package.json` to 6.19.8.

## Then: safe updates inside the current ranges

routekit to 4.21.1, schemata to 3.24.1, datewise to 2.29.10 and colorize to 5.10.0. None of these
needs a change to `package.json`.

## Later: breaking upgrades to plan for

routekit 5.0.1, datewise 3.6.0, @acme/ui-kit 0.12.1, tinypad 0.1.0 and fetchline 7.0.0 are all
outside their current ranges. Each needs its own change to `package.json` and its release notes read
first.
