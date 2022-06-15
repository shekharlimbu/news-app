const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const formatMessage = require('./utils/messages');
const {userJoin, getCurrentUser, userLeave} = require('./utils/users');
const request = require('request');
const bodyparser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');
const sgMail = require('@sendgrid/mail');

//temp to delete
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const dbConnection = require("./db-connect");
const User = require('./models/user.model');
const News = require('./models/news.model');

app.set('view engine', 'ejs');
app.set('views', './public/views');

app.use(bodyparser.urlencoded({
    encoded: true
}));

const PORT = 6500;

//for weather app API
const API_KEY1 = '';

//for sports news API
const API_KEY2 = '';

//for SendGrid Mail Service
const API_KEY3 = '';

const url = "https://api.openweathermap.org/data/2.5/weather?lat=22.5726&lon=88.3639&appid="+API_KEY1;
const url_ = "https://newsapi.org/v2/top-headlines?country=in&category=sports&apiKey="+API_KEY2;
sgMail.setApiKey(API_KEY3);

//app.use(express.static(path.join(__dirname,'public')));
app.use(express.static('public'));

//home route
app.get('/', (req,res) => {
    console.log('Server side here');

    let isLoggedIn = true;
    var token = localStorage.getItem('myToken');
    if (!token) {
        isLoggedIn = false;
    }

    let output;

    //from weather API
    function fetchWeatherData(){
        return new Promise(resolve => {
            request(url, (err,response,body) =>{
                if(err){
                    console.log(err);
                } else {
                    output = JSON.parse(body);
                    console.log(output);
                    resolve(output);
                    //res.render('index.ejs',{data: output});
                }
            });
          });
    }  

    async function fetchNewsData(){
        const result = await fetchWeatherData();

        News.find().sort('-_time').limit(3).find((err, data) => {
            if(!err){
                //creating a new object might not be required for ejs as we did previously for handlebars
                const newArray = {
                    newObject: data.map(document => {
                      return {
                        id: document._id,
                        title: document.title,
                        description: document.description,
                        url: document.url,
                        urlToImage: document.urlToImage,
                        publishedAt: document.publishedAt,
                        _time: document._time
                      }
                    })
                }
                res.render('index.ejs',{isLoggedIn, data1: result, data2: newArray.newObject});
            }
            else{
                res.send('Error while fetching data..');
            }
        });
    } 

    fetchNewsData();
    //res.render('index.ejs', {isLoggedIn});
});

//home route with chat
app.post('/', (req,res) => {
    //console.log(req.body.username);

    res.redirect('/chat?username='+req.body.username);
});

//homepage GET - LOGIN
app.get('/chat', (req, res) => {
    if(!req.query.username){
        res.redirect('/');
    }else{
        
        let isLoggedIn = true;
        var token = localStorage.getItem('myToken');
        if (!token) {
            isLoggedIn = false;
        }

        //from weather API
        function fetchWeatherData(){
            return new Promise(resolve => {
                request(url, (err,response,body) =>{
                    if(err){
                        console.log(err);
                    } else {
                        output = JSON.parse(body);
                        console.log(output);
                        resolve(output);
                        //res.render('index.ejs',{data: output});
                    }
                });
              });
        }  
    
        async function fetchNewsData(){
            const result = await fetchWeatherData();
    
            News.find().sort('-_time').limit(3).find((err, data) => {
                if(!err){
                    //creating a new object might not be required for ejs as we did previously for handlebars
                    const newArray = {
                        newObject: data.map(document => {
                          return {
                            id: document._id,
                            title: document.title,
                            description: document.description,
                            url: document.url,
                            urlToImage: document.urlToImage,
                            publishedAt: document.publishedAt,
                            _time: document._time
                          }
                        })
                    }
                    res.render('chat.ejs',{isLoggedIn, data1: result, data2: newArray.newObject});
                }
                else{
                    res.send('Error while fetching data..');
                }
            });
        } 
        fetchNewsData();
        //res.render('chat.ejs', {isLoggedIn});
    }
});

//signup GET - REGISTER
app.get('/register', (req, res) => {
    res.render('register.ejs');
});

//signup POST - REGISTER
app.post('/register', (req, res) => {

    let hashedPassword = bcrypt.hashSync(req.body.password, 8);

    var user = new User();

    user.username = req.body.username;
    user.password = hashedPassword;
    user.email = req.body.email;
    user.role = 'user';

    user.save((err, data) => {
        if(!err){
            console.log('User added to system ..');
            let msgSuccess = 'Your account was created successfully. Please login to continue..';
            let msgClass = 1;
            res.redirect('/login?msg='+msgSuccess+'&'+'msgClass='+msgClass);
        }   
        else{
            //?msg=
            let msgError = 'Could not register user, please try again..';
            res.redirect('/login?msg='+msgError);
        }
    });
});

