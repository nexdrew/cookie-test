const os = require('os')

const regionArray = []

const config = {
  get serverPort () {
    return parseInt(process.env.SERVER_PORT, 10) || 8081
  },

  get cookieNameRegion () {
    return process.env.COOKIE_NAME_REGION || 'region'
  },

  get regions () {
    if (!regionArray.length) {
      const string = String(process.env.REGIONS) || 'US#https://us.nexdrew.com,EU#https://eu.nexdrew.com'
      let mappingTokens
      for (const mapping of string.split(',')) {
        mappingTokens = mapping.split('#')
        regionArray.push({ name: mappingTokens[0], url: mappingTokens[1] })
      }
    }
    return regionArray
  }
}

config.appId = `${os.hostname()}_${config.serverPort}`

module.exports = config
