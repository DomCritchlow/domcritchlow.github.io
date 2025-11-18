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
  const filePath = path.join(__dirname, '..', 'links.md');

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/```json\s*([\s\S]*?)\s*```/);

  if (!match) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1]);

    return parsed
      .filter((link) => link.nickname && link.url)
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
    console.warn('Unable to parse links from src/links.md:', error.message);
    return [];
  }
};
