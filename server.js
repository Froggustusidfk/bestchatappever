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
        
        // Add join message to history and broadcast it
        const joinMessage = {
            type: 'system',
            message: `${data.username} has joined the chat`,
            timestamp: new Date().toISOString()
        };
        addToHistory(joinMessage);
        io.emit('chatMessage', joinMessage);
        
        io.emit('userList', Array.from(users.values()));
    });

    socket.on('chatMessage', (message) => {
        const messageData = {
            type: 'message',
            username: socket.username,
            message: message,
            profilePicture: socket.profilePicture,
            timestamp: new Date().toISOString()
        };
        addToHistory(messageData);
        io.emit('chatMessage', messageData);
    });

    socket.on('chatImage', (imageData) => {
        const imageMessage = {
            type: 'image',
            username: socket.username,
            image: imageData,
            profilePicture: socket.profilePicture,
            timestamp: new Date().toISOString()
        };
        addToHistory(imageMessage);
        io.emit('chatImage', imageMessage);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            const leaveMessage = {
                type: 'system',
                message: `${socket.username} has left the chat`,
                timestamp: new Date().toISOString()
            };
            addToHistory(leaveMessage);
            io.emit('chatMessage', leaveMessage);
            io.emit('userList', Array.from(users.values()));
        }
    });

    socket.on('updateUsername', (newUsername) => {
        const oldUsername = socket.username;
        socket.username = newUsername;
        users.get(socket.id).username = newUsername;
        const updateMessage = {
            type: 'system',
            message: `${oldUsername} has changed their name to ${newUsername}`,
            timestamp: new Date().toISOString()
        };
        addToHistory(updateMessage);
        io.emit('chatMessage', updateMessage);
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