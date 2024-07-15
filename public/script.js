document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const usernameContainer = document.getElementById('username-container');
    const usernameInput = document.getElementById('username-input');
    const usernameSubmit = document.getElementById('username-submit');
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const imageUpload = document.getElementById('image-upload');
    const imageUploadButton = document.getElementById('image-upload-button');
    const profilePictureInput = document.getElementById('profile-picture-input');
    const profilePictureButton = document.getElementById('profile-picture-button');
    const profilePicturePreview = document.getElementById('profile-picture-preview');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsProfilePictureInput = document.getElementById('settings-profile-picture-input');
    const settingsProfilePictureButton = document.getElementById('settings-profile-picture-button');
    const settingsProfilePicturePreview = document.getElementById('settings-profile-picture-preview');
    const settingsUsernameInput = document.getElementById('settings-username-input');
    const settingsSaveButton = document.getElementById('settings-save');
    const settingsCloseButton = document.getElementById('settings-close');

    const MAX_USERNAME_LENGTH = 30;

    let username = localStorage.getItem('chatUsername');
    let profilePicture = localStorage.getItem('chatProfilePicture') || 'default-avatar.png';
    let isLoadingHistory = false;

    if (username) {
        joinChat(username);
    } else {
        usernameContainer.style.display = 'flex';
    }

    profilePictureButton.addEventListener('click', () => {
        profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', handleProfilePictureChange);

    usernameSubmit.addEventListener('click', () => {
        username = usernameInput.value.trim().slice(0, MAX_USERNAME_LENGTH);
        if (username) {
            localStorage.setItem('chatUsername', username);
            joinChat(username);
        }
    });

    function joinChat(username) {
        usernameContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        socket.emit('join', { username, profilePicture });
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', message);
            messageInput.value = '';
        }
    });

    imageUploadButton.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = e.target.result;
                socket.emit('chatImage', img);
            };
            reader.readAsDataURL(file);
        }
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        settingsUsernameInput.value = username;
        settingsProfilePicturePreview.src = profilePicture;
    });

    settingsCloseButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    settingsProfilePictureButton.addEventListener('click', () => {
        settingsProfilePictureInput.click();
    });

    settingsProfilePictureInput.addEventListener('change', handleProfilePictureChange);

    settingsSaveButton.addEventListener('click', () => {
        const newUsername = settingsUsernameInput.value.trim().slice(0, MAX_USERNAME_LENGTH);
        if (newUsername && newUsername !== username) {
            username = newUsername;
            localStorage.setItem('chatUsername', username);
            socket.emit('updateUsername', username);
        }
        settingsModal.style.display = 'none';
    });

    function handleProfilePictureChange(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicture = e.target.result;
                profilePicturePreview.src = profilePicture;
                settingsProfilePicturePreview.src = profilePicture;
                localStorage.setItem('chatProfilePicture', profilePicture);
                socket.emit('updateProfilePicture', profilePicture);

                profilePicturePreview.style.display = 'none';
                profilePicturePreview.offsetHeight;
                profilePicturePreview.style.display = 'block';

                settingsProfilePicturePreview.style.display = 'none';
                settingsProfilePicturePreview.offsetHeight;
                settingsProfilePicturePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    socket.on('chatMessage', (data) => {
        addMessage(data.username, data.message, data.profilePicture);
    });

    socket.on('chatImage', (data) => {
        addImage(data.username, data.image, data.profilePicture);
    });

    socket.on('initialChatHistory', (history) => {
        chatMessages.innerHTML = '';
        appendMessages(history);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (history.length === 20) {
            addLoadMoreButton();
        }
    });

    socket.on('additionalChatHistory', (messages) => {
        isLoadingHistory = false;
        if (messages.length > 0) {
            const oldScrollHeight = chatMessages.scrollHeight;
            appendMessages(messages.reverse());
            chatMessages.scrollTop = chatMessages.scrollHeight - oldScrollHeight;
            
            if (messages.length < 20) {
                removeLoadMoreButton();
            }
        } else {
            removeLoadMoreButton();
        }
    });

    socket.on('usernameUpdated', (newUsername) => {
        username = newUsername;
        localStorage.setItem('chatUsername', username);
    });

    function appendMessages(messages) {
        const fragment = document.createDocumentFragment();
        messages.forEach(item => {
            if (item.type === 'message') {
                fragment.appendChild(createMessageElement(item.username, item.message, item.profilePicture));
            } else if (item.type === 'image') {
                fragment.appendChild(createImageElement(item.username, item.image, item.profilePicture));
            }
        });
        chatMessages.insertBefore(fragment, chatMessages.firstChild);
    }

    function addMessage(sender, text, senderProfilePicture) {
        const messageElement = createMessageElement(sender, text, senderProfilePicture);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addImage(sender, imageData, senderProfilePicture) {
        const imageElement = createImageElement(sender, imageData, senderProfilePicture);
        chatMessages.appendChild(imageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function createMessageElement(sender, text, senderProfilePicture) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        const color = getColorForUsername(sender);
        messageElement.innerHTML = `
            <div class="message-avatar-container" style="width: 40px; height: 40px; overflow: hidden; border-radius: 50%; margin-right: 10px;">
                <img src="${senderProfilePicture}" alt="${sender}" class="message-avatar">
            </div>
            <div>
                <strong style="color: ${color}">${sender}:</strong> ${formatMessageWithLinks(text)}
            </div>
        `;
        return messageElement;
    }

    function createImageElement(sender, imageData, senderProfilePicture) {
        const imageElement = document.createElement('div');
        imageElement.classList.add('message');
        const color = getColorForUsername(sender);
        imageElement.innerHTML = `
            <div class="message-avatar-container" style="width: 40px; height: 40px; overflow: hidden; border-radius: 50%; margin-right: 10px;">
                <img src="${senderProfilePicture}" alt="${sender}" class="message-avatar">
            </div>
            <div>
                <strong style="color: ${color}">${sender}:</strong><br>
                <img src="${imageData}" alt="Uploaded image" style="max-width: 100%; max-height: 300px;">
            </div>
        `;
        return imageElement;
    }

    function addLoadMoreButton() {
        if (!document.getElementById('load-more-button')) {
            const loadMoreButton = document.createElement('button');
            loadMoreButton.id = 'load-more-button';
            loadMoreButton.textContent = 'Load More';
            loadMoreButton.addEventListener('click', loadMoreMessages);
            chatMessages.insertBefore(loadMoreButton, chatMessages.firstChild);
        }
    }

    function removeLoadMoreButton() {
        const loadMoreButton = document.getElementById('load-more-button');
        if (loadMoreButton) {
            loadMoreButton.remove();
        }
    }

    function loadMoreMessages() {
        if (!isLoadingHistory) {
            isLoadingHistory = true;
            const lastMessageIndex = chatMessages.children.length - 1; // Subtract 1 to account for the "Load More" button
            socket.emit('requestMoreHistory', lastMessageIndex);
        }
    }

    function getColorForUsername(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 40%)`;
    }

    function formatMessageWithLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }
});