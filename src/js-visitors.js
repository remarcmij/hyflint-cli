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
      logger.log(loc, { message: C.NOISE_WORD_AFFIX, name, kind });
    } else if (/\d+$/.test(name) && !/^h[1-6]$/.test(name)) {
      logger.log(loc, { message: C.NUMERIC_SUFFIX, name, kind });
    } else if (name === 'l') {
      logger.log(loc, { message: C.SINGLE_LETTER_NAME_L, name, kind });
    } else if (name === 'x') {
      logger.log(loc, { message: C.SINGLE_LETTER_NAME_X, name, kind });
    } else if (
      name.length === 1 &&
      !state.findNode(C.FOR_STATEMENT) &&
      !state.findNode(C.ARROW_FUNCTION_EXPRESSION)
    ) {
      logger.log(loc, { message: C.SINGLE_LETTER_NAME, name, kind });
    }
  };

  const VariableDeclarator = (node, state, c) => {
    state.pushNode(node);
    const { id, init, loc } = node;
    c(id, state);
    if (init) {
      c(init, state);
    }
    const { jsxDetected } = state.popNode();

    if (id.type === C.IDENTIFIER) {
      const variableDeclaration = state.findNode(C.VARIABLE_DECLARATION);
      const { kind } = variableDeclaration;
      const { name } = id;
      state.addIdentifier(name);
      checkBadName(name, kind, loc, state);

      if (variableDeclaration.kind === 'var') {
        logger.log(loc, { message: C.UNEXPECTED_VAR, name, kind });
      }
      if (init) {
        if (init.type === C.FUNCTION_EXPRESSION || init.type === C.ARROW_FUNCTION_EXPRESSION) {
          if (!isCamelCase(id.name) && !jsxDetected) {
            logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind });
          }
        } else if (isShoutCase(id.name)) {
          if (variableDeclaration.kind !== 'const') {
            logger.log(loc, { message: C.CONST_SHOUT_CASE, name, kind });
          }
        } else if (!isCamelCase(id.name)) {
          logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind });
        }
      }
    }
  };

  const handleParameterName = (name, loc, state) => {
    state.addIdentifier(name);
    checkBadName(name, 'param', loc, state);
    if (!isCamelCase(name)) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'param' });
    }
  };

  const parseFunctionParams = (params, loc, state, c) => {
    params.forEach(param => {
      switch (param.type) {
        case C.IDENTIFIER:
          handleParameterName(param.name, loc, state);
          break;
        case C.ASSIGNMENT_PATTERN:
          handleParameterName(param.left.name, loc, state);
          c(param.right, state);
          break;
        case C.REST_ELEMENT:
          handleParameterName(param.argument.name, loc, state);
          break;
        case C.ARRAY_PATTERN:
          param.elements.forEach(element => handleParameterName(element.name, loc, state));
          break;
        case C.OBJECT_PATTERN:
          // Parameter names are taken from object properties
          break;
        default:
      }
    });
  };

  const FunctionDeclaration = (node, state, c) => {
    const { id, params, body, loc } = node;
    state.addIdentifier(id.name);

    state.pushNode(node);
    state.nestingDepth += 1;
    c(id, state);
    params.forEach(param => c(param, state));
    c(body, state);
    state.nestingDepth -= 1;
    const { jsxDetected } = state.popNode();

    parseFunctionParams(params, loc, state, c);

    if (!isCamelCase(id.name) && !jsxDetected) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name: id.name, kind: 'function' });
    }

    if (state.nestingDepth > 0) {
      logger.log(loc, {
        message: C.NESTED_FUNC_DECLARATION,
        kind: 'function',
        name: id.name,
      });
    }
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

  const ForStatement = (node, state, c) => {
    const { init, test, update, loc } = node;
    state.pushNode(node);
    if (init) {
      c(init, state);
    }
    if (test) {
      const { type, object, property } = test.right;
      if (
        type === C.MEMBER_EXPRESSION &&
        property.type === C.IDENTIFIER &&
        property.name === 'length'
      ) {
        logger.log(loc, {
          message: C.CLASSIC_FOR_LOOP,
          name: object.name || '-',
          kind: 'array',
        });
      }
      c(test, state);
    }
    if (update) c(update, state);
    state.popNode();
  };

  const NewExpression = (node, state, c) => {
    const { callee, arguments: args, loc } = node;
    c(callee, state);
    args.forEach(arg => c(arg, state));
    if (callee.type === C.IDENTIFIER && !isPascalCase(callee.name)) {
      logger.log(loc, { message: C.EXPECTED_PASCAL_CASE, name: callee.name, kind: 'new' });
    }
  };

  const ClassDeclaration = (node, state, c) => {
    const { id, body, superClass, loc } = node;
    c(body, state);
    if (superClass) {
      c(superClass, state);
    }

    const { name } = id;
    state.addIdentifier(name);
    if (!isPascalCase(name)) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'class' });
    }
  };

  const MethodDefinition = (node, state, c) => {
    const { key, value, loc } = node;
    c(key, state);
    c(value, state);
    if (key === C.IDENTIFIER) {
      const { name } = key;
      state.addIdentifier(name);
      if (!isPascalCase(name)) {
        logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'method' });
      }
    }
  };

  // Class field
  const FieldDefinition = (node, state, c) => {
    const { key, value, loc } = node;
    c(key, state);
    c(value, state);
    if (key.type === C.IDENTIFIER) {
      const { name } = key;
      state.addIdentifier(name);
      if (!isCamelCase(name)) {
        logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'field' });
      }
    }
  };

  return {
    ArrowFunctionExpression,
    ClassDeclaration,
    FieldDefinition,
    ForStatement,
    FunctionDeclaration,
    FunctionExpression,
    MethodDefinition,
    NewExpression,
    VariableDeclaration,
    VariableDeclarator,
  };
};
