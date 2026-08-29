export const EVALFORGE_SERVICE_BASE_URL =
  "https://evalforge-test-buddy.lovable.app/api/public" as const;

export const SERVICE_ENDPOINTS = {
  generate: `${EVALFORGE_SERVICE_BASE_URL}/generate`,
  evaluate: `${EVALFORGE_SERVICE_BASE_URL}/evaluate`,
  analyze: `${EVALFORGE_SERVICE_BASE_URL}/analyze`,
  recommend: `${EVALFORGE_SERVICE_BASE_URL}/recommend`,
} as const;
