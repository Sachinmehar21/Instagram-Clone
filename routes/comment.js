const mongoose = require('mongoose');


const commentSchema = mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  date:{
    type:Date,
    default:Date.now
  },
  comment:String,
  reply:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"comment"
  }]
});


module.exports = mongoose.model('comment',commentSchema);