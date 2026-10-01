let csrfToken;
let csrfPromise;
let refreshPromise;
export class ApiError extends Error {
  constructor(status, data, retryAfter) {
    super(data.message || 'Could not complete the request.');
    this.status = status;
    this.fields = data.fields;
    this.challengeId = data.challengeId;
    this.retryAfter = retryAfter;
  }
}
async function decode(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: 'The account service is unavailable. Start the backend and try again.' };
  }
  if (!response.ok)
    throw new ApiError(response.status, data, Number(response.headers.get('Retry-After')) || 0);
  return data;
}
async function csrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise)
    csrfPromise = fetch('/api/v1/auth/csrf', { credentials: 'include' })
      .then(decode)
      .then((data) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .catch((error) => {
        if (error instanceof ApiError) throw error;
        throw new ApiError(0, {
          message: 'Cannot reach the account service. Start the backend and try again.',
        });
      })
      .finally(() => {
        csrfPromise = null;
      });
  return csrfPromise;
}
async function send(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = await csrf();
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'include',
      headers,
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
    });
  } catch {
    throw new ApiError(0, {
      message: 'Cannot reach the account service. Start the backend and try again.',
    });
  }
  return decode(response);
}
export async function api(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    if (
      error.status !== 401 ||
      [
        '/auth/login',
        '/auth/signup',
        '/auth/verify-email',
        '/auth/resend-code',
        '/auth/refresh',
        '/auth/logout',
      ].includes(path)
    )
      throw error;
    if (!refreshPromise)
      refreshPromise = send('/auth/refresh', { method: 'POST' }).finally(() => {
        refreshPromise = null;
      });
    await refreshPromise;
    return send(path, options);
  }
}
export function clearCsrf() {
  csrfToken = undefined;
}
