'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
// app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static('public'));

var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = "mongodb://Admin:password1234@ds127968.mlab.com:27968/fb-chat-bot-db";

// Use connect method to connect to the server
var db;
MongoClient.connect(url, function(err, database) {
  assert.equal(null, err);
  db = database;
  console.log("Connected successfully to server");
  //db.close();
});

// const MongoClient = require('mongodb').MongoClient;
// var db;
// MongoClient.connect("mongodb://Roos:shv'l,6f@ds127988.mlab.com:27988/fb-chat-bot-db", (err, database) => {
//    if (err) return console.log(err)
//     db = database;
// })


var Clarifai = require('clarifai');
var appClarifai = new Clarifai.App(
  'McQCTVH2Pv3Yu0Pa3LhD76WsTophGA-FmOqQUdk_',
  'HmDVVO-TzoPMQkJAfkt4vNwZJtWw2GAEdehbXf02'
);


/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/loginfb/:senderId', function(req, res){
  var id = ""
  var senderId = req.params.senderId;
  console.log("loginfb as ", senderId);
  res.send(`
            <html>
              <head>
                <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
                <title>Messenger Demo</title>
              </head>
              <body>
                <script>
                  window.fbAsyncInit = function() {
                    FB.init({
                      appId: '727530460757518',
                      xfbml: true,
                      version: 'v2.6'
                    });
                  };

                  (function(d, s, id){
                    var js, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) {return;}
                    js = d.createElement(s); js.id = id;
                    js.src = "//connect.facebook.net/en_US/sdk.js";
                    fjs.parentNode.insertBefore(js, fjs);
                  }(document, 'script', 'facebook-jssdk'));
                </script>

                <h1>Messenger Demo</h1>

                <div>
                  <p>The "Send to Messenger" plugin will trigger an authentication callback to your webhook.</p>

                  <div class="fb-send-to-messenger" 
                    messenger_app_id='727530460757518'
                    page_id='1868951300006199'
                    data-ref="PASS_THROUGH_PARAM" 
                    color="blue" 
                    size="standard">
                  </div>
                </div>

                <div>
                  <p>The "Message Us" plugin takes the user directly to Messenger and into a thread with your Page.</p>

                  <div class="fb-messengermessageus" 
                    messenger_app_id='727530460757518'
                    page_id='1868951300006199'
                    color="blue"
                    size="standard">
                  </div>
                </div>

              </body>
            </html>

            <script>
              window.fbAsyncInit = function() {
                FB.init({
                  appId      : '727530460757518',
                  xfbml      : true,
                  version    : 'v2.8'
                });
                FB.AppEvents.logPageView();
              };

              (function(d, s, id){
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {return;}
                js = d.createElement(s); js.id = id;
                js.src = "//connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));

                function myFacebookLogin() {
                  var fbId = ""
                  FB.login(function(){
                    FB.api('/me', {fields: 'id'}, function(response) {
                      fbId = response.id;
                      console.log(${senderId})
                      $.post("/addFacebookId",
                      {
                        senderId: ${senderId},
                        facebookId: fbId
                      },
                      function(data, status){
                        console.log(data);
                      });
                    });
                  }, {scope: 'email,publish_actions,user_likes,user_friends,user_status,user_posts,user_relationships,user_relationship_details,user_photos,user_location,user_hometown,user_games_activity,user_religion_politics,user_tagged_places,user_videos,user_website,user_work_history'});  
                }
            </script>
            <button onclick="myFacebookLogin()">Login with Facebook</button>
  `);
});

