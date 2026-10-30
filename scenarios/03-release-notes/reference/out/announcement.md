**tidewater 0.10.0 is out.**

New: `status --json` for scripts, and config files can now `extends` another one. Empty config
files no longer crash the parser, and a failing check now exits with code 1.

Two changes need action before you upgrade:
- `client.fetchAll` is now `client.list`.
- The `onExpire` callback is gone. Use `onRefresh` instead; tokens now refresh 60 seconds early.

Thanks to Lena, Marcus, Priya, Sam, Tomás and Wei.
