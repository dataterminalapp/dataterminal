import { app, safeStorage } from "electron";
import open from "open";
import { APIError, APIErrorJSON } from "./error";
import log from "electron-log/main";
import { isTokenValid, refreshAuthData, TokenPayload } from "./token";
import { APIResponse } from "./types";
import { getStore } from "./config";
import crypto from "crypto";

export interface AppMetadata {
  status: string;
  subscription: string;
  renews_at: string;
  cancelled: boolean;
}

export interface UnsafeAuth {
  accessToken: string;
  refreshToken: string;
  tokenPayload: TokenPayload;
}

export interface Auth {
  authorized: boolean;
  appMetadata: AppMetadata;
}

const AUTH0_CLIENT_ID = "K2O99lrazfwOh2umpkMQlZlQrMUvxXnN";
const AUTH0_REDIRECT_URI = "data-terminal://login";
const AUTH0_AUDIENCE = "https://dev-v23ad53rzjibbhfq.us.auth0.com/api/v2/";

/**
 * The user sub is also used to retrieve the config.
 * So it should be always up-to-date with the front-end.
 */
export let USER_SUB: string | undefined;
export let LATEST_ACCESS_TOKEN: string;
const AUTH_DATA_FIELD = "dataterminal.auth";
const IS_AUTH_DATA_ENCRYPTED_FIELD = "dataterminal.isAuthDataEncrypted";
const listeners: {
  goPro?: (event: Electron.Event, url: string) => void;
  login?: (event: Electron.Event, url: string) => void;
} = {};

/**
 * Keeps in sync the auth token stored locally.
 * This is important to execute every time that is possible during the login/setup.
 * Because it refreshes the auth token and gives more days to the user without having to re-authenticate.
 * @returns
 */
export const refreshStoredAuth = async () => {
  log.info("Refreshing stored auth.");
  const authData = await getStoredAuth();

  if (!authData) return;

  if (!authData.accessToken) {
    throw new Error("Access token is missing");
  }
  if (!authData.refreshToken) {
    throw new Error("Refresh token is missing");
  }

  const newAuthData = await refreshAuthData(
    authData.accessToken,
    authData.refreshToken
  );
  if (newAuthData) {
    LATEST_ACCESS_TOKEN = newAuthData.accessToken;
    store(newAuthData);
    log.info("Auth refreshed.");
    return newAuthData;
  } else {
    log.info("Empty auth.");
    throw new Error("Empty auth.");
  }
};

/**
 * This method is very similar to `refreshStoredAuth` but has a sligh difference,
 * if the refresh fails, it returns the stored auth.
 *
 * This is useful for when the user is trying to access, has no internet connection
 * but still has a valid local token.
 * @returns
 */
export const getAuthOrRefreshedAuthIfPossible = async () => {
  const authData = await getStoredAuth();

  if (!authData) return;

  if (!authData.accessToken) {
    throw new Error("Access token is missing");
  }
  if (!authData.refreshToken) {
    throw new Error("Refresh token is missing");
  }

  try {
    if (authData.tokenPayload.exp) {
      // Get current time in seconds (same unit as exp timestamp)
      const currentTime = Math.floor(Date.now() / 1000);

      // Calculate one week in seconds
      const oneWeekInSeconds = 7 * 24 * 60 * 60;

      // Check if token will expire within one week
      if (authData.tokenPayload.exp - currentTime < oneWeekInSeconds) {
        log.info("Auth will expire in less than a week. Trying to refresh.");
        const newAuthData = await refreshAuthData(
          authData.accessToken,
          authData.refreshToken
        );
        if (newAuthData) {
          LATEST_ACCESS_TOKEN = newAuthData.accessToken;
          store(newAuthData);
          log.info("Auth refreshed.");
          return newAuthData;
        } else {
          log.info("Empty refreshed auth.");
          LATEST_ACCESS_TOKEN = authData.accessToken;
          return authData;
        }
      } else {
        LATEST_ACCESS_TOKEN = authData.accessToken;
        return authData;
      }
    }
  } catch (err) {
    log.error("Error refreshing auth: ", err);
    return authData;
  }
};

const turnUnsafeAuthToAuth = (unsafeAuth: UnsafeAuth): Auth => {
  const { tokenPayload } = unsafeAuth;
  const { "https://dataterminal.app/app_metadata": appMetadata } = tokenPayload;

  return {
    authorized: true,
    appMetadata,
  };
};

/**
 * Method used by the front-end to access the auth data in a simplified way.
 * Returns only what the front-end needs.
 * @returns
 */
