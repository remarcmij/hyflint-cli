const C = require('./constants');
const { isPascalCase } = require('./helpers');

const MAP_FILTER = ['map', 'filter', 'reduce', 'forEach'];

function VariableDeclaration(node, state, c) {
  const { declarations, loc } = node;
  const names = declarations.filter(decl => decl.type === 'Identifier').map(decl => decl.id.name);
  names.forEach(name => state.checkName(name, node.kind, loc));
  declarations.forEach(decl => decl.init && c(decl.init, state));
}

function Function(node, state, c) {
  const { type, id, body, loc } = node;
  if (id !== null) {
    if (state.functionNesting > 0) {
      state.logger.log(loc.start.line, C.WARNING, {
        message: C.NO_NESTED_FUNC_DECLARATIONS,
        kind: 'function',
        name: id.name,
      });
    }
    state.functionNesting += 1;
    if (id) {
      if (isPascalCase(id.name)) {
        state.logger.log(loc.start.line, C.WARNING, {
          message: C.VERIFY_PASCAL_CASE,
          kind: 'function',
          name: id.name,
        });
      }
    }
  }
  node.params.forEach(param => {
    if (param.type === 'Identifier') {
      state.checkName(param.name, 'param', loc);
    } else if (param.type === 'AssignmentPattern') {
      state.checkName(param.left.name, 'param', loc);
    }
  });

  c(body, state);

  if (type !== 'ArrowFunctionExpression') {
    state.functionNesting -= 1;
  }
}

function MemberExpression(node, state, c) {
  const { loc, object, property } = node;
  if (
    object.type === 'Identifier' &&
    property.type === 'Identifier' &&
    MAP_FILTER.includes(property.name) &&
    !object.name.endsWith('s')
  ) {
    state.logger.log(loc.start.line, C.WARNING, {
      message: C.USE_PLURAL_NAME,
      kind: 'array',
      name: object.name,
    });
  }

  c(object, state);
  c(property, state);
}

function FieldDefinition(node, state, c) {
  const { key, value, loc } = node;
  if (key.type === 'Identifier') {
    state.checkName(key.name, 'field', loc);
  }
  c(value, state);
}

module.exports = {
  VariableDeclaration,
  Function,
  MemberExpression,
  FieldDefinition,
};
