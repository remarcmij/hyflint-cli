const isCamelCase = name => /^[a-z][a-zA-Z0-9]*$/.test(name);
const isPascalCase = name => /^[A-Z][a-zA-Z0-9]+$/.test(name);
const isShoutCase = name => /^[A-Z][_A-Z0-9]+$/.test(name);

module.exports = {
  isCamelCase,
  isPascalCase,
  isShoutCase,
};
