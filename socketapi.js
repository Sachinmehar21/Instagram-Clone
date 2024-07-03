const io = require("socket.io")();
const userModel = require('./routes/users')
const messageModel = require('./routes/message');
const message = require("./routes/message");
const socketapi = {
    io: io
};

// Add your socket.io logic here!
io.on("connection", function (socket) {
    console.log("A user connected");

    socket.on("join-server", async function (user) {
        await userModel.findOneAndUpdate({ username: user }, { socketId: socket.id });
    });
    socket.on('user-sending-msg', async messageObj => {
        const chatUser = await userModel.findByUsername(messageObj.reciever);
        const loggedUser = await userModel.findByUsername(messageObj.sender);
        if (!loggedUser.messagedUser.includes(chatUser._id)) {
            loggedUser.messagedUser.push(chatUser._id);
            await loggedUser.save();
        }
        if (!chatUser.messagedUser.includes(loggedUser._id)) {
            chatUser.messagedUser.push(loggedUser._id);
            await chatUser.save();
        }


        await messageModel.create(messageObj)
        socket.to(chatUser.socketId).emit('user-received-msg', messageObj);
    })


});

module.exports = socketapi;