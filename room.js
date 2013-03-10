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
    this.store = {};

    // initialise the messages
    this.messages = this.createSeq('type', 'message');

    // initialise the room members
    this.connections = this.createSet('type', 'connection');

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
            connection = room.connections.rows[parts[1]];

        room.emit('message', {
            data: row.state.data,
            time: new Date(ticks),

            id:   parts[1],
            user: connection && connection.state ? connection.state.user : undefined
        });
    }

    function connectionAdd(row) {
    }

    function connectionChanged(row, changed) {
        if (changed) {
            // if the user is changed, then process authentication 
            if (changed.user) {
                row.set('authenticated', false);

                // if we have authentication listeners, then trigger with the user details
                if (room.listeners('authenticate').length > 0) {
                    room.emit('authenticate', row.state.user, row);
                }
                // otherwise, update the user and supply the authenticated flag
                else {
                    row.set('authenticated', true);                
                }
            }
            else if (changed.authenticated === true) {
                room.emit('message', {
                    type: 'USERJOIN',
                    time: new Date(),

                    id:   row.id,
                    user: row.state.user
                });        
            }
        }
    }

    function connectionRemove(row) {
        room.emit('message', {
            type: 'USERLEAVE',
            time: new Date(),

            id:   row.id
        });
    }

    // wire up event handler
    this.messages.on('add', messageAdd);
    this.connections.on('add', connectionAdd);
    this.connections.on('changes', connectionChanged);
    this.connections.on('remove', connectionRemove);

    // add a close function override
    this.close = function() {
        // remove the event handlers
        this.messages.removeListener('add', messageAdd);
        this.connections.removeListener('add', connectionAdd);
        this.connections.removeListener('changes', connectionChanged);
        this.connections.removeListener('remove', connectionRemove);

        // remove this override
        this.close = undefined;
    }
};

/**
## connect(details)

Connect to the the chat room with the uid and details specified.  This function 
returns a MuxDemux stream that can be used to push messages into the 
room.
*/
Chatroom.prototype.connect = function() {
    var id = uuid.v4(),
        mdm, 
        room = this, 
        connection;

    // add the connection
    connection = this.add({ id: id, type: 'connection' });

    // create the muxdemux instance
    mdm = MuxDemux();
    mdm.on('connection', function(stream) {
        if (stream.readable) {
            stream.on('data', function(data) {
                if (typeof data == 'string' || (data instanceof String) || (data instanceof Buffer)) {
                    room.processMessage(connection, data);
                }
                else if (typeof data == 'object') {
                    switch (data.type) {

                    case 'message':
                        room.processMessage(connection, data.data || data.message || data.text);
                        break;

                    case 'ident':
                        room.processIdent(connection, data);
                        break;
                    }
                }
            });
        }

        if (stream.writable) {
            // if the user is authenticated, then send messages
            room.on('message', function(msg) {
                // only write messages out if the user is authenticated
                if (connection.state.authenticated) {
                    stream.write(msg);
                }
            });
        }
    });

    // add the uid to the muxdemux object
    mdm.id = id;

    return mdm;
};

/**
## processIdent(connection, data)
*/
Chatroom.prototype.processIdent = function(connection, data) {
    // set the user details for the connection
    connection.set('user', data.user);
};

/**
## processMessage(connection, text)
*/
Chatroom.prototype.processMessage = function(connection, text) {
    var id;

    if (! connection.state.authenticated) return;

    this.add({
        id: new Date().getTime() + '|' + connection.id, 
        type: 'message', 
        data: text 
    });
};