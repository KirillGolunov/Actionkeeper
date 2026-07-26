'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const translationsPath = path.join(rootDir, 'client', 'src', 'i18n', 'translations.js');
const clientSourceDir = path.join(rootDir, 'client', 'src');

function loadTranslations() {
  const source = fs
    .readFileSync(translationsPath, 'utf8')
    .replace('export const translations =', 'const translations =');
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.__translations = translations;`, context, {
    filename: translationsPath,
  });
  return context.__translations;
}

function flattenLeaves(value, prefix = '', result = {}) {
  Object.entries(value || {}).forEach(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenLeaves(child, fullKey, result);
    } else {
      result[fullKey] = child;
    }
  });
  return result;
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([^{}]+?)\s*}}/g)]
    .map((match) => match[1])
    .sort();
}

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.(?:js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function literalTranslationUsages() {
  const usages = [];
  const literalCall = /(?<![\w$.])t\(\s*(['"])([^'"]+)\1/g;

  listSourceFiles(clientSourceDir).forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(literalCall)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      usages.push({
        key: match[2],
        location: `${path.relative(rootDir, filePath)}:${line}`,
      });
    }
  });

  return usages;
}

test('RU and EN translation catalogs have identical non-empty leaves and placeholders', () => {
  const translations = loadTranslations();
  const ru = flattenLeaves(translations.ru);
  const en = flattenLeaves(translations.en);
  const ruKeys = Object.keys(ru).sort();
  const enKeys = Object.keys(en).sort();

  assert.deepEqual(ruKeys, enKeys, 'RU and EN translation keys must match');

  ruKeys.forEach((key) => {
    assert.equal(typeof ru[key], 'string', `RU translation must be a string: ${key}`);
    assert.equal(typeof en[key], 'string', `EN translation must be a string: ${key}`);
    assert.notEqual(ru[key].trim(), '', `RU translation must not be empty: ${key}`);
    assert.notEqual(en[key].trim(), '', `EN translation must not be empty: ${key}`);
    assert.deepEqual(
      placeholders(ru[key]),
      placeholders(en[key]),
      `Interpolation variables must match for ${key}`
    );
  });
});

test('literal t() calls reference keys present in both catalogs', () => {
  const translations = loadTranslations();
  const ru = flattenLeaves(translations.ru);
  const en = flattenLeaves(translations.en);
  const missing = literalTranslationUsages()
    .filter(({ key }) => !(key in ru) || !(key in en))
    .map(({ key, location }) => `${key} (${location})`);

  assert.deepEqual(missing, [], `Missing literal translation keys:\n${missing.join('\n')}`);
});

