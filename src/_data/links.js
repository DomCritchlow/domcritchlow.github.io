const fs = require('fs');
const path = require('path');

const slugify = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = () => {
  const filePath = path.join(__dirname, '..', 'links.json');

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((link) => link && link.nickname && link.url)
      .map((link) => {
        const nickname = link.nickname.toString();
        return {
          nickname,
          url: link.url,
          label: link.label || nickname,
          slug: link.slug || slugify(nickname),
        };
      });
  } catch (error) {
    console.warn('Unable to parse links from src/links.json:', error.message);
    return [];
  }
};
