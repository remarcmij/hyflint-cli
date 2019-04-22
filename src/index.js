#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const util = require('util');
const glob = util.promisify(require('glob'));
const lint = require('./linter');
const Logger = require('./issue-logger');

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
    const logger = new Logger(filePath);
    return fsReadFile(filePath, 'utf8').then(progText => {
      try {
        lint(progText, logger);
        detectCommentedOutCode(progText, logger);
        detectESLintDisable(progText, logger);
        return logger.getReport();
      } catch (err) {
        return {
          issues: [
            {
              line: err.loc ? err.loc.line : '-',
              message: `Syntax error: ${err.message}`,
            },
          ],
          declarations: [],
        };
      }
    });
  });

  const reports = await Promise.all(promises);

  const totalIssues = reports.reduce((count, report) => count + report.issues.length, 0);

  if (totalIssues === 0) {
    console.log('No issues detected.');
  } else {
    reports.forEach(report => {
      if (report.issues.length > 0) {
        console.log(report.filePath);
        console.table(report.issues);
        console.log('\n');
      }
    });
  }
}

(async () => {
  try {
    const [, , fileSpec] = process.argv;
    await executeTest(path.resolve(fileSpec, '**/*.{js,jsx}'));
  } catch (err) {
    console.error(err);
  }
})();
