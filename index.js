#! /usr/bin/env node
// Include the terminal-kit lib
var term = require('terminal-kit').terminal;
// Include os, we will need this to get the location of
// the cligm.json file!
var os = require('os');
// Include fs, we will need it to actually read the cligm.json
// file
var fs = require('fs');
// Request libs for POST and GET
var request = require('request');
// Define our base url and access keys
var BASE_URL = "https://api.groupme.com/v3";
var user_access_key;
var grps = [];
// ----- Now begins the real app ----- //

var file = os.homedir() + "/.cligm.json";
// We now try to read the file, if it doesn't exist throw an error
// so they create the file
fs.readFile(file, 'utf8', function(err,data) {
  if(err) {
    if (err.errno == -2) {
      term.red("you have not created a proper ~/.cligm.json file in your home directory!");
      process.exit(1);
    }
  }
  user_access_key = JSON.parse(data).access_token;
  // We want to 'cache' users groups and put them in your cligm.json file
  
  writeObj = new Object;
  getUserGroups(function(usergroups) {
    for(var i in usergroups) {
      temp = new Object;
      temp.name = usergroups[i].name;
      temp.id = usergroups[i].id;
      grps.push(temp);
    }
    writeObj = { access_token: user_access_key, groups: grps };

    fs.writeFile(file, JSON.stringify(writeObj), function(err) {
      if(err) {
        console.log("Uh oh something went very wrong");
      }
    });
  }); 
});
var currentChat = "";
// Clear the current buffer to give us a 'clean slate'
term.clear();
// Display a welcome message to the user
term("Welcome to cligm! :D\n");
term.green.underline("This app is going to be so dope!\n");

// Move to the bottom left hand corner
term.moveTo(1, term.height-2);
term.blue("Please enter command below:\n");
loopIt();

function loopIt() {
  menu(function(result) {
    if(result) {
      // Move to the bottom left hand corner
      term.moveTo(1, term.height-2);
      term.blue("Please enter command below:\n");
      loopIt();
    } else {
      process.exit();
    }
  });
}


function menu(callback) {
  term.inputField(function(error, input) {
    // List groups
    if(input == "/list") {
      showGroups(function(err) {
        callback(true);
      });
    // Open group
    } else if(input.includes("/open ")) {
      openChat(input.replace("/open ", ""), function(result){
          currentChat = result;
          callback(true);       
      });      
    } else if(input == "/quit") {
      term.clear();
      term.red("Goodbye!");
      callback(false);
    // Send a message to the current group
    } else if(input.charAt(0) != '/') {
      sendMessage(input, function(params) {
        callback(true);
      });
    } else {
      term.red("Unknown command, will now exit!");
      callback(false);
    }
  });
}
// This function will send a message to the group
// defined in the currentChat variable
function sendMessage(message, cb) {
  var url = BASE_URL + '/groups/' + currentChat +'/messages?token=' + user_access_key;
  var guid = generateGUID();
  var formToSend = new Object;
  formToSend.message = {source_guid: guid, text: message };
  hope = JSON.stringify(formToSend);
  console.log(hope);
  request.post({
    url: url,
    form: { "message": { "source_guid": guid.toString(), "text": message.toString()}},
    json: true,
  }, function(er, respn, bdy) {
    if(!er) {
      console.log(respn);
      cb();
    }else {
      console.log("help");
    }
  });
}
// This function will get the most recent messages from 
// a chosen group
function openChat(group_to_open, callback) {
  for(var x in grps){
    if(grps[x].name.toLowerCase().replace(/\W/g, '') == group_to_open.toLowerCase().replace(/\W/g, '')) {
      var theName = grps[x].name;
      var theId = grps[x].id;
      getMessages(grps[x].id, function(result) {
        msgs = JSON.parse(result).response.messages;
        term.clear();
        term.blue("\n" + theName + "\n");
        drawLine();
        writeMessages(msgs);
        callback(theId);
      });
    }
  }
}
// This function lists all the groups you belong to
function showGroups(params) {
  term.clear();
  term.blue("Groups you belong to\n");
  drawLine();

  fs.readFile(os.homedir() + "/.cligm.json", 'utf8', function(err,data){
    if(!err) {
      var temp = JSON.parse(data).groups;
      for(var i in temp){
        term.white(temp[i].name + "\n");
      }
      params();
    } else {
      console.log("Something has gone horribly wrong!");
    }
  });
}
// This function takes a nicks hash and a msgs array and prints the proper number
// of messages on the screen
function writeMessages(msgs) {
  var num = msgs.length - 4;
  while(num--) {
    if(parseInt(msgs[num].user_id) % 5 == 0) {
      term.red(msgs[num].name + ": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 1) {
      term.white(msgs[num].name + ": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 2) {
      term.blue(msgs[num].name + ": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 3) {
      term.magenta(msgs[num].name + ": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 4) {
      term.cyan(msgs[num].name + ": ");
    }
    term.green(msgs[num].text + '\n');
  }
}
// This function is used to draw lines across the terminal
function drawLine() {
  var i = term.width;
  while(i--) {
    term.blue("-");
  }
  term.blue("\n");
}

function getUserGroups(callback) {
  var url = BASE_URL + '/groups?token=' + user_access_key; 
  request({
    url: url,
  }, function(er, respn, bdy) {
    if(!er) {
      callback(JSON.parse(bdy).response);
    }else {
      console.log("help");
    }
  });
}

// This function returns messages from a specified group
function getMessages(groupId, callback) {
  var url = BASE_URL + '/groups/' + groupId + '/messages?token=' + user_access_key;
  request({
    url: url,
  }, function(er, respn, bdy) {
    if(!er) {
      callback(bdy);
    } else {
      console.log("help!");
    }
  });
}

// This function generates message GUIDs, I did not write it,
// Niels Joubert did. You can find his source here:
// https://github.com/njoubert/node-groupme
function generateGUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (a) {
        var b, c;
        return b = Math.random() * 16 | 0, c = a === "x" ? b : b & 3 | 8, c.toString(16);
    });
};