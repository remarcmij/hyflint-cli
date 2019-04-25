/* eslint-disable no-console */
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const classFields = require('acorn-class-fields');
const walk = require('acorn-walk');
const State = require('./state');
const jsVisitors = require('./js-visitors');
const jsxVisitors = require('./jsx-visitors');

const JSXParser = acorn.Parser.extend(jsx(), classFields);

function lint(progText, logger) {
  const state = new State();
  const ast = JSXParser.parse(progText, {
    locations: true,
    ecmaVersion: 9,
    sourceType: 'module',
  });

  walk.recursive(ast, state, {
    ...jsVisitors(logger),
    ...jsxVisitors(logger),
  });
}

module.exports = lint;
