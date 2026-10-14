# Paperclip + Codex on Windows: tested troubleshooting notes

This is an **unofficial, field-tested workaround**, not a permanent fix. The steps were tested on Windows 11 with Paperclip npm build `2026.1012.0`, Codex CLI `0.142.5`, and Node `24.16.0`. Keep all agent approval/sandbox protections enabled.

## 1. Managed OpenAI subscription: temporary CODEX_HOME rejected

**Symptoms:** Paperclip's `Test your agent` recognizes the OpenAI subscription and reports Codex authenticated, but the provider hello probe fails with a warning similar to:

```text
Refusing to create helper binaries under temporary dir ...
(codex_home: AbsolutePathBuf("...\\AppData\\Local\\Temp\\paperclip-ai-...\\provider"))
```

Paperclip's installed managed AI connection runtime created per-run credential homes under `os.tmpdir()`. Codex's Windows helper-binary guard objects to creating launch helpers in that temporary tree.

**Workaround tested locally:** retain Paperclip's per-run random directory creation and cleanup, but create it under an access-controlled **non-Temp** Paperclip-private directory instead. An isolated local test confirmed `codex --version` with a `CODEX_HOME` outside the Temp tree no longer emitted that particular warning. A patched local instance restarted healthy, and its later provider test advanced beyond this warning.

**Do not:** point `CODEX_HOME` at another person's home; reuse one credential directory across users; disable permission enforcement; publish `auth.json`, tokens or signing keys. Local permissions, cleanup, session isolation and crash recovery need proper upstream tests. Manual edits of `node_modules` are overwritten by upgrades.

Proposed upstream approach: use a dedicated, private managed-AI credential-root setting, defaulting to a non-Temp location on Windows, and preserve `mkdtemp`, `mode: 0700` intent, per-run scoping, post-run cleanup and authentication isolation. Test Codex's actual hello probe and both Windows/Unix path semantics.

## 2. Codex refuses to run outside a Git repository

**Symptoms:**

```text
Not inside a trusted directory and --skip-git-repo-check was not specified.
```

The adapter test may fall back to Paperclip's process working directory. A safe resolution for a dedicated agent-validation instance is to start Paperclip from an **isolated Git repository**, then retry the environment test. Do not turn on sandbox bypass just to work around this.

This issue is **already tracked upstream**: [paperclipai/paperclip#4774](https://github.com/paperclipai/paperclip/issues/4774). The reporter discusses `--skip-git-repo-check` as a proposed adapter option; our security preference for this test was to use an isolated Git working tree.

## 3. Embedded PostgreSQL refuses elevated Windows processes

Embedded PostgreSQL refuses to start if `paperclipai run` executes as a Windows administrator (high-integrity token). Run the instance as a **non-elevated** user instead. We used a manually invoked Windows scheduled task with an *Interactive* user principal and *Limited* run level to recover the instance after a controlled restart. No Windows admin rights should be granted to Postgres to solve this.

A separate embedded-database issue exists: [paperclipai/paperclip#418](https://github.com/paperclipai/paperclip/issues/418). This may have a different root cause.

## 4. Duplicate launchers can hide configuration changes

Before declaring that a restart picked up a patch, identify the **actual process listening on port 3100**. A stale Paperclip process from an earlier working directory can continue serving the UI while a replacement fails to bind. Verify the listener PID, the process tree, launch context and `/api/health` after any restart.

## Acceptance evidence (local instance)

- OpenAI subscription recognized by Paperclip; Codex CLI authenticated.
- Changing `CODEX_HOME` out of system Temp eliminated the helper-binary warning in the local probe.
- Starting the active non-elevated Paperclip instance from a clean dedicated Git repository eliminated the untrusted-directory failure.
- Paperclip's **agent environment test passed**, and the configuration saved with sandbox bypass **OFF**.
- No production repository edit, billable API key, or live tenant deployment was required.

This is **not** evidence that all agents, persistent sessions, failover paths, or Windows installer flows pass.

## Upstream reports

- [Non-Git Codex execution (#4774)](https://github.com/paperclipai/paperclip/issues/4774)
- [Managed connection home lifecycle/session fingerprints (#15160)](https://github.com/paperclipai/paperclip/issues/15160)
- [Windows embedded PostgreSQL (#418)](https://github.com/paperclipai/paperclip/issues/418)

If upstream has shipped a newer compatible build, **upgrade and test before applying workarounds**. Never paste secrets or private logs into public GitHub issues.
