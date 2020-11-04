const { response } = require("express");
const express = require("express");
const { request } = require("http");
var twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const mongo = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requestBody, validationResult, body, header, param, query } = require('express-validator');
const moment = require('moment');
const authToken = require('./key');

const route = express.Router();

const MongoClient = mongo.MongoClient;
const uri = "mongodb+srv://rojatkaraditi:AprApr_2606@test.z8ya6.mongodb.net/project6DB?retryWrites=true&w=majority";
var client;
var collection;
var adminCollection;
const tokenSecret = "wFq9+ssDbT#e2H9^";
var decoded={};
var token;

var connectToDb = function(req,res,next){
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true});
    client.connect(err => {
      if(err){
          closeConnection();
          return res.status(400).json({"error":"Could not connect to database: "+err});
      }
      adminCollection = client.db("project6DB").collection("admins");
      collection = client.db("project6DB").collection("users");
      console.log("connected to database");
    next();
    });
};

var closeConnection = function(){
    client.close();
};

var verifyToken = function(req,res,next){
    var headerValue = req.header("Authorization");
    if(!headerValue){
        return res.status(400).json({"error":"Authorization header needs to be provided for using API"});
    }

    var authData = headerValue.split(' ');

    if(authData && authData.length==2 && authData[0]==='Bearer'){
        token = authData[1];
        try {
            decoded = jwt.verify(token, tokenSecret);
            next();
          } catch(err) {
            return res.status(400).json({"error":err});
          }
    }
    else {
        return res.status(400).json({"error":"Appropriate authentication information needs to be provided"})
    }
};

var isAuthorisedAdmin = function(request,response,next){
    if(decoded._id){
        var query = {"_id":new mongo.ObjectID(decoded._id)};
                adminCollection.find(query).toArray((err,res)=>{
                    if(err){
                        closeConnection();
                        return response.status(400).json({"error":err});
                    }
                    if(res.length<=0){
                        closeConnection();
                        return response.status(400).json({"error":"could not find user with id: "+decoded._id});
                    }
                    loggedInUser  = res[0];
                    if(loggedInUser && loggedInUser.role && loggedInUser.role!=='admin'){
                        closeConnection();
                        return response.status(400).json({"error":"Unauthorized user"});
                    }
                    next();
                });
    }else{
        closeConnection();
        return response.status(400).json({"error":"Appropriate authentication information needs to be provided"});
    }
};

 //var smsclient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 var smsclient = new twilio('AC4795b2534203c3773f137726ffe95b28', authToken);

route.use('/admin',verifyToken);
route.use(connectToDb);
route.use('/admin',isAuthorisedAdmin);


