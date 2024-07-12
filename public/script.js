document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const usernameContainer = document.getElementById('username-container');
    const usernameInput = document.getElementById('username-input');
    const usernameSubmit = document.getElementById('username-submit');
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');

    let username = localStorage.getItem('chatUsername');

    if (username) {
        joinChat(username);
    } else {
        usernameContainer.style.display = 'flex';
    }

    usernameSubmit.addEventListener('click', () => {
        username = usernameInput.value.trim();
        if (username) {
            localStorage.setItem('chatUsername', username);
            joinChat(username);
        }
    });

    function joinChat(username) {
        usernameContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        socket.emit('join', username);
    }

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
        messageElement.classList.add('message');
        if (sender === 'System') {
            messageElement.classList.add('system');
            messageElement.innerHTML = `<em>${text}</em>`;
        } else {
            const color = getColorForUsername(sender);
            messageElement.innerHTML = `<strong style="color: ${color}">${sender}:</strong> ${text}`;
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getColorForUsername(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 40%)`;
    }
});