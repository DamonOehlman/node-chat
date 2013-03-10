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

        client.createReadStream().on('data', function(msg) {
            assert.equal(msg.type, 'USERJOIN');
            assert(msg.user, 'No user details found');
            assert.equal(msg.user.nick, nick, 'User details did not match provided');

            done();
        });

        client.identify({ nick: nick });
    });
});