var Doc = require('crdt/doc'),
    util = require('util');

function Chat(opts) {
    if(!(this instanceof Chat)) return new Chat(opts);

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

util.inherits(Chat, Doc);
module.exports = Chat;

/**
## open()
*/
Chat.prototype.open = function() {

    var chat = this;

    function messageAdd(row) {
        // split the row id to get the user and time details
        var parts = row.id.split('|'),
            ticks = parseInt(parts[0]),
            user = chat.users.rows[parts[1]];

        if (user && user.state) {
            chat.emit('message', row.state.data, user.state.details, ticks);
        }
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
Chat.prototype.close = function() {
    // TODO: handle room closes
    if (! this.uid) return;

    // remove the user from the set
    this.users.remove(this.uid);
};

/**
## identify(id, details)

Identify ourselves to the chat room.
*/
Chat.prototype.identify = function(uid, details) {
    // save the uid
    this.uid = uid;

    // add ourselves to the room
    this.add({ id: uid, type: 'user', details: details });
};

/**
## send(text)
*/
Chat.prototype.send = function(data) {
    var id = new Date().getTime() + '|' + (this.uid || '');

    // if the user id has not been defined, raise an error
    if (! this.uid) throw new Error('Identity unknown - cannot send message');

    // add the message
    this.add({ id: id, type: 'message', data: data });
}