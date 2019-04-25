class Logger {
  constructor(filePath) {
    this.filePath = filePath;
    this.issues = [];
  }

  log(loc, issue) {
    const line = typeof loc === 'object' ? loc.start.line : loc;
    this.issues.push({ line, ...issue });
  }

  getReport() {
    this.issues.sort((a, b) => a.line - b.line);

    return {
      filePath: this.filePath,
      issues: this.issues,
    };
  }
}

module.exports = Logger;
