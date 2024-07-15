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
const INITIAL_LOAD = 20;
const MAX_USERNAME_LENGTH = 30;

function addToHistory(message) {
    chatHistory.push(message);
    if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
    }
}

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', (data) => {
        const username = data.username.slice(0, MAX_USERNAME_LENGTH);
        users.set(socket.id, { username: username, profilePicture: data.profilePicture });
        socket.username = username;
        socket.profilePicture = data.profilePicture;
        
        const recentMessages = chatHistory.slice(-INITIAL_LOAD);
        socket.emit('initialChatHistory', recentMessages);
        
        io.emit('userList', Array.from(users.values()));
    });

    socket.on('requestMoreHistory', (lastMessageIndex) => {
        const moreMessages = chatHistory.slice(
            Math.max(0, lastMessageIndex - INITIAL_LOAD),
            lastMessageIndex
        );
        socket.emit('additionalChatHistory', moreMessages);
    });

    socket.on('chatMessage', (messageData) => {
        const fullMessageData = {
            type: 'message',
            username: socket.username,
            message: messageData.message,
            profilePicture: socket.profilePicture,
            replyTo: messageData.replyTo
        };
        addToHistory(fullMessageData);
        io.emit('chatMessage', fullMessageData);
    });

    socket.on('chatVideo', (videoData) => {
        const videoMessage = {
            type: 'video',
            username: socket.username,
            video: videoData,
            profilePicture: socket.profilePicture
        };
        addToHistory(videoMessage);
        io.emit('chatVideo', videoMessage);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('userList', Array.from(users.values()));
        }
    });

    socket.on('updateUsername', (newUsername) => {
        newUsername = newUsername.slice(0, MAX_USERNAME_LENGTH);
        socket.username = newUsername;
        users.get(socket.id).username = newUsername;
        io.emit('userList', Array.from(users.values()));
        socket.emit('usernameUpdated', newUsername);
    });
    
    socket.on('updateProfilePicture', (newProfilePicture) => {
        socket.profilePicture = newProfilePicture;
        users.get(socket.id).profilePicture = newProfilePicture;
        io.emit('userList', Array.from(users.values()));
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});