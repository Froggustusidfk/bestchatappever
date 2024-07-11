document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const username = prompt('Enter your username:');

    socket.emit('join', username);

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', message);
            messageInput.value = '';
        }
    });

    socket.on('chatMessage', (data) => {
        addMessage(data.username, data.message);
    });

    socket.on('userJoined', (username) => {
        addMessage('System', `${username} has joined the chat`);
    });

    socket.on('userLeft', (username) => {
        addMessage('System', `${username} has left the chat`);
    });

    function addMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});