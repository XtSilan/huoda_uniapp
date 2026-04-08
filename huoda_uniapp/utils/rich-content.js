import { resolveAssetUrl } from './assets';

function normalizeSourceUrl(value) {
  const source = String(value || '').trim();
  if (!source) {
    return '';
  }
  if (/^(https?:)?\/\//i.test(source) || /^data:/i.test(source)) {
    return source;
  }
  if (/^\/api\/assets\/object\?/i.test(source)) {
    return source;
  }
  if (/^(\/)?uploads\//i.test(source)) {
    return resolveAssetUrl(source.replace(/^\/+/, ''));
  }
  return resolveAssetUrl(source);
}

function stripUnsafeTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
}

function patchImageTag(tag) {
  const sourceMatch = tag.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);
  const source = sourceMatch ? sourceMatch[2] : '';
  const nextSource = normalizeSourceUrl(source);
  if (!nextSource) {
    return tag;
  }

  let nextTag = tag.replace(/\ssrc\s*=\s*(['"])(.*?)\1/i, ` src="${nextSource}"`);
  const hasStyle = /\sstyle\s*=\s*(['"])(.*?)\1/i.test(nextTag);
  if (hasStyle) {
    nextTag = nextTag.replace(/\sstyle\s*=\s*(['"])(.*?)\1/i, (_m, quote, styleText) => {
      const style = String(styleText || '').trim();
      const extra = 'max-width:100%;height:auto;';
      return ` style=${quote}${style}${style.endsWith(';') ? '' : ';'}${extra}${quote}`;
    });
  } else {
    nextTag = nextTag.replace(/<img/i, '<img style="max-width:100%;height:auto;"');
  }
  return nextTag;
}

function patchLinkTag(tag) {
  const hrefMatch = tag.match(/\shref\s*=\s*(['"])(.*?)\1/i);
  const href = hrefMatch ? hrefMatch[2] : '';
  const nextHref = normalizeSourceUrl(href) || href;
  if (!nextHref) {
    return tag;
  }
  return tag.replace(/\shref\s*=\s*(['"])(.*?)\1/i, ` href="${nextHref}"`);
}

export function normalizeRichContent(html) {
  const source = stripUnsafeTags(html);
  return source
    .replace(/<img\b[^>]*?>/gi, (tag) => patchImageTag(tag))
    .replace(/<a\b[^>]*?>/gi, (tag) => patchLinkTag(tag));
}

export function richTextSummary(value, maxLen = 120) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return '';
  }
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export default {
  normalizeRichContent,
  richTextSummary
};
