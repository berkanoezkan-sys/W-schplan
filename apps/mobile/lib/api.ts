import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:3001';

export function getApiUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl ??
    DEFAULT_API_URL
  );
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new ApiError(`Cannot reach API at ${getApiUrl()}`, 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? 'Upload failed', response.status, data.code);
  }
  return data as T;
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getApiUrl()}${path}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...rest,
      headers: {
        ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(`Cannot reach API at ${getApiUrl()}`, 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.code);
  }

  return data as T;
}