//GET - LOGIN
app.get('/login', (req, res) => {
    res.render('login.ejs',{msg: req.query.msg?req.query.msg:'', msgClass: req.query.msgClass?req.query.msgClass:''});
});

//POST - LOGIN
app.post('/login', (req, res) => {
    User.findOne({ username: req.body.username }, (err, user) => {
        let msgError = 'Invalid username/password, please try again..';
        let msgClass = 0;
        if(!err){
            if (!user) {
                res.redirect('/login?msg=' + msgError);
            }
            else{
                let passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
                if (!passwordIsValid){
                    res.status(401);
                    res.redirect('/login?msg='+'Incorrect password'+'&'+'msgClass='+msgClass);
                }
                else{
                    let token = jwt.sign({id: user.id, role: user.role}, config.secret, {
                        expiresIn: 300
                    });
                    localStorage.setItem('myToken', token);
                    res.redirect('/profile');
                }
            }
        }   
        else{
            res.status(500).send('Server side error, please try again..');
        }
    })
});

//after login GET - PROFILE.EJS
app.get('/profile', (req, res) => {
    var token = localStorage.getItem('myToken');
    if (!token) {
        res.redirect('/login');
    }
    else{
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else{
                User.findById(decoded.id, { password: 0 }, function (err, user) {
                    if (err) {res.redirect('/login')}
                    if (!user) {res.redirect('/login')}

                    res.render('profile.ejs',{user});
                });
            }
        });
    }
});

app.get('/logout', (req,res) => {
    localStorage.removeItem('myToken');
    res.redirect('/');
});

//add-news GET - ADD NEWS FORM
app.get('/add-news', (req, res) => {
    var token = localStorage.getItem('myToken');
    if (!token) {
        res.redirect('/login');
    }
    else{
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            if(decoded.role != 'admin'){
                res.redirect('/profile');
            }
            else{
                News.find().sort('-_time').find((err, data) => {
                    if(!err){
                        //creating a new object might not be required for ejs as we did previously for handlebars
                        const newArray = {
                            newObject: data.map(document => {
                              return {
                                id: document._id,
                                title: document.title,
                                description: document.description,
                                url: document.url,
                                urlToImage: document.urlToImage,
                                publishedAt: document.publishedAt,
                                _time: document._time
                              }
                            })
                        }
                        res.render('add-news.ejs',{msg: req.query.msg?req.query.msg:'', msgClass: req.query.msgClass?req.query.msgClass:'', data: newArray.newObject});
                    }
                    else{
                        res.send('Error while fetching data..');
                    }
                });
            }
        });
    }
});

//add-news POST - HANDLING FORM SUBMISSION
app.post('/add-news', (req, res) => {
    var token = localStorage.getItem('myToken');
    if (!token) {
        res.redirect('/login');
    }
    else{
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            if(decoded.role != 'admin'){
                res.redirect('/profile');
            }
            else{
                var news = new News();

                news.title = req.body.title;
                news.description = req.body.description;
                news.url = req.body.url;
                news.urlToImage = req.body.urlToImage;
                news.publishedAt = req.body.publishedAt;
                news._time = new Date();

                news.save((err, data) => {
                    if(!err){
                        console.log('News added to system ..');
                        let msgSuccess = 'The news was successfully added to the system..';
                        let msgClass = 1;
                        res.redirect('/add-news?msg='+msgSuccess+'&'+'msgClass='+msgClass);
                    }   
                    else{
                        let msgError = 'Could not register news, please try again..';
                        res.redirect('/add-news?msg='+msgError);
                    }
                });
            }
        });
    }
});

//EDIT NEWS - GET FORM
app.get('/edit-news/:id', (req, res) => {
     let id = req.params.id;
     console.log('Edit '+id);
    // res.render('edit-news.ejs',{id});

    var token = localStorage.getItem('myToken');
    if (!token) {
        res.redirect('/login');
    }
    else{
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            if(decoded.role != 'admin'){
                res.redirect('/profile');
            }
            else{
                News.find({_id: id }).find((err, data) => {
                    if(!err){
                        const newArray = {
                            newObject: data.map(document => {
                              return {
                                id: document._id,
                                title: document.title,
                                description: document.description,
                                url: document.url,
                                urlToImage: document.urlToImage,
                                publishedAt: document.publishedAt,
                                _time: document._time
                              }
                            })
                        }
                        console.log(data);
                        //res.render('edit-news.ejs', {data: data});
                        //res.send('Hello')
                        res.render('edit-news.ejs',{data: newArray.newObject});
                    }
                    else{
                        res.send('Error while fetching data..');
                    }
                })
            }
        });
    }
});

