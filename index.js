const express = require('express'); //Import the express dependency
const {mainView,getData } = require('./controllers/mainController');

const app = express();              //Instantiate an express app, the main work horse of this server

app.set('view engine', 'ejs');
app.use(express.json({limit: '5000mb'}));
app.use(express.urlencoded({extended: false,limit: '5000mb'}));
app.use(express.static('static'));
app.get('/', mainView);
app.post('/', getData);


module.exports = app;
