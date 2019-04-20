/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const Logger = require('./issue-logger');
const lint = require('./linter');
const { detectCommentedOutCode, detectESLintDisable } = require('./analyzer');

const fsReadFile = util.promisify(fs.readFile);

async function executeTest(globPattern) {
  const filePaths = await glob(globPattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/slides/**'],
  });

  if (filePaths.length === 0) {
    console.log('No matching files');
    return;
  }

  const promises = filePaths.map(filePath => {
    console.log(`Processing ${filePath}`);
    const logger = new Logger(filePath);
    return fsReadFile(filePath, 'utf8').then(progText => {
      try {
        lint(progText, logger);
        detectCommentedOutCode(progText, logger);
        detectESLintDisable(progText, logger);
        return logger.getReport();
      } catch (err) {
        return {
          errorCount: 1,
          warningCount: 0,
          issues: [
            {
              type: 'error',
              line: err.loc ? err.loc.line : '-',
              message: `Syntax error: ${err.message}`,
            },
          ],
        };
      }
    });
  });

  const reports = await Promise.all(promises);

  const totalErrors = reports.reduce((prev, report) => prev + report.errorCount, 0);

  console.log('\n------------------');
  reports.forEach(report => {
    if (report.errorCount + report.warningCount > 0) {
      console.log(`File: ${report.filePath}`);
      console.table(report.issues);
    }
  });

  if (totalErrors === 0) {
    console.log('No errors detected');
  }
}

(async () => {
  try {
    const [, , dir] = process.argv;
    if (dir) {
      await executeTest(path.resolve(dir, '**/*.{js,jsx}'));
    }
  } catch (err) {
    console.error(err);
  }
})();
