const fsLib = require('fs/promises')
const pathLib = require('path')

const restify = require('restify')
const cookie = require('cookie')
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

function parseCookie (cookieHeader, cookieName) {
  const cookies = cookie.parse(cookieHeader)
  const cookieValue = cookies[cookieName]
  if (!cookieValue) return null
  return cookieValue
}

async function sendIndexPage (res) {
  const template = await compilePage('index')
  res.header('content-type', 'text/html; charset=utf-8')
  res.sendRaw(template({
    regions: config.regions
  }))
}

function sendRedirect (res, url, next) {
  res.redirect(302, url, next)
}

function main () {
  const server = restify.createServer({
    name: config.appId + '/' + pkg.version
  })

  server.pre(restify.pre.sanitizePath())
  server.use(restify.plugins.bodyParser({ mapParams: false }))
  server.use(restify.plugins.queryParser())

  server.get('/', async (req, res, next) => {
    log('GET index')
    // read cookies
    const cookieHeader = req.header('cookie')
    const regionCookie = cookieHeader && parseCookie(cookieHeader, config.cookieNameRegion)
    if (regionCookie) {
      const regions = config.regions
      if (regions.length) {
        const regionObj = regions.find(r => r.name === regionCookie)
        if (regionObj) {
          log(`Found cookie, redirecting to region ${regionCookie} at ${regionObj.url}`)
          return sendRedirect(res, regionObj.url, next)
        } else {
          log(`No matching region found for cookie value ${regionCookie}`)
        }
      } else {
        log('No regions configured!')
      }
    } else {
      log(`No cookie found for name ${config.cookieNameRegion}`)
    }
    // send index page
    await sendIndexPage(res)
  })

  return new Promise((resolve, reject) => {
    server.listen(config.serverPort, err => {
      if (err) return reject(err)
      resolve(server.address().port)
    })
  })
}

if (require.main === module) {
  main().then(port => log(`Read app listening on ${port}`))
}
