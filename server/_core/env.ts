const readEnv = (name: string) => process.env[name] ?? "";

export const ENV = {
  appId: readEnv("VITE_APP_ID"),
  cookieSecret: readEnv("JWT_SECRET"),
  databaseUrl: readEnv("DATABASE_URL"),
  oAuthServerUrl: readEnv("OAUTH_SERVER_URL"),
  ownerOpenId: readEnv("OWNER_OPEN_ID"),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: readEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: readEnv("BUILT_IN_FORGE_API_KEY"),
};

const requiredInProduction = [
  ["JWT_SECRET", ENV.cookieSecret],
  ["VITE_APP_ID", ENV.appId],
  ["OAUTH_SERVER_URL", ENV.oAuthServerUrl],
  ["DATABASE_URL", ENV.databaseUrl],
  ["BUILT_IN_FORGE_API_URL", ENV.forgeApiUrl],
  ["BUILT_IN_FORGE_API_KEY", ENV.forgeApiKey],
] as const;

if (ENV.isProduction) {
  const missing = requiredInProduction.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  if (/^(.)\1+$/.test(ENV.cookieSecret) || ENV.cookieSecret.toLowerCase().includes("changeme")) {
    throw new Error("JWT_SECRET appears to be a placeholder and cannot be used in production");
  }
}
