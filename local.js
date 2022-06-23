const app = require('./index.js');
const PORT = process.env.PORT || 5000;

const server=app.listen(PORT, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${PORT}`); 
});
server.setTimeout(1500000);
server.keepAliveTimeout = 30 * 1500000;
server.headersTimeout = 35 * 1500000;
