const C = require('./constants');

const JAVASCRIPT_STATEMENTS = new Set([
  'break',
  'continue',
  'if',
  'else',
  'switch',
  'throw',
  'try',
  'catch',
  'var',
  'let',
  'const',
  'function',
  'async',
  'return',
  'class',
  'do',
  'while',
  'for',
  'await',
]);

function detectCommentedOutCode(progText, logger) {
  const lines = progText.split('\n');

  const iter = lines[Symbol.iterator]();
  let node = iter.next();
  let line = 1;

  while (!node.done) {
    const matches = node.value.match(/^\s*\/\/.*?([a-zA-Z_]+)/);

    if (matches && JAVASCRIPT_STATEMENTS.has(matches[1])) {
      logger.log(line, C.WARNING, { message: C.COMMENTED_OUT_CODE });

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
      logger.log(line, C.WARNING, { message: C.NO_ESLINT_DISABLE });
    }
    node = iter.next();
    line += 1;
  }
}

module.exports = { detectCommentedOutCode, detectESLintDisable };
