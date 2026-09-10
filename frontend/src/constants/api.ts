export const EVALFORGE_SERVICE_BASE_URL = "/api/evalforge";
export const REASONING_SERVICE_TIMEOUT_MS = 55_000;

export const SERVICE_ENDPOINTS = {
  generate: `${EVALFORGE_SERVICE_BASE_URL}/generate`,
  evaluate: `${EVALFORGE_SERVICE_BASE_URL}/evaluate`,
  analyze: `${EVALFORGE_SERVICE_BASE_URL}/analyze`,
  recommend: `${EVALFORGE_SERVICE_BASE_URL}/recommend`,
} as const;
