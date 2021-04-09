const express = require("express")
const path = require("path")
const port = process.env.PORT || 3000

const app = express()

app.use('/', express.static(path.join(__dirname, 'public')))

app.listen(port, (err) => {
  if(err) throw err
  console.log("server started at port " + port)
})