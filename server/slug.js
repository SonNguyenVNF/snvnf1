'use strict';

const DIACRITIC_MAP = { đ: 'd', Đ: 'D' };

function slugify(title) {
  const withoutD = title.replace(/[đĐ]/g, (ch) => DIACRITIC_MAP[ch]);
  const base = withoutD
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  const suffix = Date.now().toString(36);
  return base ? `${base}-${suffix}` : suffix;
}

module.exports = { slugify };
