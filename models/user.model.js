const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    role: String
});

module.exports = mongoose.model('users', modelSchema);