/* eslint-disable no-console */
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const classFields = require('acorn-class-fields');
const walk = require('acorn-walk');
const jsVisitors = require('./js-visitors');
const jsxVisitors = require('./jsx-visitors');
const WalkerState = require('./walker-state');

const JSXParser = acorn.Parser.extend(jsx(), classFields);

function lint(progText, logger) {
  const state = new WalkerState(logger);

  const ast = JSXParser.parse(progText, {
    locations: true,
    ecmaVersion: 9,
    sourceType: 'module',
  });

  walk.recursive(ast, state, {
    ...jsVisitors,
    ...jsxVisitors,
  });
}

module.exports = lint;
