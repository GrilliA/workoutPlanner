export const REFRESH_COOKIE_PATH = "/api/auth";

export type RefreshCookieSettings = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  path: string;
  partitioned?: true;
};

/**
 * The Pages site (grillia.github.io) and the Railway API are different sites.
 * Production cookies are SameSite=None; Secure so the browser stores and sends
 * them on credentialed fetch. Partitioned ties the cookie to that top-level site.
 * Local dev stays SameSite=Lax on http://localhost, where None+Secure is rejected.
 */
export const refreshCookieSettings = (
  nodeEnv: string | undefined = process.env.NODE_ENV,
): RefreshCookieSettings => {
  if (nodeEnv === "production") {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: REFRESH_COOKIE_PATH,
    };
  }

  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
  };
};
