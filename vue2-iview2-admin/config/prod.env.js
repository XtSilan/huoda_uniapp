var loadEnv = require('./load-env')
var env = loadEnv()

module.exports = {
  NODE_ENV: '"production"',
  API_BASE_URL: JSON.stringify(env.API_BASE_URL || ''),
  USER_APP_URL: JSON.stringify(env.USER_APP_URL || '')
}
