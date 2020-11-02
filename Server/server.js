const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require("./routes");
//const jwt = require('jsonwebtoken');
//const cookieParser = require('cookie-parser');

const app = express();

var port = 1337;
var version = "v1";
// const tokenSecret = "wFq9+ssDbT#e2H9^";
// var decoded={};
// var token;

// var verifyCookie = function(req,res,next){
//     var cookieValue = req.cookies;
//     if(!cookieValue){
//         return res.status(400).send('<script>alert("Cookie not provided user authorization");window.location = "/"</script>');
//     }

//     var authData = req.cookies.token;
//     if(authData){
//         token = authData;
//         try {
//             decoded = jwt.verify(token, tokenSecret);
//             if(!decoded || !decoded.role){
//                 return res.status(400).send('<script>alert("user role not mentioned in token for user authorization");window.location = "/"</script>');
//             }
//             if(decoded.role!=='admin'){
//                 return res.status(400).send('<script>alert("Unauthorized user");window.location = "/"</script>');
//             }
//             next();
//           } catch(err) {
//             return res.status(400).send('<script>alert("'+err.toString()+'");window.location = "/"</script>');
//           }
//     }
//     else {
//         return res.status(400).send('<script>alert("Appropriate authentication information needs to be provided");window.location = "/"</script>');
//     }

// };

app.use(cors());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
//app.use(cookieParser());

app.use('/api/'+version,routes);

// const fs = require('fs');
// const { request } = require('express');

// app.use('/',express.static('public'));

app.listen(port,()=>{
    console.log("Listening on port: "+port);
});

// app.get('/homepage', verifyCookie, (req, res) => {
//     console.log('hey hye hye');
//     return res.sendFile(__dirname+'/public' + '/homePage.html');
// });

// app.get('/teams', verifyCookie, (req, res) => {
//     return res.sendFile(__dirname+'/public' + '/createOrViewTeam.html');
// });

// app.get('/examiners', verifyCookie, (req, res) => {
//     return res.sendFile(__dirname+'/public' + '/createOrViewExaminers.html');
// });

// app.get('/', (req, res) => {
//     return res.sendFile(__dirname+'/public' + '/index.html');
// });