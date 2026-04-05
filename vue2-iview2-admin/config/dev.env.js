var merge = require('webpack-merge')
var prodEnv = require('./prod.env')
var loadEnv = require('./load-env')
var env = loadEnv()

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  API_BASE_URL: JSON.stringify(env.API_BASE_URL || ''),
  USER_APP_URL: JSON.stringify(env.USER_APP_URL || '')
})
