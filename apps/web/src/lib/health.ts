const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: boolean;
  redis: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`);
  return (await res.json()) as HealthResponse;
}