//EDIT NEWS - POST FORM
app.post('/edit-news', (req, res) => {

   var token = localStorage.getItem('myToken');
   if (!token) {
       res.redirect('/login');
   }
   else{
       jwt.verify(token, config.secret, function(err, decoded) {
           if (err) {
               res.redirect('/login');
           }
           if(decoded.role != 'admin'){
               res.redirect('/profile');
           }
           else{
              News.updateOne({_id: req.body.id}, {
                  title: req.body.title,
                  description: req.body.description,
                  url: req.body.url,
                  urlToImage: req.body.urlToImage,
                  publishedAt: req.body.publishedAt
              }, (err, data) => {
                  if(!err){
                    console.log('News updated in the system ..');
                    let msgSuccess = 'The news was successfully updated in the system..';
                    let msgClass = 1;
                    res.redirect('/add-news?msg='+msgSuccess+'&'+'msgClass='+msgClass);
                    // console.log('Id to be update - '+ req.body.id);
                    // console.log(data);
                    // res.redirect('/add-news');
                  }
                  else{
                    let msgError = 'Could not update news, please try again..';
                    res.redirect('/add-news?msg='+msgError);
                    //res.send('Error while updating data..');
                  }
              })
           }
       });
   }
});

//DELETE NEWS
app.get('/delete-news/:id', (req, res) => {
    let id = req.params.id;
    var token = localStorage.getItem('myToken');
   if (!token) {
       res.redirect('/login');
   }
   else{
       jwt.verify(token, config.secret, function(err, decoded) {
           if (err) {
               res.redirect('/login');
           }
           if(decoded.role != 'admin'){
               res.redirect('/profile');
           }
           else{
              News.deleteOne({_id: id}, (err, data) => {
                  if(!err){
                    console.log('News deleted from system ..');
                    let msgSuccess = 'The news was successfully deleted from the system..';
                    let msgClass = 1;
                    res.redirect('/add-news?msg='+msgSuccess+'&'+'msgClass='+msgClass);
                    //res.redirect('/add-news');
                  }
                  else{
                    let msgError = 'Could not delete news, please try again..';
                    res.redirect('/add-news?msg='+msgError);
                    //res.send('Error while deleting news..');
                  }
              })
           }
       });
   }
});

app.get('/about', (req, res) => {

    let isLoggedIn = true;
    var token = localStorage.getItem('myToken');
    if (!token) {
        isLoggedIn = false;
    }
    res.render('about.ejs',{isLoggedIn});
});

app.get('/contact', (req, res) => {

    let isLoggedIn = true;
    var token = localStorage.getItem('myToken');
    if (!token) {
        isLoggedIn = false;
    }
    res.render('contact.ejs',{msg: req.query.msg?req.query.msg:'', msgClass: req.query.msgClass?req.query.msgClass:'', isLoggedIn});
});

app.post('/contact', (req, res) => {

    let emailFrom = req.body.email;
    let emailTo = 'shekhar.limbu.edu@gmail.com';
    let msg = req.body.query+' from sender '+ emailFrom;

    let message = {
        to: emailTo,
        from: 'shekhar.limbu.edu@gmail.com',
        subject: 'Email via Edureka News App',
        text: msg
    }

    sgMail.send(message).then(response => {
        console.log('Email sent successfully..');
        let msgSuccess = 'The query was successfully sent..';
        let msgClass = 1;
        res.redirect('/contact?msg='+msgSuccess+'&'+'msgClass='+msgClass);
    }).catch(error => {
        console.log('Email failed..');
        let msgError = 'Could not send email, please try again..';
        res.redirect("/contact?msg="+msgError);
    });
});

app.get('/sports', (req,res) => {

    let isLoggedIn = true;
    var token = localStorage.getItem('myToken');
    if (!token) {
        isLoggedIn = false;
    }

    //sports news API
    request(url_, (err,response,body) =>{
        if(err){
            console.log(err);
        } else {
            const output = JSON.parse(body);
            //res.send(output);
            res.render('sports.ejs', {isLoggedIn, data: output.articles})
        }
    });
})

//Run when client connects
io.on('connection', socket => {
    console.log('New web socket connection..');

    socket.on('joinRoom', (username) => {
        const user = userJoin(socket.id, username);
        //to client when it connects
        socket.emit('message', formatMessage('Admin',`Welcome to Chat-app ${user.username}!`));
        //to everyone except client which connects
        socket.broadcast.emit('message', formatMessage('Admin', `${user.username} has joined the chat room..`));
    })

    //to everyone except client which disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user){
            io.emit('message',formatMessage('Admin',`${user.username} has left the chat room..`)); 
        }
    });

    //listen for chat messages
    socket.on('chatMessage', msg => {
        console.log('Message from client - '+msg);
    
        const user = getCurrentUser(socket.id);

        io.emit('message', formatMessage(user.username,msg));
    })
})

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
