var Doc = require('crdt/doc'),
    util = require('util'),
    MuxDemux = require('mux-demux');

function Chatroom(opts) {
    if(!(this instanceof Chatroom)) return new Chatroom(opts);

    Doc.call(this, opts);

    // ensure we have opts
    opts = opts || {};

    // init
    this.uid = '';
    this.store = {};

    // initialise the messages
    this.messages = this.createSeq('type', 'message');

    // initialise the room members
    this.users = this.createSet('type', 'user');

    // open the chat instance
    this.open();
}

util.inherits(Chatroom, Doc);
module.exports = Chatroom;

/**
## open()
*/
Chatroom.prototype.open = function() {

    var chat = this;

    function messageAdd(row) {
        // split the row id to get the user and time details
        var parts = row.id.split('|'),
            ticks = parseInt(parts[0]),
            user = chat.users.rows[parts[1]];

        chat.emit('message', {
            data: row.state.data,
            time: new Date(ticks),

            uid:  parts[1],
            user: user && user.state ? user.state.details : undefined,

            mine: parts[1] === chat.uid
        });
    }

    function userAdd(row) {
        chat.emit('join', row.id, row.state.details);
    }

    function userRemove(row) {
        chat.emit('leave', row.id, row.state.details);
    }

    // wire up event handler
    this.messages.on('add', messageAdd);
    this.users.on('add', userAdd);
    this.users.on('remove', userRemove);

    // add a close function override
    this.close = function() {
        // call the inherited behaviour
        Chat.prototype.close.call(this);

        // remove the event handlers
        this.messages.removeListener('add', messageAdd);
        this.users.removeListener('add', userAdd);
        this.users.removeListener('remove', userRemove);

        // remove this override
        this.close = undefined;
    }
};

/**
## close()

Close the chat instance
*/
Chatroom.prototype.close = function() {
    // TODO: handle room closes
    if (! this.uid) return;

    // remove the user from the set
    this.users.remove(this.uid);
};

/**
## identify(id, details)

Identify ourselves to the chat room.
*/
Chatroom.prototype.identify = function(uid, details) {
    // save the uid
    this.uid = uid;

    // add ourselves to the room
    this.add({ id: uid, type: 'user', details: details });
};

/**
## join(uid, details)

Join the chat room with the uid and details specified.  This function 
returns a MuxDemux stream that can be used to push messages into the 
room.
*/
Chatroom.prototype.join = function(uid, details) {
    var mdm, room = this;

    if (! uid) throw new Error('A uid is required to join the room');

    // add the user
    this.add({ id: uid, type: 'user', details: details });

    // create the muxdemux instance
    mdm = MuxDemux();
    mdm.on('connection', function(stream) {
        stream.on('data', function(data) {
            var id = new Date().getTime() + '|' + uid;

            room.add({ id: id, type: 'message', data: data });
        });
    });

    return mdm;
};

/**
## send(text)
*/
Chatroom.prototype.send = function(data) {
    var id = new Date().getTime() + '|' + (this.uid || '');

    // if the user id has not been defined, raise an error
    if (! this.uid) throw new Error('Identity unknown - cannot send message');

    // add the message
    this.add({ id: id, type: 'message', data: data });
}