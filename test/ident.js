var assert = require('assert'),
    chat = require('../'),
    connections = [],
    randomName = require('random-name'),
    uuid = require('uuid'),
    client,
    room;

describe('user identification tests', function() {
    it('should be able to create a new chat room', function() {
        room = chat.room();
    });

    it('should be able to connect to the room', function() {
        client = chat.client();

        client.pipe(room.connect()).pipe(client);
    });

    it('should be able to provide user details for the connection', function(done) {
        var nick = randomName().replace(/\s/g, '');

        client.createReadStream().once('data', function(msg) {
            assert.equal(msg.type, 'JOIN');
            assert(msg.user, 'No user details found');
            assert.equal(msg.user.nick, nick, 'User details did not match provided');

            done();
        });

        client.identify({ nick: nick });
    });

    it('should receive a USERJOIN event for another client joining', function(done) {
        var client2 = chat.client(),
            nick = randomName().replace(/\s/g, '');

        // connect
        client2.pipe(room.connect()).pipe(client2);

        // listen for the user join event 
        client.createReadStream().once('data', function(msg) {
            assert.equal(msg.type, 'USERJOIN');
            assert(msg.user, 'No user details found');
            assert.equal(msg.user.nick, nick, 'User details did not match provided');

            done();
        });

        client2.identify({ nick: nick });
    });
});