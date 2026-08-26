import { SignJWT, importPKCS8 } from "jose";

function firstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function googleSheetsWebhookUrl(): string | undefined {
  return firstEnv([
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEET_WEBHOOK_URL",
  ]);
}

function googleSheetsWebhookSecret(): string | undefined {
  return firstEnv(["GOOGLE_SHEETS_WEBHOOK_SECRET"]);
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    googleSheetsWebhookUrl() ||
      (process.env.GOOGLE_SHEETS_ID?.trim() && googleServiceAccount()),
  );
}

type WebhookUrlKind = "exec" | "dev" | "spreadsheet" | "other";

function classifyWebhookUrl(url: string): WebhookUrlKind {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    if (host === "docs.google.com" || host.endsWith(".docs.google.com")) {
      return "spreadsheet";
    }
    if (path.endsWith("/dev")) return "dev";
    if (
      (host === "script.google.com" || host.endsWith(".script.google.com")) &&
      path.endsWith("/exec")
    ) {
      return "exec";
    }
    return "other";
  } catch {
    return "other";
  }
}

/** Shape of GOOGLE_SHEETS_WEBHOOK_URL, without exposing the URL itself. */
export function googleSheetsWebhookKind(): WebhookUrlKind | null {
  const webhook = googleSheetsWebhookUrl();
  return webhook ? classifyWebhookUrl(webhook) : null;
}

function googleServiceAccount(): {
  email: string;
  privateKey: string;
} | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          email: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // fall through to discrete env vars
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  ).trim();
  if (!email || !privateKey) return null;
  return { email, privateKey };
}

