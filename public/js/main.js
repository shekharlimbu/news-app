const chatMessages = document.querySelector('.chat-messages');

//get username from URL using qs cdn library
const {username} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

console.log(username);

const socket = io();

//when client joins chatroom emit this to server
socket.emit('joinRoom', username);

//handling messages from server
socket.on('message', message => {
    console.log(message);

    outputMessage(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;
})

const chatForm = document.getElementById('chat-form');

//chat messages from client
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const msg = e.target.elements.msg.value;

    console.log(msg);   //display in client
    socket.emit('chatMessage', msg);    //emit to server

    //clear input and focus for new message
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

//print messages to DOM
function outputMessage(message){
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `
    <p>${message.time}</p>
    <p>${message.username}: ${message.text}</p>
    `;
    document.querySelector('.chat-messages').appendChild(div);
}



