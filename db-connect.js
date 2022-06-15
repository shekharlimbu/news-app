const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/edureka', (error) => {
    if(!error){
        console.log('Success. Connected to database..!!');
    }
    else{
        console.log('Error in connecting to database..');
    }
});
