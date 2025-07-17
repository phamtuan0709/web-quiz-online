const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'short_answer', 'matching'],
    default: 'multiple_choice'
  },
  text: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  options: [{
    type: String
  }],
  correctOptionIndex: {
    type: Number,
    default: 0
  },
  shortAnswer: {
    type: String,
    default: ''
  },
  matchingPairs: [{
    left: {
      type: String,
      required: function() { return this.type === 'matching'; }
    },
    right: {
      type: String,
      required: function() { return this.type === 'matching'; }
    },
    leftType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text'
    },
    rightType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text'
    }
  }]
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  questions: [QuestionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = {
  Quiz: mongoose.model('Quiz', QuizSchema),
  Question: mongoose.model('Question', QuestionSchema)
};