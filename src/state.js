/* eslint-disable no-underscore-dangle */
class State {
  constructor(logger) {
    this._logger = logger;
    this._issues = [];
    this._nodeStack = [];
    this.nestingDepth = 0;
  }

  log({ loc, message, name = '-', kind = '-' }) {
    this._logger.log(loc.start.line, { message, name, kind });
  }

  getReport() {
    this._issues.sort((a, b) => a.line - b.line);
    return {
      filePath: this.filePath,
      issues: this._issues,
      declarations: this.declarations,
    };
  }

  pushNode(node) {
    this._nodeStack.unshift(node);
  }

  popNode() {
    if (this._nodeStack.length === 0) {
      throw new Error('Attempt to pop from empty node stack.');
    }
    return this._nodeStack.shift();
  }

  findNode(type) {
    return this._nodeStack.find(node => node.type === type);
  }
}

module.exports = State;
