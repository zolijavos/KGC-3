/**
 * KGC ERP v3.0 - Lint-staged Configuration
 *
 * Pre-commit hook-ok:
 * - Prettier formatting
 * - ESLint fix
 * - TypeScript check (affected files)
 */
module.exports = {
  // TypeScript/JavaScript fájlok
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // JSON fájlok
  '*.json': ['prettier --write'],

  // Markdown fájlok
  '*.md': ['prettier --write'],

  // YAML fájlok
  '*.{yml,yaml}': ['prettier --write'],

  // CSS/SCSS fájlok
  '*.{css,scss}': ['prettier --write'],
};
