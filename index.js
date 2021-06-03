require('dotenv').config()
const express = require('express')
const path = require('path')
const multer = require('multer')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const dns = require('dns')
const urlparser = require('url')

const app = express()
const upload = multer()
const port = process.env.PORT || 3000

app.use('/', express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())

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

// url shortner
const uri = process.env.MONGO_URI
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true })

const connection = mongoose.connection
connection.once('open', () => {
	console.log('MongoDB connection is established successfully')
})

const schema = new mongoose.Schema({ url: 'string' })
const Url = mongoose.model('Url', schema)

app.post('/urlshortner/api/shorturl/new', async function (req, res) {
	console.log(req.body)
	const bodyUrl = req.body.url

	const checkUp = dns.lookup(
		urlparser.parse(bodyUrl).hostname,
		(err, address) => {
			if (!address) {
				res.json({ error: 'Invalid URL' })
			} else {
				const url = new Url({ url: bodyUrl })
				url.save((err, data) => {
					res.json({ original_url: data.url, short_url: data.id })
				})
			}
		}
	)
})

app.get('/api/shorturl/:id', (req, res) => {
	const id = req.params.id
	Url.findById(id, (err, data) => {
		if (!data) {
			res.json({ error: 'Invalid URL' })
		} else {
			res.redirect(data.url)
		}
	})
})

app.listen(port, (err) => {
	if (err) throw err
	console.log('server started at port ' + port)
})
