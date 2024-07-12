const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 1e8 // 100 MB
});

app.use(express.static(path.join(__dirname, 'public')));

const users = new Map();

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', (data) => {
        users.set(socket.id, { username: data.username, profilePicture: data.profilePicture });
        socket.username = data.username;
        socket.profilePicture = data.profilePicture;
        io.emit('userJoined', data.username);
        io.emit('userList', Array.from(users.values()));
    });

    socket.on('chatMessage', (message) => {
        io.emit('chatMessage', {
            username: socket.username,
            message: message,
            profilePicture: socket.profilePicture
        });
    });

    socket.on('chatImage', (imageData) => {
        io.emit('chatImage', {
            username: socket.username,
            image: imageData,
            profilePicture: socket.profilePicture
        });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('userLeft', socket.username);
            io.emit('userList', Array.from(users.values()));
        }
    });

    socket.on('updateUsername', (newUsername) => {
        const oldUsername = socket.username;
        socket.username = newUsername;
        users.get(socket.id).username = newUsername;
        io.emit('userUpdated', { oldUsername, newUsername });
        io.emit('userList', Array.from(users.values()));
    });
    
    socket.on('updateProfilePicture', (newProfilePicture) => {
        socket.profilePicture = newProfilePicture;
        users.get(socket.id).profilePicture = newProfilePicture;
        io.emit('userList', Array.from(users.values()));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});