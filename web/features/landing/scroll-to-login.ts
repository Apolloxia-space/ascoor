import { paths } from '@shared/constants/paths';

export function scrollToLogin(options?: { emphasize?: boolean }) {
  if (typeof document === 'undefined') return false;
  if (window.location.pathname !== paths.home) return false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (options?.emphasize) {
    window.dispatchEvent(new Event('landing-login-emphasis'));
  }
  return true;
}
