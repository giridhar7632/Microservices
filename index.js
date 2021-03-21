const express = require("express")
const port = process.env.PORT || 3000

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, (err) => {
  if(err) throw err
  console.log("server started at port " + port)
})