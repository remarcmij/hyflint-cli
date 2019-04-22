class State {
  constructor(filePath) {
    this.filePath = filePath;
    this.functionNesting = 0;
    this.issues = [];
    this.declarations = [];
  }

  log({ loc, line, message, name = '-', kind = '-' }) {
    this.issues.push({ line: line || loc.start.line, message, name, kind });
  }

  addVariableName(name, kind, loc) {
    this.declarations.push({ line: loc.start.line, name, kind });
  }

  addFunctionName(name, loc) {
    this.declarations.push({ line: loc.start.line, name, kind: 'function' });
  }

  addClassName(name, loc) {
    this.declarations.push({ line: loc.start.line, name, kind: 'class' });
  }

  addMethodDefinition(name, loc) {
    this.declarations.push({ line: loc.start.line, name, kind: 'method' });
  }

  addClassField(name, loc) {
    this.declarations.push({ line: loc.start.line, name, kind: 'field' });
  }

  getReport() {
    this.issues.sort((a, b) => a.line - b.line);
    return {
      filePath: this.filePath,
      issues: this.issues,
      declarations: this.declarations,
    };
  }
}

module.exports = State;