route.post('/sms',(request,response)=>{
    const twiml = new MessagingResponse();
    console.log("sms api is called");
    if(!request.body || !request.body.Body || !request.body.From || !request.body.Body.trim() || !request.body.From.trim() || !request.body.To || !request.body.To.trim()){
        twiml.message('No input provided. Please try again with input');
        closeConnection();
        response.writeHead(200, {'Content-Type': 'text/xml'});
        console.log('No input provided. Please try again with input message sent');
        return response.end(twiml.toString());
    }
   
    var text = request.body.Body.trim();
    console.log("Text: " + text);
    if(text.toUpperCase() === 'START'){
        console.log("inside start");
        var phoneNumber = request.body.From;
        var query = {"phoneNumber" : phoneNumber};
        console.log(phoneNumber);
        collection.find(query).toArray((err,res)=>{
            console.log("entity created");
            if(err){
                twiml.message('Some error occured. Please try again');
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('Some error occured. Please try again - message sent');
                return response.end(twiml.toString());
            }
            if(res.length>0){
                twiml.message('You are already enrolled. Thank you');
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('You are already enrolled. Thank you - message sent');
                return response.end(twiml.toString());
            }

            var userState = [
                "None",
                "Headache",
                "Dizziness",
                "Nausea",
                "Fatigue",
                "Sadness"
            ];

            var date = new Date();
            var dateWrapper = moment(date);
            var dateString = dateWrapper.format("YYYY MMM D H:mm:ss"); 

            var newUser = {
                "phoneNumber" : phoneNumber,
                "date" : dateString,
                "step" : 1,
                "history" : [],
                "currentSymptom" : -1,
                "userState" : userState
            }

            collection.insertOne(newUser,(err,res)=>{
                if(err){
                    twiml.message('Some error occured. Please try again');
                    closeConnection();
                    response.writeHead(200, {'Content-Type': 'text/xml'});
                    console.log('Some error occured. Please try again - message sent');
                    return response.end(twiml.toString());
                }
                if(res.ops.length<=0){
                    twiml.message('User could not be registered. Please try again');
                    closeConnection();
                    response.writeHead(200, {'Content-Type': 'text/xml'});
                    console.log('User could not be registered. Please try again - message sent');
                    return response.end(twiml.toString());
                }
                else{
                    smsclient.messages.create({
                        body: 'Welcome to the study',
                        to: phoneNumber, 
                        from: '+18559083694'
                    })
                    .then((message) => {
                        console.log('Welcome to the study - message sent' );
                        twiml.message('Please indicate your symptom (1)Headache, (2)Dizziness, (3)Nausea, (4)Fatigue, (5)Sadness, (0)None');
                        closeConnection();
                        response.writeHead(200, {'Content-Type': 'text/xml'});
                        console.log('Please indicate your symptom (1)Headache, (2)Dizziness, (3)Nausea, (4)Fatigue, (5)Sadness, (0)None - message sent');
                        return response.end(twiml.toString());
                    });
                }
            });

        });
    }
    else{
        var phoneNumber = request.body.From;
        var query = {"phoneNumber" : phoneNumber};
        var text = request.body.Body.trim();

        collection.find(query).toArray((err,res)=>{
            if(err){
                twiml.message('Some error occured. Please try again');
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('Some error occured. Please try again - message sent');
                return response.end(twiml.toString());
            }
            if(res.length<=0){
                twiml.message("Unregistered user. Please register by texting 'START' then continue.");
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('Unregistered user. Please register by texting START then continue. - message sent');
                return response.end(twiml.toString());
            }

            var user = res[0];
            if(user.step == 1 || user.step == 3 || user.step == 5){
                var symptoms = user.userState;
                if(isNaN(text) || text > symptoms.length-1){
                    var i = symptoms.length-1;
                    var msg = 'Please enter a number from 0 to '+i;
                    twiml.message(msg);
                    closeConnection();
                    response.writeHead(200, {'Content-Type': 'text/xml'});
                    console.log(msg+' - message sent');
                    return response.end(twiml.toString());
                }
                else if(text == 0){
                    var updatedData = {
                        "currentSymptom" : 0,
                        "step" : 0,
                        "userState" : "Done"
                    }
                    var oldQuery = {'_id':mongo.ObjectID(user._id)};
                    var newQuery = {$set : updatedData};

                    collection.updateOne(oldQuery,newQuery,(err,res)=>{
                        if(err){
                            twiml.message('Some error occured. Please try again');
                            closeConnection();
                            response.writeHead(200, {'Content-Type': 'text/xml'});
                            console.log('Some error occured. Please try again'+' - message sent');
                            return response.end(twiml.toString());
                        }
                        else{
                            twiml.message('Thank you and we will check with you later');
                            closeConnection();
                            response.writeHead(200, {'Content-Type': 'text/xml'});
                            console.log('Thank you and we will check with you later'+' - message sent');
                            return response.end(twiml.toString());
                        }
                    });
                }
                else{
                    var updatedData = {
                        "currentSymptom":text,
                        "step": user.step+1
                    }

                    var oldQuery = {'_id':mongo.ObjectID(user._id)};
                    var newQuery = {$set : updatedData};

                    collection.updateOne(oldQuery,newQuery,(err,res)=>{
                        if(err){
                            twiml.message('Some error occured. Please try again');
                            closeConnection();
                            response.writeHead(200, {'Content-Type': 'text/xml'});
                            console.log('Some error occured. Please try againer'+' - message sent');
                            return response.end(twiml.toString());
                        }
                        else{
                            twiml.message('On a scale from 0 (none) to 4 (severe), how would you rate your ' + symptoms[text]+' in the last 24 hours?');
                            closeConnection();
                            response.writeHead(200, {'Content-Type': 'text/xml'});
                            console.log('On a scale from 0 (none) to 4 (severe), how would you rate your ' + symptoms[text]+' in the last 24 hours?'+' - message sent');
                            return response.end(twiml.toString());
                        }
                    });
                }
            }
            else if(user.step == 2 || user.step == 4 || user.step == 6){
                var symptoms = user.userState;
                var currentSymptom = user.currentSymptom;
                var history = user.history;
                var msg="";

                if(text == 1 || text == 2){
                    msg='You have a mild '+symptoms[currentSymptom];
                }
                else if(text==3){
                    msg='You have a moderate '+symptoms[currentSymptom];
                }
                else if(text==4){
                    msg='You have a severe '+symptoms[currentSymptom];
                }
                else if(text==0){
                    msg='You do not have a '+symptoms[currentSymptom];
                }
                else{
                    twiml.message('Please enter a number from 0 to 4');
                    closeConnection();
                    response.writeHead(200, {'Content-Type': 'text/xml'});
                    console.log('Please enter a number from 0 to 4'+' - message sent');
                    return response.end(twiml.toString());
                }

                var newHistory = {};
                newHistory.symptom = symptoms[currentSymptom];
                newHistory.severity = text
                history.push(newHistory);

                symptoms.splice(currentSymptom,1);
                var updatedSymptoms={};
                if(user.step==6){
                    updatedSymptoms = {
                        "currentSymptom":-1,
                        "step": 0,
                        "history": history,
                        "userState": "Done"
                    };
                }
                else{
                    updatedSymptoms = {
                        "currentSymptom":-1,
                        "step": user.step+1,
                        "history": history,
                        "userState": symptoms
                    };
                }

                var oldQuery = {'_id':mongo.ObjectID(user._id)};
                var newQuery = {$set : updatedSymptoms};

                collection.updateOne(oldQuery,newQuery,(err,res)=>{
                    if(err){
                        twiml.message('Some error occured. Please try again');
                        closeConnection();
                        response.writeHead(200, {'Content-Type': 'text/xml'});
                        console.log('Some error occured. Please try again'+' - message sent');
                        return response.end(twiml.toString());
                    }
                    else{
                        smsclient.messages.create({
                            body: msg,
                            to: phoneNumber, 
                            from: '+18559083694'
                        })
                        .then((message) => {
                            console.log(msg+' - message sent');
                            if(user.step==6){
                                twiml.message('Thank you and see you soon');
                                closeConnection();
                                response.writeHead(200, {'Content-Type': 'text/xml'});
                                console.log('Thank you and see you soon'+' - message sent');
                                return response.end(twiml.toString());
                            }
                            else{
                                var newMessage = "Please indicate your symptom ";
                                for(var i=1;i<symptoms.length;i++){
                                    newMessage = newMessage+'('+i+')'+symptoms[i]+', ';
                                }
                                newMessage = newMessage+'(0)None';
                                twiml.message(newMessage);
                                closeConnection();
                                response.writeHead(200, {'Content-Type': 'text/xml'});
                                console.log(newMessage+' - message sent');
                                return response.end(twiml.toString());
                            }
                        });
                    }
                });

            }
            else if(user.step == 0){
                twiml.message('You are done. Thank you.');
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('You are done. Thank you.'+' - message sent');
                return response.end(twiml.toString());
            }
            else{
                twiml.message('Some error occured. Please try again.');
                closeConnection();
                response.writeHead(200, {'Content-Type': 'text/xml'});
                console.log('Some error occured. Please try again.'+' - message sent');
                return response.end(twiml.toString());
            }
        });
    }
});

