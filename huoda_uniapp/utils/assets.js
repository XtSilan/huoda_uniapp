import { SERVER_ORIGIN } from '../config/api';

export function resolveAssetUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (!SERVER_ORIGIN) {
    return normalized;
  }
  return `${SERVER_ORIGIN}/api/assets/object?path=${encodeURIComponent(normalized)}`;
}

export default {
  resolveAssetUrl
};
