// Requiring our module
var slackAPI = require('slackbotapi');
var config = require('./config');
var async = require('async');
var changeCase = require('change-case');

// Configure SlackClient
var slack = new slackAPI({
    'token': config.slack.token,
    'logging': config.slack.debug
});

// Configuration for global variables
var botName = config.slack.bot_name + ':';
var waiting = true;
var queue = [];

// Error handler
var whoops = function (err) {
    if (err) {
        console.log('Whoops Something went wrong: ' + err)
    }
};

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

    // If someone says 'cake!!' respond to their message with "@user OOH, CAKE!! :cake"
    if (data.text === 'cake!!') slack.sendMsg(data.channel, "@" + slack.getUser(data.user).name + " OOH, CAKE!! :cake:")
    if (data.text === 'cake is a lie') slack.sendMsg(data.channel, "@" + slack.getUser(data.user).name + " I LIE CHOOSE TO BELIEVEEEEEE!! :cake:")
    if (data.text === 'magneto') slack.sendMsg(data.channel, "@" + slack.getUser(data.user).name + " Magento not Magneto")
    if (data.text.indexOf('<@USLACKBOT>') === 0) slack.sendMsg(data.channel, "@" + slack.getUser(data.user).name + " Hey! talk to me not him!!!")

    // Start Handling commands
    if (data.text.indexOf(botName) === 0) {
        var command = data.text.replace(botName, '').substring(1).split(' ')
        // If command[2] is not undefined use command[1] to have all arguments in command[1]
        if (typeof command[2] != "undefined") {
            for (var i = 2; i < command.length; i++) {
                command[1] = command[1] + ' ' + command[i];
            }
        }

        // Switch to check which command has been requested.
        switch (command[0].toLowerCase()) {
            case "hello":
                // Send message.
                slack.sendMsg(data.channel, "Oh, hello @" + slack.getUser(data.user).name + " !")
                break;

            case "hue":
                slack.sendMsg(data.channel, "@" + slack.getUser(data.user).name + " brbrbrbrbrb!")
                break;

            case "grahamify":
                var say = data.text.split('grahamify ');
                say[1] = changeCase.upperCase(say[1]).replace(/[aeiou]/gi, '');

                slack.sendMsg(data.channel, say[1]);
                break;

            case "say":
                var say = data.text.split('say ');
                slack.sendMsg(data.channel, say[1]);
                break;

            case "checkin":
                var message = "Alright, checking in with the team. I'll report back ASAP";
                var users = command[1].split(' ');
                var results = [];

                // Filter empty users
                users = users.filter(Boolean);

                // Let the stakeholder know you are on it
                slack.sendMsg(data.channel, message);

                // Ask each user in parallel
                async.each(users, function (user, callback) {
                    user = user.replace('<@', '').replace('>', '');
                    userId = slack.getUser(user).id;
                    queue[user] = [];
                    results[user] = [];

                    // Define the askQuestion function
                    function askQuestion(callback, question) {
                        var count = 0;
                        queue[user]['waiting'] = true;
                        slack.sendPM(user, question)
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
                                setTimeout(callback, 1000);
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

                        function sendResponse(slack, message, index, results) {
                            for (var responses in results) {
                                message = message + "> " + "<@" + responses + ">: " + results[responses][index] + "\r\n"
                            }
                            slack.sendMsg(data.channel, message)
                        }

                        slack.sendMsg(data.channel, "Ok, I'm done talking with everyone")
                        message = "> *What are you working on right now?* \r\n"
                        sendResponse(slack, message, 0, results)
                        message = "> *When do you think you will be done with the task?* \r\n"
                        sendResponse(slack, message, 1, results)
                        message = "> *Blockers* \r\n"
                        sendResponse(slack, message, 2, results)
                    },
                    function (callback) {
                        setTimeout(callback, 1000);
                    },
                    whoops
                );
                break;

            case "debug":
                console.log(slack.data.ims);
                break;
        }
    }
});
