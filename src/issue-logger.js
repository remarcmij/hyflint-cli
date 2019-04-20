class Logger {
  constructor(filePath) {
    this.filePath = filePath;
    this.issues = [];
  }

  log(line, type, issue) {
    this.issues.push({ line, type, ...issue });
  }

  getReport() {
    this.issues.sort((a, b) => a.line - b.line);
    const errorCount = this.issues.filter(issue => issue.type === 'error').length;
    const warningCount = this.issues.filter(issue => issue.type === 'warning').length;

    return {
      filePath: this.filePath,
      errorCount,
      warningCount,
      issues: this.issues,
    };
  }
}

module.exports = Logger;
