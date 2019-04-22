const C = require('./constants');
const { isCamelCase, isPascalCase, isShoutCase } = require('./helpers');

const NOISE_AFFIXES = [/\wArray$/, /\wObject$/, /^the/];

function VariableDeclaration(node, state, c) {
  state.pushNode(node);
  node.declarations.forEach(decl => c(decl, state));
  state.popNode();
}

function checkBadName(name, kind, loc, state) {
  if (NOISE_AFFIXES.some(regexp => name.match(regexp))) {
    state.log({
      loc,
      message: C.DROP_NOISE_AFFIX,
      name,
      kind,
    });
  } else if (/\d+$/.test(name) && !/^h[1-6]$/.test(name)) {
    state.log({
      loc,
      message: C.REPLACE_NUMERIC_SUFFIX,
      name,
      kind,
    });
  } else if (name === 'l') {
    state.log({
      loc,
      message: C.AVOID_LETTER_L,
      name,
      kind,
    });
  } else if (name === 'x') {
    state.log({
      loc,
      message: C.AVOID_LETTER_X,
      name,
      kind,
    });
  } else if (
    name.length === 1 &&
    !state.findNode('ForStatement') &&
    !state.findNode('ArrowFunctionExpression')
  ) {
    state.log({
      loc,
      message: C.AVOID_SINGLE_LETTER_NAMES,
      name,
      kind,
    });
  }
}

function VariableDeclarator(node, state, c) {
  const { id, init, loc } = node;
  if (id.type === 'Identifier') {
    const variableDeclaration = state.findNode('VariableDeclaration');
    checkBadName(id.name, variableDeclaration.kind, loc, state);

    if (variableDeclaration.kind === 'var') {
      state.log({ loc, message: C.NO_VAR, kind: variableDeclaration.kind, name: id.name });
    }
    if (init) {
      if (init.type === 'FunctionExpression' || init.type === 'ArrowExpression') {
        if (!isCamelCase(id.name) && !state.reactDetected) {
          state.log({
            loc,
            message: C.USE_CAMEL_CASE,
            kind: variableDeclaration.kind,
            name: id.name,
          });
        }
      } else if (isShoutCase(id.name)) {
        if (variableDeclaration.kind !== 'const') {
          state.log({
            loc,
            message: C.CONST_SHOUT_CASE,
            kind: variableDeclaration.kind,
            name: id.name,
          });
        }
      } else if (!isCamelCase(id.name)) {
        state.log({
          loc,
          message: C.USE_CAMEL_CASE,
          kind: variableDeclaration.kind,
          name: id.name,
        });
      }
    }
  } else {
    c(id, state);
  }

  if (init) {
    c(init, state);
  }
}

function handleParameterName(name, loc, state) {
  checkBadName(name, 'param', loc, state);
  if (!isCamelCase(name)) {
    state.log({ loc, message: C.USE_CAMEL_CASE, name, kind: 'param' });
  }
}

function parseFunctionParams(params, loc, state, c) {
  state.kind = 'param';
  params.forEach(param => {
    switch (param.type) {
      case 'Identifier':
        handleParameterName(param.name, loc, state);
        break;
      case 'AssignmentPattern':
        handleParameterName(param.left.name, loc, state);
        c(param.right, state);
        break;
      case 'RestElement':
        handleParameterName(param.argument.name, loc, state);
        break;
      case 'ArrayPattern':
        param.elements.forEach(element => handleParameterName(element.name, loc, state));
        break;
      case 'ObjectPattern':
        // Parameter names are taken from object properties
        break;
      default:
    }
  });
  state.kind = null;
}

function FunctionDeclaration(node, state, c) {
  const { id, params, body, loc } = node;

  if (!isCamelCase(id.name) && !state.reactDetected) {
    state.log({ loc, message: C.USE_CAMEL_CASE, kind: 'function', name: id.name });
  }

  if (state.nestingDepth > 0) {
    state.log({ loc, message: C.AVOID_NESTED_FUNC_DECLARATIONS, kind: 'function', name: id.name });
  }

  state.pushNode(node);
  state.nestingDepth += 1;
  parseFunctionParams(params, loc, state, c);
  c(body, state);
  state.nestingDepth -= 1;
  state.popNode();
}

function FunctionExpression(node, state, c) {
  state.pushNode(node);
  const { params, body, loc } = node;
  parseFunctionParams(params, loc, state, c);
  c(body, state);
  state.popNode();
}

function ArrowFunctionExpression(node, state, c) {
  state.pushNode(node);
  const { params, body, loc } = node;
  parseFunctionParams(params, loc, state, c);
  c(body, state);
  state.popNode();
}

// Class field
function FieldDefinition(node, state, c) {
  const { key, value, loc } = node;
  if (key.type === 'Identifier') {
    if (!isCamelCase(key.name)) {
      state.log(loc.start.line, {
        message: C.USE_CAMEL_CASE,
        kind: 'field',
        name: key.name,
      });
    }
  }
  c(value, state);
}

function ForStatement(node, state, c) {
  const { init, test, update } = node;
  state.pushNode(node);
  if (init) c(init, state);
  if (test) c(test, state);
  if (update) c(update, state);
  state.popNode();
}

function ImportDeclaration(node, state) {
  const { source } = node;
  if (source.type === 'Literal' && source.value === 'react') {
    state.reactDetected = true;
  }
}

function ClassDeclaration(node, state, c) {
  const { id, body, superClass, loc } = node;
  if (!isPascalCase(id.name)) {
    state.log({ loc, message: C.USE_CAMEL_CASE, kind: 'class', name: id.name });
  }

  c(body, state);
  if (superClass) {
    c(superClass, state);
  }
}

function NewExpression(node, state, c) {
  const { callee, arguments: args, loc } = node;
  if (callee.type === 'Identifier') {
    if (!isPascalCase(callee.name)) {
      state.log({
        loc,
        message: C.EXPECTED_PASCAL_CASE,
        name: callee.name,
        kind: 'new',
      });
    }
  } else {
    c(callee, state);
  }
  args.forEach(arg => c(arg, state));
}

module.exports = {
  ArrowFunctionExpression,
  ClassDeclaration,
  FieldDefinition,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  NewExpression,
  VariableDeclaration,
  VariableDeclarator,
};
