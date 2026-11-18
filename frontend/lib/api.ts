import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1', timeout: 50000 });
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(item => `${item.loc?.slice(1).join('.') || 'Input'}: ${item.msg}`).join('; ');
    return error.code === 'ECONNABORTED' ? 'The request timed out. Please retry.' : 'Unable to connect to the routing service. Please retry.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
