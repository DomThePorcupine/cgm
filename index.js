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

// We need notification libs, how else will you 
// know you got a message?!
var notifier = require('node-notifier');

// Define our base url and access keys
var BASE_URL = "https://api.groupme.com/v3";
var user_access_key;
var grps = [];
var currentChatName = "";
var currentChat = "";
var currentMessages = new Object();
var user_id = "";
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
		request({
		 	url: "https://api.groupme.com/v3/users/me?token=" + user_access_key
		}, function(er, rspn, bdy) {
			if(!er) {
				user_id = JSON.parse(bdy).response.id;
			} else {
				term.red("Trouble getting your user_id :( have to exit!");
				process.exit();
			}
		});
		
    writeObj = { access_token: user_access_key, groups: grps };
    
		fs.writeFile(file, JSON.stringify(writeObj), function(err) {
      if(err) {
        term.red("Uh oh something went very wrong");
      }
    });
  }); 
});


// Clear the current buffer to give us a 'clean slate'
term.clear();

// Display a welcome message to the user
term("Welcome to cligm! :D\n");
term.green.underline("This app is going to be so dope!\n");

// Move to the bottom left hand corner
term.moveTo(1, term.height-2);
term.blue("Please enter command below:\n");
loopIt();

// This is a recursive function that is the main
// loop for the entire program
function loopIt() {
  menu(function(result) {
    if(result) {
      // Move to the bottom left hand corner
      term.moveTo(1, term.height-2);
      //term.blue("Please enter command below:\n");
      drawLine(); 
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
			currentChatName = input.replace("/open ", "");
      openChat(function(result){
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
				openChat(function(res){
          notifier.notify({
            "title": "Domdre",
            "message": input
          });
        	callback(true);
				});
      });
		} else if(input.includes("/like ")) {
			likeMessage(currentMessages[input.replace("/like ", "")], function(params) {
				openChat(function(res){
					callback(true);
				});
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
  request({
    url: url,
		method: 'POST',
    json: formToSend
  }, function(er, respn, bdy) {
    if(!er) {
			//fs.appendFile('stuff.log', JSON.parse(respn), function (err) {});
			cb();
    }else {
      term.red("help");
    }
  });
}

// This function will get the most recent messages from 
// a chosen group
function openChat(callback) {
  for(var x in grps){
		currentMessages = new Object();
    if(grps[x].name.toLowerCase().replace(/\W/g, '') == currentChatName.toLowerCase().replace(/\W/g, '')) {
      
			var theName = grps[x].name;
      var theId = grps[x].id;

      getMessages(grps[x].id, function(result) {
        msgs = result.messages;
				for(var h in msgs) {
					currentMessages[h] = msgs[h].id;
				}
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
      term.red("Something has gone horribly wrong!");
    }
  });
}

// This function takes a nicks hash and a msgs array and prints the proper number
// of messages on the screen
function writeMessages(msgs) {
  var num = msgs.length - 4;
  while(num--) {
    if(parseInt(msgs[num].user_id) % 5 == 0) {
      term.red("[" + num + "] " + msgs[num].name + " ");  
			if(msgs[num].favorited_by.includes(user_id)) {
				term.bold.underline.red("(" + msgs[num].favorited_by.length + ")");
			} else {
				term.red("(" + msgs[num].favorited_by.length + ")");
			}
			term.red(": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 1) {
      term.white("[" + num + "] " + msgs[num].name + " ");
			if(msgs[num].favorited_by.includes(user_id)) {
				term.bold.underline.white("(" + msgs[num].favorited_by.length + ")");
			} else {
				term.white("(" + msgs[num].favorited_by.length + ")");
			}
			term.white(": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 2) {
      term.blue("[" + num + "] " + msgs[num].name + " ");
			if(msgs[num].favorited_by.includes(user_id)) {
				term.bold.underline.blue("(" + msgs[num].favorited_by.length + ")");
			} else {
				term.blue("(" + msgs[num].favorited_by.length + ")");
			}
			term.blue(": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 3) {
      term.magenta("[" + num + "] " + msgs[num].name + " ");
			if(msgs[num].favorited_by.includes(user_id)) {
				term.bold.underline.magenta("(" + msgs[num].favorited_by.length + ")");
			} else {
				term.magenta("(" + msgs[num].favorited_by.length + ")");
			}
			term.magenta(": ");
    } else if(parseInt(msgs[num].user_id) % 5 == 4) {
      term.cyan("[" + num + "] " + msgs[num].name + " ");
			if(msgs[num].favorited_by.includes(user_id)) {
				term.bold.underline.cyan("(" + msgs[num].favorited_by.length + ")");
			} else {
				term.cyan("(" + msgs[num].favorited_by.length + ")");
			}
			term.cyan(": ");
    }
    var italic = false;
    var bold = false;
    var msg = msgs[num].text;
    if(msg == null) {
      msg = "";
    }
    for(var v = 0; v < msg.length; v++) {
      if(msg[v] == "_" && msg.indexOf("://") == -1) {
        italic = !italic;
      } else if(msg[v] == "*") {
        bold = !bold;
      }
      
			if((!(/[^a-zA-Z0-9?!.,"'/()#:@; ]/.test(msg[v])) || msg.indexOf("://") > -1)) {
        if(bold) {
          if(italic) {
            term.green.bold.italic(msg[v]);
          } else {
            term.green.bold(msg[v]);
          }
        } else if(italic) {
          term.green.italic(msg[v]);
        } else {
					if(msg[v] != '\n') {
          	term.green(msg[v]);
					}
        }
      }
    }
    term.green("\n");
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
      term.red("help");
    }
  });
}

// This function likes messages
function likeMessage(messageId, callback) {
	var url = BASE_URL + '/messages/' + currentChat + '/' + messageId + '/like' + '?token=' + user_access_key;
	request({
		url: url,
		method: 'POST'
	}, function(er, respn, bdy) {
		if(!er) {
			callback();
		} else {
			term.red("Uh oh");
		}
	});
}

// This function returns messages from a specified group
function getMessages(groupId, callback) {
	var msgsToLoad = term.height - 4;
  var url = BASE_URL + '/groups/' + groupId + '/messages?limit=' + msgsToLoad + '&token=' + user_access_key;
  request({
    url: url,
  }, function(er, respn, bdy) {
    if(!er) {
      callback(JSON.parse(bdy).response);
    } else {
      term.red("help!");
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
