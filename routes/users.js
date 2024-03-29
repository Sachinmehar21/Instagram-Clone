const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/Instagram');

const userSchema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  name:String,
  bio: String,
  profileImage: String,
});

userSchema.plugin(plm);

module.exports = mongoose.model('User', userSchema);