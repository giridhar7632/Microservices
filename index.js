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
mongoose.connect(uri, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
})

const connection = mongoose.connection
connection.once('open', () => {
	console.log('MongoDB connection is established successfully')
})

const Schema = mongoose.Schema

const urlSchema = new Schema({ url: 'string' })
const Url = mongoose.model('Url', urlSchema)

app.post('/api/shorturl/new', async function (req, res) {
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

// exercise tracker

const exerciseSchema = new Schema({
	description: {
		type: String,
		required: true,
	},
	duration: {
		type: Number,
		required: true,
	},
	date: String,
})

const userSchema = new Schema({
	username: {
		type: String,
		required: true,
	},
	log: [exerciseSchema],
})

const Exercise = mongoose.model('Exercise', exerciseSchema)
const User = mongoose.model('User', userSchema)

app.get('/api/users', (req, res) => {
	User.find({})
		.then((users) => res.json(users))
		.catch((err) => res.status(400).json('Error: ' + err))
})

app.post('/api/users', (req, res) => {
	const username = req.body.username

	const newUser = new User({ username })

	newUser
		.save()
		.then((data) => {
			res.json({ username: data.username, _id: data._id })
		})
		.catch((err) => {
			res.status(400).json('Error: ' + err)
		})
})

app.post('/api/users/:_id/exercises', (req, res) => {
	const userid = req.body[':_id']
	const description = req.body.description
	const duration = Number(req.body.duration)
	let date = req.body.date
	if (date === '') {
		date = new Date().toISOString().substring(0, 10)
	}

	const newExercise = new Exercise({
		description,
		duration,
		date,
	})

	User.findByIdAndUpdate(userid, { $push: { log: newExercise } }, { new: true })
		.then((data) =>
			res.json({
				_id: data._id,
				username: data.username,
				date: new Date(newExercise.date).toDateString(),
				duration: newExercise.duration,
				description: newExercise.description,
			})
		)
		.catch((err) => res.status(400).json('Error: ' + err))
})

app.get('/api/users/:_id/logs', (req, res) => {
	User.findById(req.params._id)
		.then((data) => {
			let resObj = data._doc

			if (req.query.form || req.query.to) {
				let fromDate = new Date(0)
				let toDate = new Date()

				if (req.query.from) {
					fromDate = new Date(req.query.from)
				}
				if (req.query.to) {
					toDate = new Date(req.query.to)
				}

				fromDate = fromDate.getTime()
				toDate = toDate.getTime()

				resObj.log = resObj.log.filter((exercise) => {
					let exerciseDate = new Date(exercise.date).getTime()

					return exerciseDate >= fromDate && exerciseDate <= toDate
				})
			}
			if (req.query.limit) {
				resObj.log = resObj.log.slice(0, req.query.limit)
			}

			res.json({ ...resObj, count: data.log.length })
		})
		.catch((err) => res.status(400).json('Error: ' + err))
})

app.listen(port, (err) => {
	if (err) throw err
	console.log('server started at port ' + port)
})
