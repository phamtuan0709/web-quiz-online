const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  className: {
    type: String,
    required: true
  },
  attempts: [{
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    score: {
      type: Number,
      default: 0
    },
    totalCorrect: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    percentageScore: {
      type: Number,
      default: 0
    },
    answers: [{
      questionIndex: {
        type: Number
      },
      questionText: {
        type: String
      },
      answerIndex: {
        type: Number
      },
      selectedText: {
        type: String
      },
      correct: {
        type: Boolean,
        default: false
      }
    }],
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', StudentSchema);