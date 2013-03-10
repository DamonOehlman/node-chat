var assert = require('assert'),
    chat = require('../../'),
    room = chat.room(),
    randomName = require('random-name'),
    uuid = require('uuid'),
    MuxDemux = require('mux-demux'),
    count = 1;

function newClient() {  
    var uid = uuid.v4(),
        client = room.join({ uid: uid, nick: randomName().replace(/\s/, '') }),
        mdm = MuxDemux();

    count += 1;
    console.log('created new client - total = ' + count);

    // when we get a message from the new client create another
    room.on('message', function handleMessage(msg) {
        assert.equal(msg.uid, uid);

        if (msg.data && msg.data === 'hello') {
            room.removeListener('message', handleMessage);
            newClient();
        }
    });

    mdm.pipe(client).pipe(mdm);
    mdm.createWriteStream().write('hello');
}

newClient();