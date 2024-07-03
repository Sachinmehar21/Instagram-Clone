const mongoose = require('mongoose');


const storySchema = mongoose.Schema({
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  },
  date:{
    type:Date,
    default:Date.now
  },
  storyImg:String,
});


module.exports = mongoose.model('story',storySchema);