route.get("/login",[
    header("Authorization","Authorization header required to login").notEmpty().trim()
],(request,response)=>{

    const err = validationResult(request);
    if(!err.isEmpty()){
        closeConnection();
        return response.status(400).json({"error":err});
    }
    
    try{
        var data = request.header('Authorization');
        var authData = data.split(' ');

        if(authData && authData.length==2 && (authData[0]==='Basic')){

            if(authData[0]==='Basic'){
                let buff = new Buffer(authData[1], 'base64');
                let loginInfo = buff.toString('ascii').split(":");
                var result ={};
    
                if(loginInfo!=undefined && loginInfo!=null && loginInfo.length==2){
                    var query = {"email":loginInfo[0]};
                    adminCollection.find(query).toArray((err,res)=>{
                        var responseCode = 400;
                        if(err){
                            result = {"error":err};
                        }
                        else if(res.length<=0){
                            result={"error":"no such user present"};
                        }
                        else{
                            var user = res[0];
                            if(bcrypt.compareSync(loginInfo[1],user.password)){
                                delete user.password;
                                result=user;
                                user={_id:user._id};
                                user.exp = Math.floor(Date.now() / 1000) + (60 * 60);
                                var token = jwt.sign(user, tokenSecret);
                                result.token=token;
                                responseCode=200;
                            }
                            else{
                                result={"error":"Username or password is incorrect"};
                            }
                        }
                        closeConnection();
                        return response.status(responseCode).json(result);
    
                    });
                }
                else{
                    closeConnection();
                    return response.status(400).json({"error":"credentials not provided for login"});
                }
            }
        }
        else{
            closeConnection();
            return response.status(400).json({"error":"Desired authentication type and value required for login"})
        }
    }
    catch(error){
        closeConnection();
        return response.status(400).json({"error":error.toString()});
    }

});

