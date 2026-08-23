import { SignJWT, importPKCS8 } from "jose";

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() ||
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
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
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

async function appendViaWebhook(
  url: string,
  input: { headers: string[]; values: string[] },
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim() || undefined,
      headers: input.headers,
      values: input.values,
    }),
    redirect: "follow",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets webhook failed: ${res.status} ${text}`);
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
