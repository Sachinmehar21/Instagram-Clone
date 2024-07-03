const mongoose = require('mongoose');


const postSchema = mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  share:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
  }],
  date:{
    type:Date,
    default:Date.now
  },
  likes:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
  }],
  caption:String,
  postImg:String,
  comment:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'comment',
  }],
});


module.exports = mongoose.model('post',postSchema);