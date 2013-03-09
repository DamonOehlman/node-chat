var chat = require('../../'),
    room = chat.room(),
    randomName = require('random-name'),
    uuid = require('uuid'),
    MuxDemux = require('mux-demux'),
    count = 1;

function newClient() {  
    var client = room.join(uuid.v4(), { nick: randomName().replace(/\s/, '') }),
        mdm = MuxDemux();

    count += 1;
    console.log('created new client - total = ' + count);

    // when we get a message from the new client create another
    room.once('message', newClient);

    mdm.pipe(client).pipe(mdm);
    mdm.createWriteStream().write('hello');
}

newClient();