const configuredOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)

export function isAllowedOrigin(origin?: string) {
  return configuredOrigins.length === 0 || !origin || configuredOrigins.includes(origin)
}
