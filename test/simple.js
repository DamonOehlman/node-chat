var assert = require('assert'),
    chat = require('../'),
    connections = [],
    randomName = require('random-name'),
    uuid = require('uuid'),
    room;

describe('simple chat room initialization and client tests', function() {
    it('should be able to create a new chat room', function() {
        room = chat.room();
    });

    it('should be able to connect to the room', function() {
        connections[0] = room.connect({ nick: randomName().replace(/\s/, '') });
    });

    it('should be able to send messages to the room', function(done) {
        var client = chat.client();

        room.once('message', function(msg) {
            assert.equal(msg.data, 'hello');
            done();
        });

        client.pipe(connections[0]).pipe(client);
        client.createWriteStream().write('hello');
    });

    it('should be able to capture messages coming via the connected stream', function(done) {
        var client = chat.client(),
            stream = client.createStream();

        client.pipe(connections[0]).pipe(client);

        stream.once('data', function(msg) {
            assert.equal(msg.data, 'hello');
            assert.equal(msg.id, connections[0].id);

            done();
        });

        stream.write('hello');
    });
});