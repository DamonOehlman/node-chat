var Chatroom = require('./room');

exports.room = function(opts) {
    return new Chatroom(opts);
}