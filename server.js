const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Set();

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', (username) => {
        users.add(username);
        socket.username = username;
        io.emit('userJoined', username);
        io.emit('userList', Array.from(users));
    });

    socket.on('chatMessage', (message) => {
        io.emit('chatMessage', {
            username: socket.username,
            message: message
        });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.username);
            io.emit('userLeft', socket.username);
            io.emit('userList', Array.from(users));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});