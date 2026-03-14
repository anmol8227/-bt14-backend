const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  citizen:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  citizenName:   { type: String, required: true },
  issueId:       { type: String, required: true, trim: true },
  category:      { type: String, required: true, enum: ['roads','water','waste','street','parks','safety'] },
  status:        { type: String, default: 'Resolved', enum: ['Resolved','Partially Resolved','Escalated'] },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  nps:           { type: Number, min: 0, max: 10 },
  satisfied:     { type: Boolean },
  daysToResolve: { type: Number },
  resolution:    { type: String },
  comment:       { type: String, trim: true },
  tags:          { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
