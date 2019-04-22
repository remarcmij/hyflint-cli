/* eslint-disable no-console */
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const classFields = require('acorn-class-fields');
const walk = require('acorn-walk');
const jsVisitors = require('./js-visitors');
const jsxVisitors = require('./jsx-visitors');

const JSXParser = acorn.Parser.extend(jsx(), classFields);

function lint(progText, state) {
  const ast = JSXParser.parse(progText, {
    locations: true,
    ecmaVersion: 9,
    sourceType: 'module',
  });

  walk.recursive(ast, state, {
    ...jsVisitors,
    ...jsxVisitors,
  });

  return { issues: state.issues, declarations: state.declarations };
}

module.exports = lint;
