const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');


const cors = require('cors')
const { pool } = require('./config')

const app = express()
const cookieConfig = {
  maxAge: 1000 * 60 * 15, // would expire after 15 minutes
  httpOnly: true, // The cookie only accessible by the web server
  signed: true // Indicates if the cookie should be signed
};

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({
  origin: ['http://localhost:3474'],
  credentials: true
}))
app.use(cookieParser('books_api_secret_12345'));
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", request.headers.origin); // update to match the domain you will make the request from
  response.header('Access-Control-Allow-Methods', 'GET,POST');
  next();
});

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', function connection(ws, req) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
  const ip = req.connection.remoteAddress;

  ws.send(`You are connected from ${ip}`);
});


const getBooks = (request, response, next) => {
  console.log('responding /books')
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

const addBook = (request, response, next) => {
  const { author, title } = request.body

  let uid = request.signedCookies.uid;
  let user
  pool.query('SELECT * FROM users WHERE id = $1', [parseInt(uid)], (err, res) => {
    if (err) {
      response.status(401).json({ status: 'error', message: 'Unauthorized access!' })
    } else {
      user = res.rows[0]
      pool.query('INSERT INTO books (author, title) VALUES ($1, $2)', [author, title], error => {
        if (error) {
          throw error
        }
      })
      response.status(201).json({ status: 'success', message: `Thank you ${user.user_name}!` })
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