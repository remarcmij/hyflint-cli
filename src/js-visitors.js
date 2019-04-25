const C = require('./constants');
const { isCamelCase, isPascalCase, isShoutCase } = require('./helpers');

const NOISE_AFFIXES = [/\wArray$/, /\wObject$/, /^the/];

module.exports = logger => {
  const VariableDeclaration = (node, state, c) => {
    state.pushNode(node);
    node.declarations.forEach(decl => c(decl, state));
    state.popNode();
  };

  const checkBadName = (name, kind, loc, state) => {
    if (NOISE_AFFIXES.some(regexp => name.match(regexp))) {
      logger.log(loc, { message: C.DETECTED_NOISE_WORD_AFFIX, name, kind });
    } else if (/\d+$/.test(name) && !/^h[1-6]$/.test(name)) {
      logger.log(loc, { message: C.DETECTED_NUMERIC_SUFFIX, name, kind });
    } else if (name === 'l') {
      logger.log(loc, { message: C.DETECTED_NAME_L, name, kind });
    } else if (name === 'x') {
      logger.log(loc, { message: C.DETECTED_NAME_X, name, kind });
    } else if (
      name.length === 1 &&
      !state.findNode('ForStatement') &&
      !state.findNode('ArrowFunctionExpression')
    ) {
      logger.log(loc, { message: C.DETECTED_SINGLE_LETTER_NAME, name, kind });
    }
  };

  const VariableDeclarator = (node, state, c) => {
    const { id, init, loc } = node;
    if (id.type === 'Identifier') {
      const variableDeclaration = state.findNode('VariableDeclaration');
      const { kind } = variableDeclaration;
      checkBadName(id.name, kind, loc, state);

      if (variableDeclaration.kind === 'var') {
        logger.log(loc, { message: C.NO_VAR, kind, name: id.name });
      }
      if (init) {
        if (init.type === 'FunctionExpression' || init.type === 'ArrowExpression') {
          if (!isCamelCase(id.name) && !state.reactDetected) {
            logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind, name: id.name });
          }
        } else if (isShoutCase(id.name)) {
          if (variableDeclaration.kind !== 'const') {
            logger.log(loc, { message: C.CONST_SHOUT_CASE, kind, name: id.name });
          }
        } else if (!isCamelCase(id.name)) {
          logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind, name: id.name });
        }
      }
    } else {
      c(id, state);
    }

    if (init) {
      c(init, state);
    }
  };

  const handleParameterName = (name, loc, state) => {
    checkBadName(name, 'param', loc, state);
    if (!isCamelCase(name)) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'param' });
    }
  };

  const parseFunctionParams = (params, loc, state, c) => {
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
  };

  const FunctionDeclaration = (node, state, c) => {
    const { id, params, body, loc } = node;

    if (!isCamelCase(id.name) && !state.reactDetected) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind: 'function', name: id.name });
    }

    if (state.nestingDepth > 0) {
      logger.log(loc, {
        message: C.DETECTED_NESTED_FUNC_DECLARATION,
        kind: 'function',
        name: id.name,
      });
    }

    state.pushNode(node);
    state.nestingDepth += 1;
    parseFunctionParams(params, loc, state, c);
    c(body, state);
    state.nestingDepth -= 1;
    state.popNode();
  };

  const FunctionExpression = (node, state, c) => {
    state.pushNode(node);
    const { params, body, loc } = node;
    parseFunctionParams(params, loc, state, c);
    c(body, state);
    state.popNode();
  };

  const ArrowFunctionExpression = (node, state, c) => {
    state.pushNode(node);
    const { params, body, loc } = node;
    parseFunctionParams(params, loc, state, c);
    c(body, state);
    state.popNode();
  };

  // Class field
  const FieldDefinition = (node, state, c) => {
    const { key, value, loc } = node;
    if (key.type === 'Identifier') {
      if (!isCamelCase(key.name)) {
        logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind: 'field', name: key.name });
      }
    }
    c(value, state);
  };

  const ForStatement = (node, state, c) => {
    const { init, test, update, loc } = node;
    state.pushNode(node);
    if (init) c(test, state);
    if (test) {
      const { type, object, property } = test.right;
      if (
        type === 'MemberExpression' &&
        property.type === 'Identifier' &&
        property.name === 'length'
      ) {
        logger.log(loc, {
          message: C.DETECTED_CLASSIC_FOR_LOOP,
          kind: 'array',
          name: object.name || '-',
        });
      }
      c(test, state);
    }
    if (update) c(update, state);
    state.popNode();
  };

  const ImportDeclaration = (node, state) => {
    const { source } = node;
    if (source.type === 'Literal' && source.value === 'react') {
      state.reactDetected = true;
    }
  };

  const ClassDeclaration = (node, state, c) => {
    const { id, body, superClass, loc } = node;
    if (!isPascalCase(id.name)) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind: 'class', name: id.name });
    }

    c(body, state);
    if (superClass) {
      c(superClass, state);
    }
  };

  const NewExpression = (node, state, c) => {
    const { callee, arguments: args, loc } = node;
    if (callee.type === 'Identifier') {
      if (!isPascalCase(callee.name)) {
        logger.log(loc, { message: C.EXPECTED_PASCAL_CASE, name: callee.name, kind: 'new' });
      }
    } else {
      c(callee, state);
    }
    args.forEach(arg => c(arg, state));
  };

  return {
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
};
