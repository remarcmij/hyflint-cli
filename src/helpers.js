const isCamelCase = name => /^_?[a-z][a-zA-Z0-9]*$/.test(name);
const isPascalCase = name => /^_?[A-Z][a-zA-Z0-9]+$/.test(name);
const isShoutCase = name => /^_?[A-Z][_A-Z0-9]+$/.test(name);

module.exports = {
  isCamelCase,
  isPascalCase,
  isShoutCase,
};
