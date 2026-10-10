import { describe, expect, it } from 'vitest';
import type { AxiosResponse } from 'axios';
import {
  ApiResponseError,
  normalizeApiBaseUrl,
  parseArrayResponse,
} from './api';

const response = (data: unknown): AxiosResponse<unknown> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

describe('API contract validation', () => {
  it('normalizes the malformed Netlify Value-prefixed URL', () => {
    expect(normalizeApiBaseUrl(
      'Value https://rakshak-ai-digital-risk-protection.onrender.com/api',
      true,
    )).toBe('https://rakshak-ai-digital-risk-protection.onrender.com/api');
  });

  it('rejects a wrapper object instead of treating it as an empty array', () => {
    expect(() => parseArrayResponse(
      response({ items: [] }),
      '/brands',
      (value): value is { id: number } =>
        typeof value === 'object' && value !== null && 'id' in value,
    )).toThrow(ApiResponseError);
  });

  it('rejects an authentication error object instead of allowing find or map to crash later', () => {
    expect(() => parseArrayResponse(
      response({ detail: 'Not authenticated' }),
      '/alerts',
      (value): value is { id: number } =>
        typeof value === 'object' && value !== null && 'id' in value,
    )).toThrow('Invalid response from /alerts');
  });
});
