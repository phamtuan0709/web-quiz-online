const express = require('express');
const router = express.Router();
const { Quiz } = require('../models/Quiz');
const Student = require('../models/Student');

// List active quizzes (public)
router.get('/active', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isActive: true })
      .select('title description')
      .lean();
    
    res.json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get quiz details (requires authentication check in client side)
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle quiz active status (teacher only)
router.post('/:id/toggle-status', async (req, res) => {
  try {
    // Check if user is a teacher (session check)
    if (!req.session.teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      createdBy: req.session.teacherId
    });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    }
    
    // Toggle status
    quiz.isActive = !quiz.isActive;
    await quiz.save();
    
    res.json({ success: true, isActive: quiz.isActive });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get quiz statistics (teacher only)
router.get('/:id/stats', async (req, res) => {
  try {
    // Check if user is a teacher (session check)
    if (!req.session.teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      createdBy: req.session.teacherId
    });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
    }
    
    // Get students who attempted this quiz
    const students = await Student.find({
      'attempts.quiz': req.params.id
    }).select('name className attempts');
    
    // Calculate statistics
    const totalAttempts = students.length;
    
    let totalScore = 0;
    let scores = [];
    
    students.forEach(student => {
      const attempt = student.attempts.find(
        a => a.quiz.toString() === req.params.id
      );
      
      if (attempt) {
        totalScore += attempt.score;
        scores.push(attempt.score);
      }
    });
    
    const averageScore = totalScore / totalAttempts || 0;
    
    // Calculate question performance
    const questionStats = [];
    
    if (quiz.questions && quiz.questions.length > 0) {
      quiz.questions.forEach((question, qIndex) => {
        let correct = 0;
        let total = 0;
        
        students.forEach(student => {
          const attempt = student.attempts.find(
            a => a.quiz.toString() === req.params.id
          );
          
          if (attempt && attempt.answers && attempt.answers[qIndex]) {
            total++;
            if (attempt.answers[qIndex].correct) {
              correct++;
            }
          }
        });
        
        const percentageCorrect = (correct / total) * 100 || 0;
        
        questionStats.push({
          questionText: question.text,
          percentageCorrect,
          correct,
          total
        });
      });
    }
    
    res.json({
      totalAttempts,
      averageScore,
      questionStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;