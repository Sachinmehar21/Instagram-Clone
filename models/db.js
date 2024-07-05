const mongoose = require('mongoose');

exports.connect = async () => {
  try {
      mongoose.connect(process.env.URL)
      console.log("db connection established!");
  } catch (e) {
      console.log({ error: e.message });
  }
}
