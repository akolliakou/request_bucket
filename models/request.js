const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestBinSchema = new Schema({
  headers: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  bin_id: {
    type: Number,
    required: true
  }
})

const Request = mongoose.model('requests', requestBinSchema);

module.exports = Request;