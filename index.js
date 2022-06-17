const express = require('express'); //Import the express dependency
const {mainView,getData } = require('./controllers/mainController');

const app = express();              //Instantiate an express app, the main work horse of this server
const PORT = process.env.PORT || 5000     //Save the port number where your server will be listening

app.set('view engine', 'ejs');
app.use(express.json({limit: '5000mb'}));
app.use(express.urlencoded({extended: false,limit: '5000mb'}));
app.use(express.static('static'));
app.get('/', mainView);
app.post('/', getData);

const server=app.listen(PORT, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${PORT}`); 
});
server.setTimeout(1500000);
