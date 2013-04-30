var MuxDemux = require('mux-demux'),
    Stream = require('stream');

var client = module.exports = function(roomStream, user, permissions) {
    var client = MuxDemux(),
        stream = client.createStream();

    function waitForJoin(data) {
        if (data && data.type === 'JOIN') {
            stream.removeListener('data', waitForJoin);

            // patch the cid into the stream
            stream.cid = data.cid;
            stream.emit('ready');
        }
    }

    // if the stream is not a stream, then remap args
    if (! (roomStream instanceof Stream)) {
        throw new Error('If arguments are provided, the first argument must be a stream');
    }

    // if we don't have a room stream just return the client
    // as we are doing things manually
    if (! roomStream) return client;

    // pipe from the new client into the stream and back
    client.pipe(roomStream).pipe(client);

    // patch in an identify method into the stream
    stream.identify = function(details, permissions) {
        stream.write({
            type: 'ident',
            user: details,
            permissions: permissions
        });

        return stream;
    };

    // connect the wait for join message handler
    stream.on('data', waitForJoin);

    // if we have been provided an identity, then send the ident message on the stream
    if (user) stream.identify(user, permissions);

    // return the stream
    return stream;
};