const os = require('os')

const config = {
  get nodeEnv () {
    return process.env.NODE_ENV || 'development' // 'production'
  },

  get serverPort () {
    return parseInt(process.env.SERVER_PORT, 10) || 8082
  },

  get region () {
    return process.env.REGION // US vs EU
  },

  get domain () {
    return process.env.DOMAIN || 'nexdrew.com'
  },

  get domainLink () {
    return process.env.DOMAIN_LINK || 'https://nexdrew.com'
  },

  get cookieNameSession () {
    return process.env.COOKIE_NAME_SESSION || 'session'
  },

  get cookieNameRegion () {
    return process.env.COOKIE_NAME_REGION || 'region'
  },

  get cookieSecret () {
    return process.env.COOKIE_SECRET || 'E51uJWI2TMWZxfWVhe5wSgDGwiy50qTXyb9zcqd73Xfg'
  },

  get ttlCookieSessionSeconds () {
    return parseInt(process.env.TTL_COOKIE_SESSION_SECONDS, 10) || 300
  },

  get ttlCookieRegionSeconds () {
    return parseInt(process.env.TTL_COOKIE_REGION_SECONDS, 10) || 315360000 // ten years
  }
}

config.appId = `${os.hostname()}_${config.serverPort}`

module.exports = config
