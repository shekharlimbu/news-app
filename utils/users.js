const users = [];

//add user to array who has recently joined and return it for further use
function userJoin(id, username){
    const user = {id, username};

    users.push(user);

    return user;
}

//return the user details who's sending the message
function getCurrentUser(id){
    return users.find(user => user.id === id);
}

//remove user from array when user leaves room
function userLeave(id){
    const index = users.findIndex(user => user.id === id);

    if(index != -1){
        return users.splice(index, 1)[0];
    }
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave
}