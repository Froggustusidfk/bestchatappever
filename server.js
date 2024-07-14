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
const chatHistory = [];
const MAX_HISTORY = 200;

function addToHistory(message) {
    chatHistory.push(message);
    if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
    }
}

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', (data) => {
        users.set(socket.id, { username: data.username, profilePicture: data.profilePicture });
        socket.username = data.username;
        socket.profilePicture = data.profilePicture;
        
        // Send chat history to the new user
        socket.emit('chatHistory', chatHistory);
        
        io.emit('userList', Array.from(users.values()));
    });

    socket.on('chatMessage', (message) => {
        const messageData = {
            type: 'message',
            username: socket.username,
            message: message,
            profilePicture: socket.profilePicture
        };
        addToHistory(messageData);
        io.emit('chatMessage', messageData);
    });

    socket.on('chatImage', (imageData) => {
        const imageMessage = {
            type: 'image',
            username: socket.username,
            image: imageData,
            profilePicture: socket.profilePicture
        };
        addToHistory(imageMessage);
        io.emit('chatImage', imageMessage);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('userList', Array.from(users.values()));
        }
    });

    socket.on('updateUsername', (newUsername) => {
        socket.username = newUsername;
        users.get(socket.id).username = newUsername;
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