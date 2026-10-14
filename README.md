# Paperclip–ChatGPT CIMD compatibility

**Unofficial temporary workaround** for older Paperclip npm builds, including `2026.1012.0`, when adding ChatGPT as a remote MCP assistant produces `invalid_client_metadata`.

## Why this happens

ChatGPT's [Client ID Metadata Document](https://chatgpt.com/oauth/client.json) declares `token_endpoint_auth_method: "private_key_jwt"` and also advertises `"none"` in `token_endpoint_auth_methods_supported`. Older Paperclip builds accept only a literal `"none"` in the singular field and reject the document.

**Upstream already fixed this in [paperclipai/paperclip](https://github.com/paperclipai/paperclip)**. This repository is a stopgap for installed npm builds that have not yet included that fix. Check for a newer official release before patching.

The compatibility rule only chooses Paperclip's supported **public PKCE** method when the client *explicitly advertises* `none`. A JWT-only client stays rejected. The patch does not enable `private_key_jwt`, disable authentication, or change the OAuth token endpoint.

## Install / rollback

Requires Node.js. Locate the installed **`client-metadata.js`** inside `@paperclipai/server/dist/services/public-mcp/`, often in the npm/npx cache. Use a disposable test installation first.

```powershell
npm test
node patch.mjs "C:\path\to\client-metadata.js"
# Gracefully stop Paperclip. Back up its database and configuration.
node patch.mjs "C:\path\to\client-metadata.js" --apply
# Restart Paperclip and complete browser OAuth consent.
```

A file named `client-metadata.js.cimd-original.bak` preserves the original. Roll back only after stopping Paperclip:

```powershell
node patch.mjs "C:\path\to\client-metadata.js" --restore
```

The patch refuses source code layouts it does not recognize, and refuses to overwrite an existing backup. A future `npx` update may replace the patched file. **Do not patch a production instance without backup and a rollback test.**

## Evidence and limitations

The accompanying tests check patch/restore behavior. The underlying compatibility logic was also checked against the live ChatGPT CIMD in an isolated test, rejecting JWT-only, missing public support, unsafe redirects, and mismatched IDs. This does **not** certify a full OAuth handshake. Test real authorization, PKCE, token issuance, refresh, and MCP tool access separately.

Paperclip must run in **authenticated mode** behind verified HTTPS. Never publish a `local_trusted` dashboard, credentials, instance databases, tokens, or signing keys.

## Provenance

Independent community compatibility workaround informed by Paperclip's MIT-licensed upstream source and its existing regression tests. **Not affiliated with Paperclip Labs or OpenAI.**

MIT License — see [LICENSE](LICENSE).
