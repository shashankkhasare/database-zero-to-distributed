import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { google } from "googleapis";
import { tokenPath, youtubeScopes } from "./youtube-common.mjs";

const keyfileArgument = argument("--client-secrets") ?? process.env.YOUTUBE_CLIENT_SECRETS;
if (!keyfileArgument) {
  throw new Error("usage: npm run youtube:auth -- --client-secrets <desktop-client.json>");
}
const keyfilePath = resolve(keyfileArgument);

const source = JSON.parse(await readFile(keyfilePath, "utf8"));
const keys = source.installed ?? source.web;
if (!keys?.client_id || !keys?.client_secret) throw new Error("Invalid OAuth client JSON");

const state = base64Url(randomBytes(24));
const codeVerifier = base64Url(randomBytes(64));
const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
const server = createServer();
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Could not start the OAuth callback server");

const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
const client = new google.auth.OAuth2(keys.client_id, keys.client_secret, redirectUri);
const authorizationUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: youtubeScopes,
  state,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
});
console.log("Open this Google authorization URL in your browser:");
console.log(authorizationUrl);

const code = await waitForAuthorization(server, state);
const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: redirectUri });
if (!tokens.refresh_token) {
  throw new Error("Google did not return a refresh token; revoke the app grant and authorize again");
}

const destination = tokenPath();
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify({
  type: "authorized_user",
  client_id: keys.client_id,
  client_secret: keys.client_secret,
  refresh_token: tokens.refresh_token,
}, null, 2)}\n`, { mode: 0o600 });
console.log(`Stored YouTube authorization outside the repository: ${destination}`);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function waitForAuthorization(server, expectedState) {
  return new Promise((resolveCode, rejectCode) => {
    const timeout = setTimeout(() => {
      server.close();
      rejectCode(new Error("Timed out waiting for Google authorization"));
    }, 5 * 60 * 1000);
    server.on("request", (request, response) => {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname !== "/oauth2callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error ? `Authorization failed: ${error}` : "Authorization complete. You may close this tab.");
      clearTimeout(timeout);
      server.close();
      if (error) rejectCode(new Error(`Google authorization failed: ${error}`));
      else if (!code || returnedState !== expectedState) rejectCode(new Error("Invalid OAuth callback"));
      else resolveCode(code);
    });
  });
}
