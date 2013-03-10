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
            user: user && user.state ? user.state.details : undefined
        });
    }

    function userAdd(row) {
        chat.emit('message', {
            type: 'USERJOIN',
            time: new Date(),

            uid:  row.id,
            user: row.state.details
        });
    }

    function userRemove(row) {
        chat.emit('message', {
            type: 'USERLEAVE',
            time: new Date(),

            uid:  row.id
        });
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
        if (stream.readable) {
            stream.on('data', function(data) {
                var id = new Date().getTime() + '|' + uid;

                room.add({ id: id, type: 'message', data: data });
            });
        }

        if (stream.writable) {
            room.on('message', function(msg) {
                stream.write(msg);
            });
        }
    });

    // add the uid to the muxdemux object
    mdm.uid = uid;

    return mdm;
};