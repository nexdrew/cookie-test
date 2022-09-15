const fsLib = require('fs/promises')
const pathLib = require('path')

const restify = require('restify')
const cookie = require('cookie')
const cookieSig = require('cookie-signature')
const Handlebars = require('handlebars')

const pkg = require('./package.json')
const config = require('./config')

const pages = new Map()

function log (msg) {
  msg = new Date().toISOString() + ' ' + msg
  console.log(msg)
}

async function loadFile (filePath, opts) {
  opts = opts || {}
  log(`Loading ${pathLib.relative(__dirname, filePath)}`)

  let contents = await fsLib.readFile(filePath, opts.encoding || 'utf8')

  if (opts.json) contents = JSON.parse(contents)

  return contents
}

async function compilePage (page) {
  if (!pages.has(page)) {
    const fileContents = await loadFile(pathLib.resolve(__dirname, 'pages', `${page}.html.hbs`))
    const pageFunction = Handlebars.compile(fileContents)
    pages.set(page, pageFunction)
  }
  return pages.get(page)
}

function serializeCookie (cookieName, value, cookieOpts, cookieSecret) {
  if (cookieSecret) value = cookieSig.sign(value, cookieSecret)
  return cookie.serialize(cookieName, value, cookieOpts)
}

function parseCookie (cookieHeader, cookieName, cookieSecret) {
  const cookies = cookie.parse(cookieHeader)
  const cookieValue = cookies[cookieName]
  if (!cookieValue) return null
  if (cookieSecret) return cookieSig.unsign(cookieValue, cookieSecret) // returns false or valid string
  return cookieValue
}

async function sendIndexPage (res, sessionCookie, regionCookie) {
  const template = await compilePage('index')
  res.header('content-type', 'text/html; charset=utf-8')
  res.sendRaw(template({
    region: config.region,
    sessionCookie,
    regionCookie,
    domainLink: config.domainLink
  }))
}

function sendRedirect (res, next) {
  res.redirect(302, '/', next)
}

function main () {
  const server = restify.createServer({
    name: config.appId + '/' + pkg.version
  })

  server.pre(restify.pre.sanitizePath())
  server.use(restify.plugins.bodyParser({ mapParams: false }))
  server.use(restify.plugins.queryParser())

  // mount routes here
  server.get('/', async (req, res) => {
    log('GET index')
    // read cookies
    const cookieHeader = req.header('cookie')
    const sessionCookie = cookieHeader && parseCookie(cookieHeader, config.cookieNameSession, config.cookieSecret)
    const regionCookie = cookieHeader && parseCookie(cookieHeader, config.cookieNameRegion)
    // send index page
    await sendIndexPage(res, sessionCookie, regionCookie)
  })

  server.post('/signin', (req, res, next) => {
    log('POST /signin')
    // prepare cookie opts
    const sessionCookieOpts = {
      maxAge: config.ttlCookieSessionSeconds,
      httpOnly: true,
      sameSite: 'strict'
    }
    const regionCookieOpts = {
      // httpOnly: true,
      // sameSite: 'none',
      // path: '',
      domain: config.domain,
      maxAge: config.ttlCookieRegionSeconds
    }
    if (config.nodeEnv === 'production') {
      sessionCookieOpts.secure = true
      regionCookieOpts.secure = true
    }
    // set session cookie
    const sessionCookieValue = new Date().toISOString()
    const sessionCookie = serializeCookie(config.cookieNameSession, sessionCookieValue, sessionCookieOpts, config.cookieSecret)
    res.header('set-cookie', sessionCookie)
    // set region cookie
    const regionCookieValue = config.region
    const regionCookie = serializeCookie(config.cookieNameRegion, regionCookieValue, regionCookieOpts)
    res.header('set-cookie', regionCookie)
    // redirect back to GET index
    sendRedirect(res, next)
  })

  server.post('/signout', (req, res, next) => {
    log('POST /signout')
    // remove session cookie
    // DO NOT remove region cookie
    const sessionCookieValue = ''
    const sessionCookie = serializeCookie(config.cookieNameSession, sessionCookieValue, { maxAge: 0 })
    res.header('set-cookie', sessionCookie)
    // redirect back to GET index
    sendRedirect(res, next)
  })

  server.post('/nix', (req, res, next) => {
    log('POST /nix')
    // remove region cookie
    const regionCookie = serializeCookie(config.cookieNameRegion, '', { maxAge: 0 })
    res.header('set-cookie', regionCookie)
    // redirect back to GET index
    sendRedirect(res, next)
  })

  return new Promise((resolve, reject) => {
    server.listen(config.serverPort, err => {
      if (err) return reject(err)
      resolve(server.address().port)
    })
  })
}

if (require.main === module) {
  main().then(port => log(`Listening on ${port}`))
}
