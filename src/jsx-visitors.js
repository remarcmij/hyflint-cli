const C = require('./constants');
const { html5ElementSet, deprecatedHtmlElementSet } = require('./html-elements');
const { isCamelCase, isPascalCase } = require('./helpers');

module.exports = logger => {
  const JSXElement = (node, state, c) => {
    const { openingElement, children } = node;
    c(openingElement, state);
    children.forEach(child => c(child, state));
  };

  const JSXOpeningElement = (node, state, c) => {
    const { name, loc } = node;
    if (name.type === 'JSXIdentifier') {
      if (deprecatedHtmlElementSet.has(name.name)) {
        logger.log(loc, {
          message: C.DETECTED_DEPRECATED_HTML_ELEMENT,
          kind: 'htmlElement',
          name: name.name,
        });
      } else if (!html5ElementSet.has(name.name) && !isPascalCase(name.name)) {
        logger.log(loc, {
          message: C.EXPECTED_PASCAL_CASE,
          kind: 'Component',
          name: name.name,
        });
      }
    }
    node.attributes.forEach(attr => c(attr, state));
  };

  const JSXAttribute = (node, state, c) => {
    const { name, value, loc } = node;
    if (!/-/.test(name.name) && !isCamelCase(name.name)) {
      logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, kind: 'attribute', name: name.name });
    }

    if (value) {
      c(value, state);
    }
  };

  const JSXExpressionContainer = (node, state, c) => {
    c(node.expression, state);
  };

  const JSXMemberExpression = (node, state, c) => {
    c(node.object, state);
    c(node.property, state);
  };

  const JSXIdentifier = node => {
    const { name, loc } = node;
    // skip CSS-style names
    if (!/-/.test(name)) {
      if (!isCamelCase(name)) {
        logger.log(loc, { message: C.EXPECTED_CAMEL_CASE, name, kind: 'JSXIdentifier' });
      }
    }
  };

  const JSXFragment = (node, state, c) => {
    c(node.openingFragment, state);
    node.children.forEach(child => c(child, state));
  };

  const JSXOpeningFragment = (node, state, c) => {
    node.attributes.forEach(attr => c(attr, state));
  };

  const JSXSpreadAttribute = (node, state, c) => {
    c(node.argument, state);
  };

  const JSXText = () => {};

  return {
    JSXElement,
    JSXOpeningElement,
    JSXAttribute,
    JSXExpressionContainer,
    JSXMemberExpression,
    JSXIdentifier,
    JSXFragment,
    JSXOpeningFragment,
    JSXSpreadAttribute,
    JSXText,
  };
};
