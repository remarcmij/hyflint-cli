/* eslint-disable no-underscore-dangle */
class State {
  constructor() {
    this._nodeStack = [];
    this._identifiers = new Set();
    this.nestingDepth = 0;
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

  addIdentifier(identifier) {
    this._identifiers.add(identifier);
  }

  getIdentifiers() {
    return this._identifiers;
  }
}

module.exports = State;
