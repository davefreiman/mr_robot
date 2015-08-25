var async        = require('async');

// Error handler
var whoops = function (err) {
    if (err) {
        console.log('Whoops Something went wrong: ' + err)
    }
};

var waiting = true;

exports.run = function(services) {

//  eventEmitter.emit('slack', data.channel, output);
  var data = services['data']
  var command = services['command']
  var queue = services['queue']
  var eventEmitter = services['pubsub']

  var message = "Alright, checking in with the team. I'll report back ASAP";
  var users = command[1].split(' ');
  var results = [];

  // Filter empty users
  users = users.filter(Boolean);

  // Let the stakeholder know you are on it
  eventEmitter.emit('slack', data.channel, message);

  // Ask each user in parallel
  async.each(users, function (user, callback) {
      user = user.replace('<@', '').replace('>', '');

      queue[user]   = [];
      results[user] = [];

      // Define the askQuestion function
      function askQuestion(callback, question) {
          var count = 0;
          queue[user]['waiting'] = true;
          eventEmitter.emit('slackPM', user, question);
          async.whilst(
              function () {
                  if (count >= 5) queue[user]['waiting'] = false
                  if (queue[user]['waiting']) return true
                  response = queue[user]['response'] || "Didn't answer in time"
                  results[user].push(response)
                  callback();
              },
              function (callback) {
                  count++;
                  setTimeout(callback, 2000);
              },
              whoops
          );
      }

      // As the users the necessary questions
      async.waterfall([
          function (callback) {
              var question = "*What are you working on right now?*";
              askQuestion(callback, question)
          },
          function (callback) {
              var question = "*When do you think you will be done with the task?*";
              askQuestion(callback, question)
          },
          function (callback) {
              var question = "*Any blockers?*";
              askQuestion(callback, question)
          }
      ], function (err, result) {
          // result now equals 'done'
      });
  }, whoops);

  // Wait to get all the answers and then report back.
  async.whilst(
      function () {
          if (Object.keys(results).length < users.length) return true
          for (var responses in results) {
              if (results.hasOwnProperty(responses)) {
                  if (results[responses].length < 3) return true
              }
          }

          function sendResponse(message, index, results) {
              for (var responses in results) {
                  message = message + "> " + "<@" + responses + ">: " + results[responses][index] + "\r\n"
              }
              eventEmitter.emit('slack', data.channel, message);
              // slack.sendMsg(data.channel, message)
          }

          eventEmitter.emit('slack', data.channel, "Ok, I'm done talking with everyone");

          message = "> *What are you working on right now?* \r\n"
          sendResponse(message, 0, results)
          message = "> *When do you think you will be done with the task?* \r\n"
          sendResponse(message, 1, results)
          message = "> *Blockers* \r\n"
          sendResponse(message, 2, results)
      },
      function (callback) {
          setTimeout(callback, 1000);
      },
      whoops
  );
};
