/* eslint-disable no-console */
const fs = require('fs');
const util = require('util');
const glob = util.promisify(require('glob'));
const Logger = require('./issue-logger');

const fsReadFile = util.promisify(fs.readFile);

async function executeTest(globPattern, strategy) {
  const filePaths = await glob(globPattern);
  console.log('filePaths :', filePaths);

  const promises = filePaths.map(filePath => {
    const logger = new Logger(filePath);
    return fsReadFile(filePath, 'utf8').then(progText => {
      strategy(progText, logger);
      return logger.getReport();
    });
  });

  const reports = await Promise.all(promises);
  const totalErrors = reports.reduce(
    (prev, report) => prev + report.errorCount,
    0,
  );

  reports.forEach(report => {
    if (report.errorCount + report.warningCount > 0) {
      console.log(`File: ${report.filePath}`);
      console.table(report.issues);
    }
  });

  return totalErrors;
}

module.exports = { executeTest };