export const getSimplifiedSafeAuth = async (): Promise<
  APIResponse<Auth | undefined, APIErrorJSON>
> => {
  log.info("Simplified auth request.");
  try {
    const unsafeAuth = await getAuthOrRefreshedAuthIfPossible();
    if (unsafeAuth) {
      // Keep in sync.
      log.info("Updating local sub.");
      USER_SUB = unsafeAuth.tokenPayload.sub;
      return { data: turnUnsafeAuthToAuth(unsafeAuth) };
    } else {
      return { error: new APIError("Unknown error.").toJSON() };
    }
  } catch (err) {
    // We can fall here if the local stored token is expired or invalid.
    return { error: APIError.normalizeError(err, "Unknown error.").toJSON() };
  }
};

/**
 * Returns an updated unsafe auth, if not possible, returns the unsafe auth already stored.
 * @param _
 * @param skipUpdate
 * @returns
 */
const getStoredAuth = async (): Promise<UnsafeAuth | undefined> => {
  log.info("Getting stored auth.");
  try {
    const store = getStore();
    const isAuthDataEncrypted = store.get(IS_AUTH_DATA_ENCRYPTED_FIELD);

    if (isAuthDataEncrypted === "true") {
      log.info("Auth data is encrypted.");
      const rawEncryptedData = store.get(AUTH_DATA_FIELD) as string | undefined;
      if (!rawEncryptedData || typeof rawEncryptedData !== "string") {
        log.info("Encrypted data is incorrect: ", typeof rawEncryptedData);
        return undefined;
      }

      log.info("Decrypting auth data.");
      const rawauthData = safeStorage.decryptString(
        Buffer.from(rawEncryptedData, "base64")
      );

      const authData = JSON.parse(rawauthData) as UnsafeAuth;

      // We need to verify again in case that the token expired.
      await isTokenValid(authData.accessToken);
      return authData;
    } else {
      const rawAuthData = store.get(AUTH_DATA_FIELD) as string | undefined;

      if (rawAuthData) {
        log.info("Auth data needs treatment.");

        const authData = JSON.parse(rawAuthData) as UnsafeAuth;

        // We need to verify again in case that the token expired.
        await isTokenValid(authData.accessToken);
        return authData;
      } else {
        log.info("No auth data available.");
      }
    }
  } catch (err) {
    log.error(
      APIError.normalizeError(err, "Failed to get session data.").message
    );
  }
};

/**
 * Removes the unsafe auth from the store.
 */
export const remove = () => {
  const store = getStore();
  log.info("Removing auth data.");

  store.delete(AUTH_DATA_FIELD);
  store.delete(IS_AUTH_DATA_ENCRYPTED_FIELD);

  log.info("Auth data removed.");
};

/**
 * Stores the unsafe auth using encryption if available.
 * @param authData
 */
export const store = (authData: UnsafeAuth) => {
  const store = getStore();
  log.info("Storing auth data.");

  if (safeStorage.isEncryptionAvailable()) {
    const encryptedAuthData = safeStorage
      .encryptString(JSON.stringify(authData))
      .toString("base64");
    log.info("Storing encrypted data.");
    store.set(AUTH_DATA_FIELD, encryptedAuthData);
    store.set(IS_AUTH_DATA_ENCRYPTED_FIELD, "true");
  } else {
    log.info("Contact support.");
    store.set(AUTH_DATA_FIELD, JSON.stringify(authData));
    store.set(IS_AUTH_DATA_ENCRYPTED_FIELD, "false");
  }

  log.info("Auth data stored.");
};

const handleSubscriptionProtocolEvent = async () => {
  log.info("Updating auth to get subscription inside the token.");
  const unsafeAuth = await refreshStoredAuth();
  if (unsafeAuth) {
    return turnUnsafeAuthToAuth(unsafeAuth);
  } else {
    log.info("Auth not available after subscription.");
  }
  throw new Error("Auth not available after subscription.");
};

