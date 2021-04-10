var express = require('express')
var path = require('path')
var multer = require('multer')
var cors = require('cors')
require('dotenv').config()

var app = express()
var upload = multer()
const port = process.env.PORT || 3000

app.use('/', express.static(path.join(__dirname, 'public')))

// timestamp
app.get('/api/timestamp', (req, res) => {
  const unix = Date.now()
  const utc = new Date().toUTCString()
  res.json({ unix, utc })
})

app.get('/api/timestamp/:date', (req, res) => {
  const date = req.params.date

  if (/\d{5,}/.test(date)) {
    unix = parseInt(date)
    utc = new Date(unix).toUTCString()
    res.json({ unix, utc })
  } else {
    const dateObj = new Date(date)

    if (dateObj.toString() === 'Invalid Date') {
      res.json({ error: 'Invalid Date' })
    } else {
      unix = dateObj.valueOf()
      utc = dateObj.toUTCString()
      res.json({ unix, utc })
    }
  }
})

// header parser
app.get('/api/whoami', (req, res) => {
  res.json({
    ipaddress: req.ip,
    language: req.headers['accept-language'],
    software: req.headers['user-agent'],
  })
})

// file metadata
app.post('/api/fileanalyse', upload.single('upfile'), function (req, res) {
  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  })
})

app.listen(port, (err) => {
  if (err) throw err
  console.log('server started at port ' + port)
})
