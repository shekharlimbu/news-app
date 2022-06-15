const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    title: String,
    description: String,
    url: String,
    urlToImage: String,
    publishedAt: String,
    _time: Date
});

module.exports = mongoose.model('news', modelSchema);