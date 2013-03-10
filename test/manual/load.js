var assert = require('assert'),
    chat = require('../../'),
    room = chat.room(),
    randomName = require('random-name'),
    uuid = require('uuid'),
    MuxDemux = require('mux-demux'),
    count = 1;

function newConnection() {  
    var connection = room.connect(),
        client = chat.client();

    count += 1;
    console.log('created new client - total = ' + count);

    // when we get a message from the new client create another
    room.on('message', function handleMessage(msg) {
        assert.equal(msg.id, connection.id);

        if (msg.data && msg.data === 'hello') {
            room.removeListener('message', handleMessage);
            newConnection();
        }
    });

    client.pipe(connection).pipe(client);

    client.identify({ nick: randomName().replace(/\s/g, '') });
    client.createWriteStream().write('hello');
}

newConnection();