export async function appendGoogleSheetRow(input: {
  headers: string[];
  values: string[];
}): Promise<void> {
  const webhook = googleSheetsWebhookUrl();
  if (webhook) {
    await appendViaWebhook(webhook, input);
    return;
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  const account = googleServiceAccount();
  if (!spreadsheetId || !account) {
    throw new Error("Google Sheets не настроен");
  }

  const token = await googleSheetsAccessToken(account.email, account.privateKey);
  const sheetName = process.env.GOOGLE_SHEETS_TAB?.trim() || "Sheet1";
  const range = `${sheetName}!A1`;

  await ensureHeaderRow(spreadsheetId, range, token, input.headers);

  const appendUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
  );
  appendUrl.searchParams.set("valueInputOption", "USER_ENTERED");
  appendUrl.searchParams.set("insertDataOption", "INSERT_ROWS");

  const res = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [input.values] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets append failed: ${res.status} ${text}`);
  }
}

const APPS_SCRIPT_LOGIN_ERROR =
  "Google не пустил сервер в Apps Script: в Deploy доступ должен быть «Все» / Anyone (не «с аккаунтом Google»), URL — …/exec, после смены доступа — New version";

function webhookUrlError(url: string): string | null {
  const kind = classifyWebhookUrl(url);

  if (kind === "exec") return null;
  if (kind === "spreadsheet") {
    return "В Vercel вставлена ссылка на таблицу. Нужна ссылка веб-приложения Apps Script, которая заканчивается на /exec";
  }
  if (kind === "dev") {
    return "В Vercel стоит тестовый URL …/dev. В Deploy → Manage deployments скопируйте боевой URL …/exec";
  }
  return "GOOGLE_SHEETS_WEBHOOK_URL должен быть https://script.google.com/macros/s/…/exec";
}

function isGoogleAccountsUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "accounts.google.com" || host.endsWith(".accounts.google.com");
  } catch {
    return /accounts\.google\.com/i.test(value);
  }
}

function looksLikeGoogleLogin(body: string): boolean {
  const sample = body.slice(0, 4000).toLowerCase();
  if (sample.includes("moved temporarily") && sample.includes("script.google")) {
    return false;
  }
  return (
    sample.includes("accounts.google.com") ||
    sample.includes("servicelogin") ||
    sample.includes("sign in - google") ||
    sample.includes("войдите в аккаунт google")
  );
}

function extractAppsScriptRedirect(body: string): string | null {
  const quoted =
    body.match(/\bHREF="([^"]+)"/i) ??
    body.match(/\bhref=["']([^"']+)["']/i);
  if (!quoted?.[1]) return null;
  const href = quoted[1].replace(/&amp;/g, "&");
  try {
    const host = new URL(href).hostname.toLowerCase();
    if (
      host === "script.googleusercontent.com" ||
      host.endsWith(".script.googleusercontent.com") ||
      host === "script.google.com" ||
      host.endsWith(".script.google.com")
    ) {
      return href;
    }
  } catch {
    return null;
  }
  return null;
}

function parseWebhookPayload(text: string): { ok?: boolean; error?: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    return JSON.parse(trimmed) as { ok?: boolean; error?: string };
  } catch {
    return null;
  }
}

async function readAppsScriptBody(url: string, method: "GET" | "POST", body?: string) {
  return fetch(url, {
    method,
    headers: {
      Accept: "application/json,text/plain,*/*",
      ...(method === "POST"
        ? { "Content-Type": "text/plain;charset=utf-8" }
        : {}),
      "User-Agent": "TokomResearchSurvey/1.0",
    },
    body: method === "POST" ? body : undefined,
    redirect: "manual",
    cache: "no-store",
  });
}

async function postAppsScriptWebApp(url: string, body: string): Promise<string> {
  const posted = await readAppsScriptBody(url, "POST", body);
  const location = posted.headers.get("location");

  if (location && isGoogleAccountsUrl(location)) {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }

  if (location && posted.status >= 300 && posted.status < 400) {
    return getAppsScriptRedirect(new URL(location, url).href);
  }

  const text = await posted.text();
  if (parseWebhookPayload(text)) return text;

  const href = extractAppsScriptRedirect(text);
  if (href) {
    if (isGoogleAccountsUrl(href)) {
      throw new Error(APPS_SCRIPT_LOGIN_ERROR);
    }
    return getAppsScriptRedirect(new URL(href, url).href);
  }

  if (looksLikeGoogleLogin(text) || posted.type === "opaqueredirect") {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }

  return text;
}

async function getAppsScriptRedirect(url: string): Promise<string> {
  if (isGoogleAccountsUrl(url)) {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }

  const res = await readAppsScriptBody(url, "GET");
  const location = res.headers.get("location");
  if (location && isGoogleAccountsUrl(location)) {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }
  if (location && res.status >= 300 && res.status < 400) {
    const next = await fetch(new URL(location, url).href, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });
    const nextText = await next.text();
    if (looksLikeGoogleLogin(nextText)) {
      throw new Error(APPS_SCRIPT_LOGIN_ERROR);
    }
    return nextText;
  }

  const text = await res.text();
  if (looksLikeGoogleLogin(text)) {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }
  return text;
}

async function appendViaWebhook(
  url: string,
  input: { headers: string[]; values: string[] },
): Promise<void> {
  const urlError = webhookUrlError(url);
  if (urlError) {
    throw new Error(urlError);
  }

  const text = await postAppsScriptWebApp(
    url,
    JSON.stringify({
      secret: googleSheetsWebhookSecret(),
      headers: input.headers,
      values: input.values,
    }),
  );

  const parsed = parseWebhookPayload(text);

  if (parsed?.ok === true) return;

  if (parsed?.ok === false) {
    if (parsed.error === "forbidden") {
      throw new Error(
        "Не совпал SECRET вебхука Google Sheets с GOOGLE_SHEETS_WEBHOOK_SECRET",
      );
    }
    if (parsed.error === "empty_body") {
      throw new Error(
        "Apps Script получил пустое тело. Проверьте, что деплой — Web app, URL оканчивается на /exec",
      );
    }
    if (parsed.error === "no_spreadsheet" || String(parsed.error).includes("no_spreadsheet")) {
      throw new Error(
        "Скрипт не привязан к таблице. Откройте Apps Script из самой Google Sheet или задайте SHEET_ID",
      );
    }
    throw new Error(`Google Sheets webhook: ${parsed.error || "ошибка"}`);
  }

  if (looksLikeGoogleLogin(text)) {
    throw new Error(APPS_SCRIPT_LOGIN_ERROR);
  }

  throw new Error(
    `Google Sheets webhook: неожиданный ответ ${text.slice(0, 180).replace(/\s+/g, " ")}`,
  );
}

async function googleSheetsAccessToken(
  email: string,
  privateKeyPem: string,
): Promise<string> {
  const key = await importPKCS8(privateKeyPem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Не удалось получить токен Google",
    );
  }
  return data.access_token;
}

async function ensureHeaderRow(
  spreadsheetId: string,
  range: string,
  token: string,
  headers: string[],
): Promise<void> {
  const getUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  getUrl.searchParams.set("majorDimension", "ROWS");

  const existing = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!existing.ok) {
    const text = await existing.text();
    throw new Error(`Google Sheets read failed: ${existing.status} ${text}`);
  }

  const data = (await existing.json()) as { values?: string[][] };
  if ((data.values?.length ?? 0) > 0) return;

  const updateUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  updateUrl.searchParams.set("valueInputOption", "USER_ENTERED");

  const res = await fetch(updateUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [headers] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets header failed: ${res.status} ${text}`);
  }
}
