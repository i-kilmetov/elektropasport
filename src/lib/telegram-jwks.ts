import {
  createLocalJWKSet,
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload,
} from "jose";
import { telegramFetch } from "@/lib/telegram-fetch";

export const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";

/**
 * Pinned copy of https://oauth.telegram.org/.well-known/jwks.json.
 * Signature checks must work where Telegram egress is blocked; a remote fetch
 * is only attempted when a token uses an unknown `kid`.
 * Override with TELEGRAM_OIDC_JWKS if Telegram rotates keys.
 */
const PINNED_JWKS: JSONWebKeySet = {
  keys: [
    {
      alg: "RS256",
      e: "AQAB",
      kty: "RSA",
      n: "5RneLtsKvVcxdv6gu6gxEQu30Cru5NiMQnY6SNr9ZyZFZ4ya-pfHNuaZXJ6QPG0JSFwoxeOkEO2-eZN_REVPm448PvjjsR1eQdZ5QpEkNxnItFcmxkHH91v5cgf52_EI9BGO-MT6f1vaBSg3uWHFlDxI7J2AYxNvd1_Nf3TkgrrR7gyJFTmEIai5RefGnA0KGNYDlRIGUzrz2F05n6gTaHFT_iHL5UHatTZA4GCiUSjIOuwqu5pE5uZge20TFv3cxXMQaFw_xv1pgQt_Rq8eoCN7TS0RQ0zjWKiad-W286BcFectXsUm03p5Nq_kY4mf_7rqwX_B8yy_bBreyKn7RQ",
      kid: "oidc-1",
      use: "sig",
    },
    {
      alg: "ES256",
      kty: "EC",
      crv: "P-256",
      x: "ahVYrohhX6YA7w0P2gUNSwMFbaabCgBZFkeq9bWdmwU",
      y: "Ea8nKJ34VQMA7zv8aYDfzcBhXEjnWQ9C06jVke_eUV0",
      kid: "oidc-es256-1",
      use: "sig",
    },
    {
      alg: "EdDSA",
      kty: "OKP",
      crv: "Ed25519",
      x: "i6BEafXMEe4osXgUTffpKAm6Cn6F2bhqPZoclunTAV4",
      kid: "oidc-eddsa-1",
      use: "sig",
    },
  ],
};

function configuredJwks(): JSONWebKeySet {
  const raw = process.env.TELEGRAM_OIDC_JWKS?.trim();
  if (!raw) return PINNED_JWKS;
  try {
    const parsed = JSON.parse(raw) as JSONWebKeySet;
    if (Array.isArray(parsed?.keys) && parsed.keys.length > 0) return parsed;
  } catch (error) {
    console.error("TELEGRAM_OIDC_JWKS is not valid JWKS JSON", error);
  }
  return PINNED_JWKS;
}

let localSet: ReturnType<typeof createLocalJWKSet> | null = null;
let remoteSet: ReturnType<typeof createRemoteJWKSet> | null = null;

function local() {
  localSet ??= createLocalJWKSet(configuredJwks());
  return localSet;
}

function remote() {
  remoteSet ??= createRemoteJWKSet(
    new URL(`${TELEGRAM_OIDC_ISSUER}/.well-known/jwks.json`),
    { [customFetch]: (url, options) => telegramFetch(url, options) },
  );
  return remoteSet;
}

function isUnknownKeyError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return (
    code === "ERR_JWKS_NO_MATCHING_KEY" ||
    code === "ERR_JOSE_ALG_NOT_ALLOWED" ||
    code === "ERR_JWKS_MULTIPLE_MATCHING_KEYS"
  );
}

export async function verifyTelegramOidcToken(
  idToken: string,
  clientId: string,
): Promise<JWTPayload> {
  const options = { issuer: TELEGRAM_OIDC_ISSUER, audience: clientId };
  try {
    const { payload } = await jwtVerify(idToken, local(), options);
    return payload;
  } catch (error) {
    if (!isUnknownKeyError(error)) throw error;
    console.error("telegram oidc: unknown signing key, refreshing JWKS", error);
  }
  const { payload } = await jwtVerify(idToken, remote(), options);
  return payload;
}
