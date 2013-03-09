var assert = require('assert'),
    chat = require('../'),
    clients = [],
    randomName = require('random-name'),
    MuxDemux = require('mux-demux'),
    uuid = require('uuid'),
    room;

describe('simple chat room initialization and client tests', function() {
    it('should be able to create a new chat room', function() {
        room = chat.room();
    });

    it('should be able to join the room', function() {
        clients[0] = room.join(uuid.v4(), { nick: randomName().replace(/\s/, '') });
    });

    it('should be able to send messages to the room', function(done) {
        var mdm = MuxDemux();

        room.on('message', function(msg) {
            assert.equal(msg.data, 'hello');
            done();
        });

        mdm.pipe(clients[0]).pipe(mdm);
        mdm.createWriteStream().write('hello');
    });
});