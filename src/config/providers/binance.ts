// BINANCE
export const BINANCE_BASE_URLS = {
  spot: 'https://api.binance.com/api/v3',
  futures: 'https://fapi.binance.com/fapi/v1',
} as const;

export const BINANCE_PER_REQUEST_LIMIT = 1_000; // технический cap Binance