const handleLoginProtocolEvent = async (
  parsedUrl: URL,
  codeVerifier?: string
) => {
  log.info("Parsing URL components.");
  const authorizationCode: string | undefined = decodeURIComponent(
    parsedUrl.searchParams.get("code") || ""
  );

  if (authorizationCode && codeVerifier) {
    log.info("Authorization code available.");

    const options = {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "K2O99lrazfwOh2umpkMQlZlQrMUvxXnN",
        code_verifier: codeVerifier,
        code: authorizationCode,
        redirect_uri: AUTH0_REDIRECT_URI,
      }),
    };

    const response = await fetch(
      "https://dev-v23ad53rzjibbhfq.us.auth0.com/oauth/token",
      options
    );

    if (!response.ok) {
      log.error("Invalid response status: ", response.status);
      const errorResponse = await response.json().catch(() => response.text());
      log.error("Response: ", errorResponse);
      throw new APIError("Invalid response from auth provider.");
    } else {
      const { access_token: accessToken, refresh_token: refreshToken } =
        await response.json();

      if (!accessToken) {
        log.error("Access token not available.");
        throw new APIError("Access token is not available.");
      } else if (!refreshToken) {
        log.error("Refresh token is not available.");
        throw new APIError("Refresh token is not available.");
      }

      log.info("Tokens available.");
      try {
        const tokenPayload: TokenPayload = await isTokenValid(accessToken);
        log.info("Access token is valid.");

        const unsafeAuth: UnsafeAuth = {
          accessToken,
          refreshToken,
          tokenPayload,
        };

        log.info("Updating local sub.");
        USER_SUB = tokenPayload.sub;
        LATEST_ACCESS_TOKEN = accessToken;
        store(unsafeAuth);
        return turnUnsafeAuthToAuth(unsafeAuth);
      } catch (err) {
        log.error(
          "Token is invalid: ",
          APIError.normalizeError(err, "Unknown error.").message
        );
        console.error("Token is invalid.");
        throw err;
      }
    }
  } else {
    log.error("No payload found in the URL.");
    throw new Error("No payload found in the URL");
  }
};

/**
 * Awaits a protocol call. The protocol call only happens when a user clicks in "Open Data Terminal"
 * in the browser available over the `/redirect` or `/success` routes.
 * @returns
 */
const awaitAuthOverProtocol = async (
  goPro: boolean,
  codeVerifier?: string
): Promise<Auth> => {
  const promise = new Promise<Auth>((res, rej) => {
    const listener = async (event: Electron.Event, url: string) => {
      event.preventDefault();
      log.info("Event over protocol.");

      try {
        const parsedUrl = new URL(url);

        log.info("Parsed URL.");
        log.info("Hostname: ", parsedUrl.hostname);
        if (parsedUrl.hostname === "subscription") {
          res(await handleSubscriptionProtocolEvent());
        } else {
          res(await handleLoginProtocolEvent(parsedUrl, codeVerifier));
        }
      } catch (error) {
        log.error("Failed to parse URL or payload.");
        rej(
          `Failed to parse URL or payload: ${APIError.normalizeError(
            error,
            "Please check if you have a default browser set."
          )}`
        );
      }
    };
    if (goPro) {
      listeners.goPro = listener;
    } else {
      listeners.login = listener;
    }
    app.once("open-url", listener);
  });

  return promise;
};

export const openGoProBrowser = async (): Promise<
  APIResponse<Auth, APIErrorJSON>
> => {
  try {
    if (listeners.goPro) {
      app.removeListener("open-url", listeners.goPro);
    }

    // Open the login URL in the default browser
    const loginUrl = "https://www.dataterminal.app/go-pro";
    open(loginUrl);

    return {
      data: await awaitAuthOverProtocol(true),
    };
  } catch (error) {
    return {
      error: APIError.normalizeError(
        error,
        "Unexpected error: process failure."
      ).toJSON(),
    };
  }
};

// Source: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce#javascript-sample
// Dependency: Node.js crypto module
// https://nodejs.org/api/crypto.html#crypto_crypto
function base64URLEncode(str: string) {
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sha256(buffer: string) {
  return crypto.createHash("sha256").update(buffer).digest();
}

export const login = async (): Promise<APIResponse<Auth, APIErrorJSON>> => {
  try {
    if (listeners.login) {
      app.removeListener("open-url", listeners.login);
    }
    const verifier = base64URLEncode(crypto.randomBytes(32).toString("base64"));
    const challenge = base64URLEncode(sha256(verifier).toString("base64"));

    // Open the login URL in the default browser
    const authUrl =
      `https://dev-v23ad53rzjibbhfq.us.auth0.com/authorize?` +
      `response_type=code&` +
      `code_challenge=${challenge}&` +
      `code_challenge_method=S256&` +
      `client_id=${AUTH0_CLIENT_ID}&` +
      `redirect_uri=${AUTH0_REDIRECT_URI}&` +
      `audience=${AUTH0_AUDIENCE}&` +
      `scope=${encodeURIComponent("openid profile email offline_access")}`;

    open(authUrl);

    return {
      data: await awaitAuthOverProtocol(false, verifier),
    };
  } catch (error) {
    return {
      error: APIError.normalizeError(
        error,
        "Unexpected error: process failure."
      ).toJSON(),
    };
  }
};
