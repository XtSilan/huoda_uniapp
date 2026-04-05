const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function applyEnvFile(filePath, originalEnv) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  Object.entries(parsed).forEach(([key, value]) => {
    // Keep shell/system env highest priority, but let mode-specific files override base .env.
    if (originalEnv[key] === undefined) {
      process.env[key] = value;
    }
  });

  return filePath;
}

function loadServerEnv() {
  const rootDir = path.resolve(__dirname, '..');
  const originalEnv = { ...process.env };
  const loadedFiles = [applyEnvFile(path.join(rootDir, '.env'), originalEnv)].filter(Boolean);

  return {
    loadedFiles
  };
}

module.exports = loadServerEnv;
