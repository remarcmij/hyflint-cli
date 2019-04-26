const axios = require('axios');
const localPackageJson = require('../package.json');

const REMOTE_PACKAGE_JSON_URL =
  'https://api.github.com/repos/remarcmij/hyflint-cli/contents/package.json';

async function checkVersion() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return;
  }

  try {
    const res = await axios({
      method: 'GET',
      url: REMOTE_PACKAGE_JSON_URL,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'hyflint-cli',
      },
    });

    const buffer = Buffer.from(res.data.content, 'base64');
    const text = buffer.toString('utf8');
    const remotePackageJson = JSON.parse(text);
    if (localPackageJson.version !== remotePackageJson.version) {
      console.log('There is a newer version of hyflint-cli available in GitHub.');
      console.log('Please update your local repo with a git pull.');
    }
  } catch (_) {
    // ignore
  }
}

module.exports = {
  checkVersion,
};