app.post('/addFacebookId', function (req, res) {
  console.log("==================",req.body,"==================")
  var senderId = req.body.senderId;
  var facebookId = req.body.facebookId;
  var user = {
    senderID: senderId,
    facebookID: facebookId
  };

  db.collection('user').findOne({senderID: senderId}, function(err, document) {
    if(err){
      console.log("Error add FacebookId",err);
    }
    else if(document){
      db.collection('user').update({senderID: senderId}, {$set: {facebookID:facebookId}});
    }
    else{
      db.collection('user').insert(user);     
    }
    res.send("success");
  });
});

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    console.log('start myfunction');
    console.log("senderID");
    console.log(typeof(senderID));
    console.log(senderID);
    var lastMessage = ''; 
    var facebookId = "";
    db.collection('user').find({senderID: senderID }).toArray(function(err, docs) {   
        if(err){
          console.log('error!');
          return ;
        }
        else if(docs.length != 0){//found user
          console.log('-----found user-----');
          console.log(docs);
          console.log('lastMessage = ');
          lastMessage = docs[0].lastMessage;
          facebookId = docs[0].facebookID;
          console.log(lastMessage);
          db.collection('user').update(
            { senderID: senderID },
            {$set: {lastMessage : messageText}}, 
            function(err, result) {
              if(err){
                console.log('error');
                return;
              }
            }
          );
        }
        else{//user not found
          console.log('-----user not found-----');
          var user = {
            senderID: senderID,
            lastMessage: messageText,
          };
          db.collection('user').insert(user);          
        }
        if(lastMessage.indexOf('cal')!= -1 || lastMessage.indexOf('wolfram')!= -1){
          console.log('REST TO Wolfram');
          console.log(messageText);
          sendTextMessage(senderID, messageText);
        }
        else if(lastMessage.indexOf('know')!= -1 || lastMessage.indexOf('wiki')!= -1){
          console.log('REST TO Wiki');
          console.log(messageText);
          var request = require('request');
          request({
              url: 'https://en.wikipedia.org/w/api.php?action=query&titles='+messageText+'&prop=revisions&rvprop=content&format=json', //URL to hit
              // qs: {action: 'query', time: +new Date()}, //Query string data
              method: 'GET', //Specify the method
              headers: { //We can define headers too
                  'Content-Type': 'MyContentType',
                  'Custom-Header': 'Custom Value'
              }
          }, function(error, response, body){
              if(error) {
                  console.log(error);
              } else {
                  console.log(response.statusCode, body);
              }
          });
          sendTextMessage(senderID, messageText);
        }
        else if(lastMessage.indexOf('about me')!= -1){
          console.log('REST TO GraphAPI');
          if(messageText.indexOf('top') !=-1 && (messageText.indexOf('picture')!= -1 || messageText.indexOf('photo')!= -1)){
            console.log(">>>>>>>>>>>> start! <<<<<<<<<<<")
            
          }
          console.log(messageText);
          sendTextMessage(senderID, messageText);
        }
        else if(messageText.indexOf('cal') !=-1 || messageText.indexOf('wolfram')!= -1){// calculate
          sendTextMessage(senderID, "Ok, Give me the question1");
        }
        else if(messageText.indexOf('know') !=-1 || messageText.indexOf('wiki')!= -1){// search wiki
          sendTextMessage(senderID, "Ok, Give me the question2");
        }
        else if(messageText.indexOf('about me')!=-1){
          sendTextMessage(senderID, "Ok, Give me the question about you.");          
        }
        else if(messageText.indexOf('ห่วย')!=-1){
          var messageData = {
            recipient: {
              id: recipientId
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "button",
                  text: "This is test text",
                  buttons:[{
                    type: "web_url",
                    url: "https://www.oculus.com/en-us/rift/",
                    title: "Open Web URL"
                  }, {
                    type: "postback",
                    title: "Trigger Postback",
                    payload: "DEVELOPER_DEFINED_PAYLOAD"
                  }, {
                    type: "phone_number",
                    title: "Call Phone Number",
                    payload: "+16505551234"
                  }]
                }
              }
            }
          };  

          callSendAPI(messageData);
        }
        else if(messageText.indexOf('quick')!=-1){
          var messageData = {
          recipient: {
            id: recipientId
          },
          message: {
            text: "What's your favorite movie genre?",
            quick_replies: [
              {
                "content_type":"text",
                "title":"Action",
                "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
              },
              {
                "content_type":"text",
                "title":"Comedy",
                "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
              },
              {
                "content_type":"text",
                "title":"Drama",
                "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
              }
            ]
          }
        };

        callSendAPI(messageData);
        }
        else if(messageText.indexOf('ประเมิณ')!=-1){
          var recipientId = senderID; 
          var messageData = {
              recipient: {
                id: recipientId
              },
              message: {
                attachment: {
                  type: "template",
                  payload: {
                    template_type: "generic",
                    elements: [{
                      title: "rift",
                      subtitle: "Next-generation virtual reality",
                      item_url: "https://www.oculus.com/en-us/rift/",               
                      image_url: SERVER_URL + "/assets/rift.png",
                      buttons: [{
                        type: "web_url",
                        url: "https://www.oculus.com/en-us/rift/",
                        title: "Open Web URL"
                      }, {
                        type: "postback",
                        title: "Call Postback",
                        payload: "Payload for first bubble",
                      }],
                    }, {
                      title: "touch",
                      subtitle: "Your Hands, Now in VR",
                      item_url: "https://www.oculus.com/en-us/touch/",               
                      image_url: SERVER_URL + "/assets/touch.png",
                      buttons: [{
                        type: "web_url",
                        url: "https://www.oculus.com/en-us/touch/",
                        title: "Open Web URL"
                      }, {
                        type: "postback",
                        title: "Call Postback",
                        payload: "Payload for second bubble",
                      }]
                    }]
                  }
                }
              }
            };  
            callSendAPI(messageData);
        }

        ///graph
        else{// simsimi
            //simsimi
            var text = messageText;
            var thaiChar = ['ก','ข','ฃ','ค','ฅ','ฆ','ง','จ','ฉ','ช','ซ','ฌ','ญ','ฎ','ฏ','ฐ','ฑ','ฒ','ณ','ด','ต','ถ','ท','ธ','น','บ','ป','ผ','ฝ','พ','ฟ','ภ','ม','ย','ร','ล','ว','ศ','ษ','ส','ห','ฬ','อ','ฮ'];
            var isThai = false;
            for(var i =0;i<44;i++){
              if(text.indexOf(thaiChar[i]) != -1){
                isThai = true;
                break;
              }
            }
            if(isThai){//sim simi
              console.log("start simsimi");
              var simsimi_key = "b6484249-52b1-4053-9e93-edaaace7c8fd";
              var thai_lang = "th";
              var eng_lang = "en";
              //var text = "Who are you?";
                console.log("start simsimi 1");
              
              var request = require('request');
                console.log("start simsimi 2");
              request({
                  uri: "http://sandbox.api.simsimi.com/request.p?key=".concat(simsimi_key)+"&lc=".concat(thai_lang)+"&ft=1.0&text=".concat(text),
                  method: "GET"
              }, function(error, response, body) {
                  if(error) {
                console.log("start simsimi 3");
                      console.log(error);
                  } else {
                console.log("start simsimi 4");
                console.log("--response.statusCode-- > ".concat(response.statusCode));
                      if(response.statusCode == 200 ){
                          console.log("--------------------------------body simisimi--------------------------------"); 
                          console.log(body);
                          console.log("--------------------------------body[ result ]--------------------------------");
                          var parsedBody = JSON.parse(body);
                          console.log(parsedBody["result"]);
                          if(parsedBody["result"] == 100) {
                              console.log("--------------------------------body[ response ]--------------------------------");
                              console.log(parsedBody["response"]);
                              sendTextMessage(senderID, parsedBody["response"]);
                          }
                          else {
                              sendTextMessage(senderID, "ขอโทษ สหาย ข้าไม่เข้าใจ");
                          }
                      }
                  }

              });
              console.log("end simsimi");
              }
            else{//susi
              console.log("start susi");
              var text = messageText;
              var request = require('request');
              request({
                  uri: "http://api.asksusi.com/susi/chat.json?timezoneOffset=-420&q=".concat(text),
                  method: "GET"
              }, function(error, response, body) {
                  if(error) {
                      console.log(error);
                  } else {
                      if(response.statusCode == 200){
                          console.log("--------------------------------body susi--------------------------------"); 
                          console.log(body);
                          console.log("--------------------------------body[ result ]--------------------------------");
                          var parsedBody = JSON.parse(body);
                          console.log(parsedBody["result"]);
                              console.log("--------------------------------body[ response ]--------------------------------");
                              var toBeSend = parsedBody["answers"][0]["actions"][0]["expression"];
                              sendTextMessage(senderID, toBeSend);
                          //    sendTextMessage(senderID, "Sorry, I don't understand what you mean.");
                          
                      }
                  }

              });
              console.log("end susi");
            }
            

            
            //end simsimi
          //sendTextMessage(senderID, "Sorry, I don't understand what you mean.");
        }
    });
    
    /*
    switch (messageText) {
      case 'image':
        sendImageMessage(senderID);
        break;

      case 'gif':
        sendGifMessage(senderID);
        break;

      case 'audio':
        sendAudioMessage(senderID);
        break;

      case 'video':
        sendVideoMessage(senderID);
        break;

      case 'file':
        sendFileMessage(senderID);
        break;

      case 'button':
        sendButtonMessage(senderID);
        break;

      case 'generic':
        sendGenericMessage(senderID);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        break;

      case 'quick reply':
        sendQuickReply(senderID);
        break;        

      case 'read receipt':
        sendReadReceipt(senderID);
        break;        

      case 'typing on':
        sendTypingOn(senderID);
        break;        

      case 'typing off':
        sendTypingOff(senderID);
        break;        

      case 'account linking':
        sendAccountLinking(senderID);
        break;

      default:
        sendTextMessage(senderID, messageText);
    }
    */
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
    if(messageAttachments[0].type == 'image') {
      var lastMessage = ''; 
      db.collection('user').find({senderID: senderID }).toArray(function(err, docs) {
          if(err){
            console.log('error!');
            return ;
          }
          else if(docs.length != 0){ //found user
            
            let imageUrl = messageAttachments[0].payload.url;
            let predictResponse;
            let lastMessage = docs[0].lastMessage;
            console.log('<<<<<<<<<<<<<   IMG-begin  (%s)  >>>>>>>>>>>', imageUrl);

            // if(lastMessage == "image") {
              appClarifai.models.predict(Clarifai.GENERAL_MODEL, imageUrl).then(
                function(response) {
                  let concepts = response.data.outputs[0].data.concepts;
                  console.log("!!!!!!!!!! Success-image !!!!!!!!!!!");
                  console.log(concepts);
                  let conceptsString = "";
                  for(let concept of concepts) {
                    conceptsString += `${concept.name} (${(concept.value*100.0).toFixed(2)})\n`;
                  }
                  console.log("Concepts: ");
                  console.log(conceptsString, "\n\n");

                  let toBeSend = "รูปนี้เป็นรูปเกี่ยวกับ : \n"+conceptString;
                  sendTextMessage(senderID, toBeSend);
                },
                function(err) {
                  console.error("error: image processing clarifal");
                }
              );
            // }
            console.log('<<<<<<<<<<<<<   IMG-end   >>>>>>>>>>>');
          } 
          else{//user not found
            console.log('-----user not found-----');
            var user = {
              senderID: senderID,
              lastMessage: "",
            };
            db.collection('user').insert(user);          
          }
      });
    }
    console.log(messageAttachments);
  }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + "/assets/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: SERVER_URL + "/assets/test.txt"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",        
          timestamp: "1428444852", 
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

