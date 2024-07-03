const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/proinsta");

const userSchema = mongoose.Schema({
  username:String,
  name:String,
  password:String,
  bio:{
    type:String,
    default:"There is no bio updated by the user",
  },
  profileImg:{
    type:String,
    default:"user.jpg",
  },
  followers:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user"
  }],
  following:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user"
  }],
  savePost:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"post"
  }],
  postId:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"post"
  }],
  stories:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"story"
    }],
  notifications:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"notification"
    }],
    socketId:String,
    messagedUser:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"user"
    }]
});

userSchema.plugin(plm);

module.exports = mongoose.model('user',userSchema);