var fs = require('fs')
var path = require('path')

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce(function (env, line) {
      var trimmed = line.trim()
      var separatorIndex = trimmed.indexOf('=')

      if (!trimmed || trimmed.startsWith('#') || separatorIndex === -1) {
        return env
      }

      var key = trimmed.slice(0, separatorIndex).trim()
      var value = stripQuotes(trimmed.slice(separatorIndex + 1).trim())

      env[key] = value
      return env
    }, {})
}

module.exports = function loadEnv() {
  var rootDir = path.resolve(__dirname, '..')

  return Object.assign(
    {},
    parseEnvFile(path.join(rootDir, '.env')),
    process.env
  )
}
