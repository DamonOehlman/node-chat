var Chatroom = require('./room'),
    MuxDemux = require('mux-demux');

exports.client = function() {
    var client = MuxDemux();

    /**
    ## identify(details)

    The identify method allows the client to identify itself after the a connection
    has already been established with a room.
    */
    client.identify = function(details) {
        client.createWriteStream().write({
            type: 'ident',
            details: details
        });
    };

    return client;
};

exports.room = function(opts) {
    return new Chatroom(opts);
}