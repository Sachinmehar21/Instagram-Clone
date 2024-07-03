const mongoose = require('mongoose');


const messageSchema = mongoose.Schema({
  sender:String,
  seen:{
    type:Boolean,
    default:false
  },
  reciever:String,
  message:String,
  post:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'post'
  }
});


module.exports = mongoose.model('message',messageSchema);