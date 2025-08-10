// Бизнес-лимиты API
export const MAX_CANDLES_PER_REQUEST = 10_000; // наш глобальный cap

// Параметры ретраев для внешних источников маркет-данных
export const HTTP_MAX_RETRIES_MARKETDATA = 3;
export const HTTP_RETRY_BASE_DELAY_MS = 250;
export const HTTP_RETRY_FACTOR = 2; // экспоненциальный backoff
export const HTTP_RETRY_MAX_DELAY_MS = 2_000;
export const HTTP_RETRY_JITTER = true; // чуть «дрожи» для разведения шипов

// ограничение на количество дыр/окн
export const MAX_GAP_FETCHES = 3;

// Repair job (ночной self-heal)
export const REPAIR_JOB_MAX_RETRIES = 5;
export const REPAIR_JOB_LOOKBACK_DAYS = 7;

// Сколько последних закрытых баров принудительно пересинхронизировать (upsert) при каждом запросе
// 0 — отключено; 2–5 — разумные значения. По умолчанию 3.
export const TAIL_RECONCILIATION_BARS = 3;
