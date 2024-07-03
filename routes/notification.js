const mongoose = require('mongoose');


const notificationSchema = mongoose.Schema({
  post:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'post'
  },
  toUser:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  fromUser:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  seen:{
    type:Boolean,
    default:false
  },
  content:String,
});


module.exports = mongoose.model('notification',notificationSchema);