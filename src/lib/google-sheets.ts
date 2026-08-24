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

function looksLikeGoogleLogin(body: string): boolean {
  const sample = body.slice(0, 2000).toLowerCase();
  return (
    sample.includes("<html") ||
    sample.includes("sign in") ||
    sample.includes("accounts.google.com")
  );
}

async function appendViaWebhook(
  url: string,
  input: { headers: string[]; values: string[] },
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    // text/plain avoids Apps Script dropping JSON bodies on the auth redirect
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      secret: googleSheetsWebhookSecret(),
      headers: input.headers,
      values: input.values,
    }),
    redirect: "follow",
  });

  const text = await res.text();
  if (looksLikeGoogleLogin(text)) {
    throw new Error(
      "Google не записал строку: в Apps Script доступ должен быть Anyone (не Google-аккаунт), URL — …/exec, после правок — New version",
    );
  }

  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new Error(
      `Google Sheets webhook failed: ${res.status} ${text.slice(0, 240)}`,
    );
  }

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
