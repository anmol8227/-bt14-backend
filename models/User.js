const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Fixed Security Questions ──────────────────────────────────────────────────
const SECURITY_QUESTIONS = [
  "Aapki maa ka pehla naam kya hai?",       // Mother's maiden name
  "Aapke pehle pet ka naam kya tha?",        // First pet's name
  "Aap kis sheher mein paida hue the?",      // City of birth
];

const securityAnswerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 2,
  },
  answerHash: {
    type: String,
    required: true,
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['citizen', 'admin'],
    default: 'citizen',
  },
  securityAnswers: {
    type: [securityAnswerSchema],
    select: false, // never returned in normal queries
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare a security answer (case-insensitive, trimmed)
userSchema.methods.compareSecurityAnswer = async function (index, candidateAnswer) {
  const stored = this.securityAnswers.find(a => a.questionIndex === index);
  if (!stored) return false;
  return await bcrypt.compare(candidateAnswer.toLowerCase().trim(), stored.answerHash);
};

// Static: get fixed questions list
userSchema.statics.getSecurityQuestions = function () {
  return SECURITY_QUESTIONS;
};

module.exports = mongoose.model('User', userSchema);
module.exports.SECURITY_QUESTIONS = SECURITY_QUESTIONS;
