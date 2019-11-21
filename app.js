const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const cors = require('cors')
const { pool } = require('./config')

const app = express()
const cookieConfig = {
  maxAge: 1000 * 60 * 15,
  httpOnly: true,
  signed: true
};

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({
  credentials: true,
  origin: ['http://localhost:3474']
}))
app.use(cookieParser('xxxxxxxxx'));
app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', request.headers.origin);
  response.header('Access-Control-Allow-Methods', 'GET, POST');
  next();
})

const getBooks = (request, response) => {
  pool.query('SELECT * FROM books', (error, results) => {
    if (error) {
      throw error
    }
    response
      .cookie('uid', '1', cookieConfig)
      .status(200)
      .json(results.rows)
  })
}

const addBook = (request, response) => {
  const { author, title } = request.body
  const uid = request.signedCookies.uid
  pool.query('SELECT * FROM users WHERE id =$1', [parseInt(uid)], (err, res) => {
    if (err) {
      response.status(401).json({ message: 'Unauthorized access!' })
    } else {
      let user = res.rows[0]
      pool.query('INSERT INTO books (author, title) VALUES ($1, $2)', [author, title], error => {
        if (error) {
          throw error
        }
        response.status(201).json({ status: 'success', message: `Thank you ${user.user_name}!` })
      })
    }
  })

}

app
  .route('/books')
  // GET endpoint
  .get(getBooks)
  // POST endpoint
  .post(addBook)

// Start server
app.listen(process.env.PORT || 3002, () => {
  console.log(`Server listening`)
})