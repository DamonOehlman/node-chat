var assert = require('assert'),
    chat = require('../'),
    clients = [],
    randomName = require('random-name'),
    MuxDemux = require('mux-demux'),
    uuid = require('uuid'),
    room;

describe('chat authentication tests', function() {
    it('should be able to create a new chat room', function() {
        room = chat.room();
    });

    it('should be able to connect an authentication event to the room', function() {
        room.on('authenticate', function(details, row) {
        });
    })

    it('should be able to join the room', function() {
        clients[0] = room.join({ nick: randomName().replace(/\s/, '') });
    });

    it('should not be able to send messages as the client is not authenticated', function(done) {
        var mdm = MuxDemux();

        function handleMessage(msg) {
            throw new Error('Received message and should not have as we have not authenticated');
        }

        room.once('message', handleMessage);

        setTimeout(function() {
            room.removeListener('message', handleMessage);
            done();
        }, 100);

        mdm.pipe(clients[0]).pipe(mdm);
        mdm.createWriteStream().write('hello');
    });

    it('should be able to authenticate the user', function(done) {
        var user = room.users.get(clients[0].uid);

        room.once('message', function(msg) {
            assert.equal(msg.type, 'USERJOIN');
            assert.equal(msg.uid, clients[0].uid);

            done();
        });

        // flag as authenticated
        user.set('authenticated', true);
    });

    it('should be able to capture messages coming via the connected stream', function(done) {
        var mdm = MuxDemux(),
            stream = mdm.createStream();

        mdm.pipe(clients[0]).pipe(mdm);

        stream.once('data', function(msg) {
            assert.equal(msg.data, 'hello');
            assert.equal(msg.uid, clients[0].uid);

            done();
        });

        stream.write('hello');
    });
});