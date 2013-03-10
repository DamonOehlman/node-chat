var Doc = require('crdt/doc'),
    util = require('util'),
    uuid = require('uuid'),
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

    var room = this;

    function messageAdd(row) {
        // split the row id to get the user and time details
        var parts = row.id.split('|'),
            ticks = parseInt(parts[0]),
            user = room.users.rows[parts[1]];

        room.emit('message', {
            data: row.state.data,
            time: new Date(ticks),

            uid:  parts[1],
            user: user && user.state ? user.state.details : undefined
        });
    }

    function userAdd(row) {
        process.nextTick(function() {
            // if we have authentication listeners, then trigger with the user details
            if (room.listeners('authenticate').length > 0) {
                room.emit('authenticate', row.state.details, row);
            }
            // otherwise, update the user and supply the authenticated flag
            else {
                row.set('authenticated', true);                
            }
        });
    }

    function userChanged(row, changed) {
        if (changed && changed.authenticated) {
            room.emit('message', {
                type: 'USERJOIN',
                time: new Date(),

                uid:  row.id,
                user: row.state.details
            });        
        }
    }

    function userRemove(row) {
        room.emit('message', {
            type: 'USERLEAVE',
            time: new Date(),

            uid:  row.id
        });
    }

    // wire up event handler
    this.messages.on('add', messageAdd);
    this.users.on('add', userAdd);
    this.users.on('changes', userChanged);
    this.users.on('remove', userRemove);

    // add a close function override
    this.close = function() {
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
Chatroom.prototype.join = function(details) {
    var mdm, room = this,
        uid = details.id || details.uid || uuid.v4(),
        user;

    // ensure the uid is saved in the details
    details.uid = uid;

    // add the user
    this.add({ id: uid, type: 'user', details: details });

    // create the muxdemux instance
    mdm = MuxDemux();
    mdm.on('connection', function(stream) {
        if (stream.readable) {
            stream.on('data', function(data) {
                user = user || room.users.rows[uid];

                // only add messages from authenticated users
                if (user && user.state.authenticated) {
                    var id = new Date().getTime() + '|' + uid;

                    room.add({ id: id, type: 'message', data: data });
                }
            });
        }

        if (stream.writable) {
            // if the user is authenticated, then send messages
            room.on('message', function(msg) {
                user = user || room.users.rows[uid];

                // only write messages out if the user is authenticated
                if (user && user.state.authenticated) {
                    stream.write(msg);
                }
            });
        }
    });

    // add the uid to the muxdemux object
    mdm.uid = uid;

    return mdm;
};