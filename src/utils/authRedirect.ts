/**
 * Resolve where to send the user after a successful login/signup.
 * Priority:
 *  1. Explicit redirect path from navigation state (e.g. /store/cart from checkout)
 *  2. Role-based default (admin → dashboard, user → store home)
 */
export function getPostLoginRedirect(
  user: { role?: string } | null | undefined,
  from?: string | null
): string {
  // Prefer the page the user was trying to reach (e.g. cart / checkout)
  if (from && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    // Never bounce admins into admin area if they came from store checkout intent
    return from;
  }
  const role = user?.role || 'user';
  if (role === 'admin') {
    return '/dashboard';
  }
  return '/store/home';
}
/**
 * Persist auth session in localStorage using the shapes used across the app.
 */
export function persistAuthSession(payload: any): { token: string; user: any } {
  const token =
    payload?.token ||
    payload?.accessToken ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    '';
  const user =
    payload?.user ||
    payload?.data?.user ||
    null;
  const sessionExpiry =
    payload?.sessionExpiry ||
    payload?.data?.sessionExpiry ||
    (Date.now() + 24 * 60 * 60 * 1000);
  const sessionId =
    payload?.sessionId ||
    payload?.data?.sessionId ||
    '';
  if (token) {
    localStorage.setItem('authToken', token);
  }
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  localStorage.setItem('sessionExpiry', String(sessionExpiry));
  if (sessionId) {
    localStorage.setItem('sessionId', sessionId);
  }
  // Notify CartContext (and others) that auth state changed in this tab
  try {
    window.dispatchEvent(new Event('auth-changed'));
  } catch {
    // ignore
  }
  return { token, user };
}
