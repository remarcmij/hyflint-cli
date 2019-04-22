const C = require('./constants');
const { isCamelCase, isPascalCase, isShoutCase } = require('./helpers');

const NOISE_AFFIXES = [/\wArray$/, /\wObject$/, /^the/];
const GENERIC_NAMES = ['data', 'info'];

function VariableDeclaration(node, state, c) {
  // console.log('VariableDeclaration :', node);
  state.variableDeclaration = node;
  node.declarations.forEach(decl => c(decl, state));
  state.variableDeclaration = null;
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
  } else if (name.length === 1 && !state.forStatement && !state.arrowFunctionExpression) {
    state.log({
      loc,
      message: C.AVOID_SINGLE_LETTER_NAMES,
      name,
      kind,
    });
  } else if (GENERIC_NAMES.includes(name)) {
    state.log({
      loc,
      message: C.AVOID_GENERIC_NAMES,
      name,
      kind,
    });
  }
}

function VariableDeclarator(node, state, c) {
  // console.log('VariableDeclarator :', node);
  const { id, init, loc } = node;
  if (id.type === 'Identifier') {
    state.addVariableName(id.name, state.variableDeclaration.kind, loc);
    checkBadName(id.name, state.variableDeclaration.kind, loc, state);

    if (state.variableDeclaration.kind === 'var') {
      state.log({ loc, message: C.NO_VAR, kind: state.variableDeclaration.kind, name: id.name });
    }
    if (init) {
      if (init.type === 'FunctionExpression' || init.type === 'ArrowExpression') {
        if (!isCamelCase(id.name) && !state.reactDetected) {
          state.log({
            loc,
            message: C.USE_CAMEL_CASE,
            kind: state.variableDeclaration.kind,
            name: id.name,
          });
        }
      } else if (isShoutCase(id.name)) {
        if (state.variableDeclaration.kind !== 'const') {
          state.log({
            loc,
            message: C.CONST_SHOUT_CASE,
            kind: state.variableDeclaration.kind,
            name: id.name,
          });
        }
      } else if (!isCamelCase(id.name)) {
        state.log({
          loc,
          message: C.USE_CAMEL_CASE,
          kind: state.variableDeclaration.kind,
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

function NewExpression(node, state, c) {
  // console.log('NewExpression :', node);
  const { callee, arguments: args, loc } = node;
  if (callee.type === 'Identifier') {
    if (!isPascalCase(callee.name)) {
      state.log({
        loc,
        message: C.EXPECTED_PASCAL_CASE,
        name: callee.name,
        kind: state.variableDeclaration.kind,
      });
    }
  } else {
    c(callee, state);
  }
  args.forEach(arg => c(arg, state));
}

function checkParameterName(name, loc, state) {
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
        checkParameterName(param.name, loc, state);
        break;
      case 'AssignmentPattern':
        checkParameterName(param.left.name, loc, state);
        c(param.right, state);
        break;
      case 'RestElement':
        checkParameterName(param.argument.name, loc, state);
        break;
      case 'ArrayPattern':
        param.elements.forEach(element => checkParameterName(element.name, loc, state));
        break;
      case 'ObjectPattern':
        // TODO: do we need this?
        break;
      default:
    }
  });
  state.kind = null;
}

function FunctionDeclaration(node, state, c) {
  // console.log('FunctionDeclaration :', node);
  const { id, params, body, loc } = node;
  // if (id !== null) {
  state.addFunctionName(id.name, loc);

  if (!isCamelCase(id.name) && !state.reactDetected) {
    state.log({ loc, message: C.USE_CAMEL_CASE, kind: 'function', name: id.name });
  }

  if (state.functionNesting > 0) {
    state.log({ loc, message: C.NO_NESTED_FUNC_DECLARATIONS, kind: 'function', name: id.name });
  }

  parseFunctionParams(params, loc, state, c);

  state.functionNesting += 1;
  c(body, state);
  state.functionNesting -= 1;
}

function FunctionExpression(node, state, c) {
  // console.log('FunctionExpression :', node);
  const { params, body, loc } = node;
  parseFunctionParams(params, loc, state, c);
  c(body, state);
}

function ArrowFunctionExpression(node, state, c) {
  // console.log('ArrowFunctionExpression :', node);
  const { params, body, loc } = node;
  state.arrowFunctionExpression = node;
  parseFunctionParams(params, loc, state, c);
  state.arrowFunctionExpression = null;
  c(body, state);
}

// Class field
function FieldDefinition(node, state, c) {
  const { key, value, loc } = node;
  if (key.type === 'Identifier') {
    state.addClassField(`${state.classDeclaration.id.name}.${key.name}`, loc);
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
  state.forStatement = node;
  c(init, state);
  c(test, state);
  c(update, state);
  state.forStatement = null;
}

function ImportDeclaration(node, state) {
  const { source } = node;
  if (source.type === 'Literal' && source.value === 'react') {
    state.reactDetected = true;
  }
}

function ClassDeclaration(node, state, c) {
  const { id, body, superClass, loc } = node;
  state.addClassName(id.name, loc);
  if (!isPascalCase(id.name)) {
    state.log({ loc, message: C.USE_CAMEL_CASE, kind: 'class', name: id.name });
  }

  state.classDeclaration = node;
  c(body, state);
  state.classDeclaration = null;

  if (superClass) {
    c(superClass, state);
  }
}

function MethodDefinition(node, state, c) {
  // console.log('MethodDefinition :', node);
  const { key, value, kind, loc } = node;
  switch (kind) {
    case 'constructor':
      break;
    case 'method':
      state.addMethodDefinition(`${state.classDeclaration.id.name}.${key.name}`, loc);
      break;
    case 'get': // TODO: implement?
      break;
    case 'set': // TODO: implement
      break;
    default:
      throw new Error(`Unexpected method kind: ${kind}`);
  }
  c(value, state);
}

module.exports = {
  ArrowFunctionExpression,
  ClassDeclaration,
  FieldDefinition,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  MethodDefinition,
  NewExpression,
  VariableDeclaration,
  VariableDeclarator,
};
