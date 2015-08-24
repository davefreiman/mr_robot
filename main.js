/**
* Mr. Robot a Slackbot Framework v0.1.0
* Author: Allan MacGregor <info@allanmacgregor.com>
* License: MIT License 2015
**/


// Requiring our module
var slackAPI    = require('slackbotapi');
var config      = require('./config');
var async       = require('async');
var cCase       = require('change-case');
var commands    = require('auto-loader').load(__dirname +'/commands')

// Configure SlackClient
var slack = new slackAPI({
    'token': config.slack.token,
    'logging': config.slack.debug
});

// Configuration for global variables
var botName = config.slack.bot_name + ':';
var queue = [];


// Slack on EVENT message, send data.
slack.on('message', function (data) {
    // If no text, return.
    if (typeof data.text == 'undefined') return;

    if (typeof queue[data.user] !== 'undefined') {
        // Only if is a direct message
        if (data.channel.charAt(0) === 'D') {
            queue[data.user]['waiting'] = false
            queue[data.user]['response'] = data.text
        }
    }

    // Start Handling commands
    if (data.text.indexOf(botName) === 0) {
      var command = data.text.replace(botName, '').substring(1).split(' ')
      // If command[2] is not undefined use command[1] to have all arguments in command[1]
      if (typeof command[2] != "undefined") {
          for (var i = 2; i < command.length; i++) {
              command[1] = command[1] + ' ' + command[i];
          }
      }

      var action = command[0];
      action = cCase.pascalCase(action)

      // If plugin exists run the command and return the output
      if(commands.hasOwnProperty(action)){
        var output = commands[action].run(command,slack,async,data,queue);
        slack.sendMsg(data.channel, output)
      } else {
        slack.sendMsg(data.channel, "Sorry I don't know how to " + command[0].toLowerCase())
      }

    }
});
