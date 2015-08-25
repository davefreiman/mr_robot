var changeCase  = require('change-case');


exports.run = function(services) {
  var data          = services['data']
  var eventEmitter  = services['pubsub']
  
  var say = data.text.split('grahamify ');
  message = changeCase.upperCase(say[1]).replace(/[aeiou]/gi, '');
  eventEmitter.emit('slack', data.channel, message);
};
