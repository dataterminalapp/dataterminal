import {
  jwtVerify,
  createRemoteJWKSet,
  JWTPayload,
  createLocalJWKSet,
  JSONWebKeySet,
} from "jose";
import { AppMetadata, UnsafeAuth } from "./auth";
import log from "electron-log/main";

export type TokenPayload = JWTPayload & {
  "https://dataterminal.app/app_metadata": AppMetadata;
};

const JWKS_URL =
  "https://dev-v23ad53rzjibbhfq.us.auth0.com/.well-known/jwks.json";

const API_ENDPOINT = "https://www.dataterminal.app/api/auth";

/**
 * Fallback offline JWKS set.
 */
const OFFLINE_JWKS_SET: JSONWebKeySet = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      n: "1HI5YZv-a4xYx8v7k-HPE0UT2VfqV5hPAIQw2S5JI2j7D5OHpwrk5PVVtKCL6esy12NvFPdPZ5h88-Lw2PWeMATP7GbfDEY1MKdgJI1n6LpEj2Kx4WjrE1iv9Q0zauMBKdT4Jno8KevC5Jw81Gcxiw_Usxwfh04PPQG7-zrYvucYpmu8Ci2q6rMMZ6UyUmz_Mraz8bghdGKQn8j58PfTB98GLKO3v769xpCHnOPZfjTgWOZGJ9sazY4ihU2XlNA_67ybueOMzNT59eBlGBUPMQVQLaKDW3J6hqnXreFfLZ3u1Xa7RWz-ZbLiuLaHJKztIiP-kLf55Gz-ZOq7nbhvjQ",
      e: "AQAB",
      kid: "zCPkY-bgy5Wz4gOU2nRhi",
      x5t: "Xj4xNXZLECeaV2p-Bsv3M8ZEMfY",
      x5c: [
        "MIIDHTCCAgWgAwIBAgIJCidVXsDJpZZaMA0GCSqGSIb3DQEBCwUAMCwxKjAoBgNVBAMTIWRldi12MjNhZDUzcnpqaWJiaGZxLnVzLmF1dGgwLmNvbTAeFw0yNTAxMjUxNTQ1NTFaFw0zODEwMDQxNTQ1NTFaMCwxKjAoBgNVBAMTIWRldi12MjNhZDUzcnpqaWJiaGZxLnVzLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANRyOWGb/muMWMfL+5PhzxNFE9lX6leYTwCEMNkuSSNo+w+Th6cK5OT1VbSgi+nrMtdjbxT3T2eYfPPi8Nj1njAEz+xm3wxGNTCnYCSNZ+i6RI9iseFo6xNYr/UNM2rjASnU+CZ6PCnrwuScPNRnMYsP1LMcH4dODz0Bu/s62L7nGKZrvAotquqzDGelMlJs/zK2s/G4IXRikJ/I+fD30wffBiyjt7++vcaQh5zj2X404FjmRifbGs2OIoVNl5TQP+u8m7njjMzU+fXgZRgVDzEFUC2ig1tyeoap163hXy2d7tV2u0Vs/mWy4ri2hySs7SIj/pC3+eRs/mTqu524b40CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUV2RdIGcwnuPoXj0VxPCEAP2LdRowDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQCZ+Tb/X0aUIY2Ok/miFg5uIt2pnfezAU4yhmitA3jhNDTU93qwkCKH0x65DPHchLH688tiO5o/8VaF1jjqP2yENcLy+EKTwrQVxo3GWT1vhP1guGeas7+nAdKY3LKg12/xvp5fMS1xf96uOIcqYy0S2MeznrRel8gohPWQY66NX2S/f66bHRQSWLXzUT2dMtNg3c7dsicls8pCkEqt8/dezUV92XHwwX0KlMmBuswhZNApJkFHYC2QxU4WLLaAkaedg4VBeac114ri3koqmfHubvcFzAR33eTW4CYQcgklWakV/DZokTMNIj5RXb8Pru26sfE3WuGArXj4g+FY7uEv",
      ],
      alg: "RS256",
    },
    {
      kty: "RSA",
      use: "sig",
      n: "qkaQl4OgnFP9w3aR7W9KgHerZcsy9Tc10XylJnwtPcH_BLHqsutq0nsj8r49aF_f10Ifus9f1odT8oBizpyVPS9JZZSFlsHzNMUz56y6PJ6mwtO4dLQMqLRq_VMpZgpMqMxDzIHJH9QW-yEkFmci8lsbuSj5hGEIh0klPaYtJ5PkdWsFlMV8qpp8aQLCoe62tDtHfp2g4Uq2RlVsc-IkZebytpcMKrYCmaJ8MV5cVew6Fc6k56J1PxyRbSQCpsOqp8S_A-9pzUtBelyPMRVs1DgYynEuXLMTfaAXfpkeUYxPz7r3H4QP-bMTNXEf7rFcQQoBcCNJ1pKb30FPfp_FDQ",
      e: "AQAB",
      kid: "FftJ9HIhhcj_TvOqDHier",
      x5t: "YjwigiV7UqxD3MFFHCZptmfFka4",
      x5c: [
        "MIIDHTCCAgWgAwIBAgIJK+0bleJ4X+rKMA0GCSqGSIb3DQEBCwUAMCwxKjAoBgNVBAMTIWRldi12MjNhZDUzcnpqaWJiaGZxLnVzLmF1dGgwLmNvbTAeFw0yNTAxMjUxNTQ1NTFaFw0zODEwMDQxNTQ1NTFaMCwxKjAoBgNVBAMTIWRldi12MjNhZDUzcnpqaWJiaGZxLnVzLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKpGkJeDoJxT/cN2ke1vSoB3q2XLMvU3NdF8pSZ8LT3B/wSx6rLratJ7I/K+PWhf39dCH7rPX9aHU/KAYs6clT0vSWWUhZbB8zTFM+esujyepsLTuHS0DKi0av1TKWYKTKjMQ8yByR/UFvshJBZnIvJbG7ko+YRhCIdJJT2mLSeT5HVrBZTFfKqafGkCwqHutrQ7R36doOFKtkZVbHPiJGXm8raXDCq2ApmifDFeXFXsOhXOpOeidT8ckW0kAqbDqqfEvwPvac1LQXpcjzEVbNQ4GMpxLlyzE32gF36ZHlGMT8+69x+ED/mzEzVxH+6xXEEKAXAjSdaSm99BT36fxQ0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUkHorGG5C9vIXaguSBeCo5ZS/uhkwDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQCSis5m69RS9Q2gD1lKOoGq3RktXxI5FXQ9ok5/qSBVn5SRiyTaMSL+qWIwDLrJFm1M1ADZA1LIqxYvtgQtirreMEl+dIuafD18OxoeO7sKht1P+zZKEKqE2NMMCeWdCKkRCxuEKWnubzNoI4wpPHMF2sFhOEedNOmvhMw475Hf2qwD/UPulJxZEN3338hWPXgt0v2MnQXgtTGrA8eB3+9MmfFjorMCWTdtoPjW4SV5dKZIXWYTcUMOQTbpX+IkxxcYPH5kOFyWT4ZxYmpSFgKf00wO9BiYEt665/iEdw/YKL+ZDOjinCWD/7OOsABwqn0/GRzoo0Z7uRb6LDZ32ZQi",
      ],
      alg: "RS256",
    },
  ],
};

