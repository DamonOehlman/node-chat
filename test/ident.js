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
        client = chat.client(room.connect());
    });

    it('should be able to provide user details for the connection', function(done) {
        var nick = randomName().replace(/\s/g, '');

        client.once('data', function(msg) {
            assert.equal(msg.type, 'JOIN');
            assert(msg.user, 'No user details found');
            assert.equal(msg.user.nick, nick, 'User details did not match provided');

            done();
        });

        client.identify({ nick: nick });
    });

    it('should receive a USERJOIN event for another client joining', function(done) {
        var nick = randomName().replace(/\s/g, ''),
            client2 = chat.client(room.connect(), { nick: nick });

        // listen for the user join event 
        client.once('data', function(msg) {
            assert.equal(msg.type, 'USERJOIN');
            assert(msg.user, 'No user details found');
            assert.equal(msg.user.nick, nick, 'User details did not match provided');

            done();
        });
    });

    it('should report existing users within the room on JOINing a room', function(done) {
        var nick = randomName().replace(/\s/g, ''),
            client3 = chat.client(room.connect(), { nick: nick });

        client3.once('data', function(msg) {
            assert.equal(msg.type, 'JOIN');
            assert(msg.meta, 'No room metadata found in the join data');
            assert(msg.meta.users, 'No user list in the metadata');
            assert.equal(msg.meta.users.length, 3, 'Should have three users in the room');

            done();
        });

        client.identify({ nick: nick });
    });
});