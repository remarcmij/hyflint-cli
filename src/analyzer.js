const C = require('./constants');

const JAVASCRIPT_KEYWORDS = new Set([
  'Array',
  'async',
  'await',
  'break',
  'catch',
  'class',
  'const',
  'continue',
  'do',
  'else',
  'for',
  'function',
  'if',
  'let',
  'Object',
  'return',
  'switch',
  'throw',
  'try',
  'var',
  'while',
  'in',
  'new',
  'case',
  'null',
  'true',
  'void',
  'with',
  'false',
  'delete',
  'export',
  'import',
  'public',
  'static',
  'default',
  'package',
  'private',
  'interface',
]);

const FIRST_KEYWORD_ON_LINE_REGEXP = /^\s*\/\/.*?([a-zA-Z_]\w*)/;

function detectCommentedOutCode(progText, identifiers, logger) {
  const lines = progText.split('\n');

  const iter = lines[Symbol.iterator]();
  let node = iter.next();
  let line = 1;

  while (!node.done) {
    const [, keyword] = node.value.match(FIRST_KEYWORD_ON_LINE_REGEXP) || [];

    if (
      keyword &&
      (JAVASCRIPT_KEYWORDS.has(keyword) || identifiers.has(keyword))
    ) {
      logger.log(line, { message: C.COMMENTED_OUT_CODE });

      while (!node.done && /^\s*\/\//.test(node.value)) {
        node = iter.next();
        line += 1;
      }
    }

    node = iter.next();
    line += 1;
  }
}

function detectESLintDisable(progText, logger) {
  const lines = progText.split('\n');

  const iter = lines[Symbol.iterator]();
  let node = iter.next();
  let line = 1;

  while (!node.done) {
    if (/^\s*\/[/*]\s*eslint-disable/.test(node.value)) {
      logger.log(line, { message: C.ESLINT_DISABLE });
    }
    node = iter.next();
    line += 1;
  }
}

module.exports = { detectCommentedOutCode, detectESLintDisable };
