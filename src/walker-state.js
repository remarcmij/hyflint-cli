const C = require('./constants');
const { isCamelCase, isShoutCase } = require('./helpers');

const UNDESIRED_NAMES = ['data', 'item', 'info', 'array', 'object', 'arr', 'obj', 'x', 'y', 'z'];
const ACCEPTABLE_NAMES_WITH_NUMBERS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

class WalkerState {
  constructor(logger) {
    this.logger = logger;
    this.functionNesting = 0;
  }

  checkName(name, kind, loc) {
    if (isShoutCase(name) && kind !== 'const') {
      this.logger.log(loc.start.line, C.WARNING, { message: C.CONST_SHOUT_CASE, kind, name });
    } else if (!isCamelCase(name) && !isShoutCase(name)) {
      this.logger.log(loc.start.line, C.WARNING, {
        message: C.USE_CAMEL_CASE,
        kind,
        name,
      });
    } else if (/\d/.test(name) && !ACCEPTABLE_NAMES_WITH_NUMBERS.includes(name)) {
      this.logger.log(loc.start.line, C.WARNING, { message: C.AVOID_NUMBERS, kind, name });
    }

    if (UNDESIRED_NAMES.includes(name.toLowerCase())) {
      this.logger.log(loc.start.line, C.WARNING, {
        message: C.AVOID_GENERIC_NAMES,
        kind,
        name,
      });
    }

    if (kind === 'var') {
      this.logger.log(loc.start.line, C.ERROR, { message: C.NO_VAR, kind, name });
    }
  }
}

module.exports = WalkerState;