route.get('/admin/users',(request,response)=>{
    collection.find().toArray((err,res)=>{
        if(err){
            closeConnection();
            return response.status(400).json({"error":err});
        }
        if(res.length<=0){
            closeConnection();
            return response.status(400).json({"error":"could not find any users"});
        }
        var users = res;
        for(var i=0;i<users.length;i++){
            delete users[i].step;
            delete users[i].currentSymptom;
            delete users[i].userState;

            var history = users[i].history;
            for(var j=0;j<history.length;j++){
                var his = history[j];
                //console.log(his);
                if(his.severity==1 || his.severity==2){
                    his.severityText = "mild"
                }
                else if(his.severity==3){
                    his.severityText = "moderate"
                }
                else if(his.severity==4){
                    his.severityText = "severe"
                }
                else if(his.severity==0){
                    his.severityText = "none"
                }
                history[j]=his;
            }
            users[i].history = history;
        }

        closeConnection();
        return response.status(200).json(users);
    });
});

route.delete('/admin/users/:id',[
    param('id','id should be a valid mongo id').isMongoId()
],
(request,response)=>{
    const err = validationResult(request);
    if(!err.isEmpty()){
        closeConnection();
        return response.status(400).json({"error":err});
    }
    var query = {"_id":new mongo.ObjectID(request.params.id)};
    collection.find(query).toArray((err,res)=>{
        if(err){
            closeConnection();
            return response.status(400).json({"error":err});
        }
        if(res.length<=0){
            closeConnection();
            return response.status(400).json({"error":"could not find user with id: "+request.params.id});
        }

        collection.deleteOne(query,(err,res)=>{
            if(err){
                closeConnection();
                return response.status(400).json({"error":err});
            }
            closeConnection();
            return response.status(200).json({"result":"user unsubscribed"});

        });
    });
});

route.get("/admin/profile",verifyToken,(request,response)=>{
    var query = {"_id":new mongo.ObjectID(decoded._id)};
    adminCollection.find(query).toArray((err,res)=>{
        if(err){
            closeConnection();
            return response.status(400).json({"error":err});
        }
        if(res.length<=0){
            closeConnection();
            return response.status(400).json({"error":"no user found with id "+decoded._id});
        }
        var user = res[0];
        delete user.password;
        closeConnection();
        return response.status(200).json(user);
    });
});

module.exports = route; 