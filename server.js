const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection string - replace with your actual connection string
const mongoUrl = 'mongodb://localhost:27017/chatapp';

let db;

MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
  })
  .catch(error => console.error(error));

// Session middleware
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: mongoUrl }),
  cookie: { secure: false } // set to true if using https
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Registration endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.collection('users').insertOne({ username, password: hashedPassword });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      res.status(400).json({ message: 'Username already exists' });
    } else {
      res.status(500).json({ message: 'Error creating user' });
    }
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await db.collection('users').findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = { username: user.username };
    res.json({ message: 'Logged in successfully' });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      res.status(500).json({ message: 'Could not log out, please try again' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

// Check login status
app.get('/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join', (username) => {
    socket.username = username;
    io.emit('userJoined', username);
  });

  socket.on('chatMessage', (message) => {
    io.emit('chatMessage', {
      username: socket.username,
      message: message
    });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('userLeft', socket.username);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});