/**
 * Checks if the session data JWT token is valid by checking the signature and expiration date.
 * @param session Clerk session JSON data
 * @returns Promise resolving to boolean indicating session validity
 */
export const isTokenValid = async (token: string): Promise<TokenPayload> => {
  log.info("Validating token.");

  try {
    const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
    // Verify the token's signature and expiration
    const { payload } = await jwtVerify<TokenPayload>(token, JWKS);

    return payload;
  } catch (err) {
    log.error("Error verifying the keys online: ", err);
    log.info("Falling back to local verification.");

    // Do the check offline
    const { payload } = await jwtVerify<TokenPayload>(
      token,
      createLocalJWKSet(OFFLINE_JWKS_SET)
    );

    return payload;
  }
};

/**
 * Refreshes the session data JWT.
 * @param session Clerk session JSON data
 * @returns Promise resolving to new session data or null if refresh fails
 */
export const refreshAuthData = async (
  accessToken: string,
  refreshToken: string
): Promise<UnsafeAuth | null> => {
  try {
    log.info("Refreshing auth.");
    const response = await fetch(API_ENDPOINT + "/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (response.ok) {
      const { data } = (await response.json()) as {
        data: { access_token: string; refresh_token: string };
      };
      const tokenPayload = await isTokenValid(data.access_token);
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenPayload,
      };
    } else {
      log.error(
        "Request was not successful: ",
        response.status,
        await response.text()
      );
      log.error("Token: ", accessToken);
      log.error("Refresh: ", refreshToken);
    }
  } catch (err) {
    log.error("Error refreshing auth data: ", err);
  }
  return null;
};
