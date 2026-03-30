var merge = require('webpack-merge')
var prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  API_BASE_URL: '"http://0.0.0.0:3000/api"',
  USER_APP_URL: '"http://0.0.0.0:8080/#/pages/user/user"'
})
