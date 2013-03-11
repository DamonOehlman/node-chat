var MuxDemux = require('mux-demux'),
    Stream = require('stream');

module.exports = function(roomStream, user) {
    var client = MuxDemux(),
        stream = client.createStream();

    function waitForJoin(data) {
        if (data && data.type === 'JOIN') {
            stream.removeListener('data', waitForJoin);
            stream.emit('ready');
        }
    }

    // if the stream is not a stream, then remap args
    if (! (roomStream instanceof Stream)) {
        throw new Error('If arguments are provided, the first argument must be a stream');
    }

    // if we have a target stream, then pipe from the new client into the stream and back
    if (roomStream) {
        client.pipe(roomStream).pipe(client);
    }

    // patch in an identify method into the stream
    stream.identify = function(details) {
        stream.write({
            type: 'ident',
            user: details
        });
    };

    // connect the wait for join message handler
    stream.on('data', waitForJoin);

    // if we have been provided an identity, then send the ident message on the stream
    if (user) stream.identify(user);

    // return the stream
    return stream;
};