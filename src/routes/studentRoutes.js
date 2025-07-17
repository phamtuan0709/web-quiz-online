const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { Quiz } = require('../models/Quiz');

// Student entry page
router.get('/', (req, res) => {
  res.render('student/entry');
});

// Student registration and redirect to quiz list
router.post('/register', async (req, res) => {
  try {
    const { name, className } = req.body;
    
    if (!name || !className) {
      return res.render('student/entry', { 
        error: 'Vui lòng nhập tên và lớp để tiếp tục' 
      });
    }
    
    // Check if student already exists
    let student = await Student.findOne({ name, className });
    
    // If student doesn't exist, create a new one
    if (!student) {
      student = new Student({
        name,
        className
      });
      await student.save();
    }
    
    // Store student info in session
    req.session.studentId = student._id;
    req.session.studentName = name;
    req.session.studentClass = className;
    
    res.redirect('/student/quizzes');
  } catch (error) {
    console.error(error);
    res.status(500).render('student/entry', { 
      error: 'Đã xảy ra lỗi, vui lòng thử lại'
    });
  }
});

// Middleware to check if student is registered
const isStudentRegistered = (req, res, next) => {
  if (req.session.studentId) {
    return next();
  }
  res.redirect('/student');
};

// Quiz list page
router.get('/quizzes', isStudentRegistered, async (req, res) => {
  try {
    // Get active quizzes
    const quizzes = await Quiz.find({ isActive: true });
    
    // Get student's attempted quizzes
    const student = await Student.findById(req.session.studentId);
    const attemptedQuizIds = student.attempts.map(attempt => 
      attempt.quiz.toString()
    );
    
    res.render('student/quizzes', {
      quizzes,
      attemptedQuizIds,
      studentName: req.session.studentName,
      studentClass: req.session.studentClass
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      error: 'Không thể tải danh sách bài kiểm tra'
    });
  }
});

// Take quiz page
router.get('/quiz/:id', isStudentRegistered, async (req, res) => {
  try {
    // Validate quiz ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(400).render('error', { 
        error: 'ID bài kiểm tra không hợp lệ' 
      });
    }

    const quiz = await Quiz.findOne({ _id: req.params.id, isActive: true });
    
    if (!quiz) {
      return res.status(404).render('error', { 
        error: 'Bài kiểm tra không tồn tại hoặc không khả dụng' 
      });
    }
    
    // Check if student has already attempted this quiz
    const student = await Student.findById(req.session.studentId);
    const hasAttempted = student.attempts.some(
      attempt => attempt.quiz.toString() === req.params.id
    );
    
    if (hasAttempted) {
      return res.redirect(`/student/quiz/${req.params.id}/result`);
    }
    
    res.render('student/takeQuiz', { 
      quiz,
      studentName: req.session.studentName,
      studentClass: req.session.studentClass
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      error: 'Không thể tải bài kiểm tra'
    });
  }
});

// Submit quiz
router.post('/quiz/:id/submit', isStudentRegistered, async (req, res) => {
  try {
    // Validate quiz ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(400).render('error', { 
        error: 'ID bài kiểm tra không hợp lệ' 
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).render('error', { 
        error: 'Bài kiểm tra không tồn tại' 
      });
    }
    
    const student = await Student.findById(req.session.studentId);
    
    // Check if student has already attempted this quiz
    const hasAttempted = student.attempts.some(
      attempt => attempt.quiz.toString() === req.params.id
    );
    
    if (hasAttempted) {
      return res.redirect(`/student/quiz/${req.params.id}/result`);
    }
    
    // Calculate score and track answers
    const answers = [];
    let totalCorrect = 0;
    
    quiz.questions.forEach((question, questionIndex) => {
      const questionType = question.type || 'multiple_choice'; // Mặc định là multiple_choice cho dữ liệu cũ
      let isCorrect = false;
      let answerData = {
        questionIndex: questionIndex,
        questionText: question.text
      };
      
      if (questionType === 'multiple_choice') {
        // Xử lý câu hỏi trắc nghiệm
        const selectedOption = req.body[`question_${questionIndex}`];
        const answerIndex = parseInt(selectedOption);
        isCorrect = answerIndex === question.correctOptionIndex;
        
        answerData = {
          ...answerData,
          answerIndex,
          selectedText: question.options[answerIndex],
          correct: isCorrect
        };
      } 
      else if (questionType === 'short_answer') {
        // Xử lý câu hỏi trả lời ngắn
        const userAnswer = req.body[`question_${questionIndex}`] || '';
        // So sánh không phân biệt hoa thường
        isCorrect = userAnswer.trim().toLowerCase() === question.shortAnswer.trim().toLowerCase();
        
        answerData = {
          ...answerData,
          answerText: userAnswer,
          correctAnswer: question.shortAnswer,
          correct: isCorrect
        };
      } 
      else if (questionType === 'matching') {
        // Xử lý câu hỏi nối
        const matchingAnswer = req.body[`question_${questionIndex}`];
        let matches;
        try {
          matches = JSON.parse(matchingAnswer || '{}');
        } catch (e) {
          matches = {};
        }
        
        // Kiểm tra từng cặp nối
        const totalPairs = question.matchingPairs.length;
        let correctPairs = 0;
        
        Object.entries(matches).forEach(([leftIndex, rightIndex]) => {
          if (leftIndex === rightIndex) {
            correctPairs++;
          }
        });
        
        // Tính điểm theo tỷ lệ đúng
        isCorrect = correctPairs === totalPairs;
        const percentageCorrect = totalPairs > 0 ? correctPairs / totalPairs : 0;
        
        answerData = {
          ...answerData,
          matches,
          correctPairs,
          totalPairs,
          percentageCorrect,
          correct: isCorrect
        };
      }
      
      if (isCorrect) {
        totalCorrect++;
      }
      
      answers.push(answerData);
    });
    
    // Tính điểm và phần trăm
    const totalQuestions = quiz.questions.length;
    const percentageScore = Math.round((totalCorrect / totalQuestions) * 100);
    
    // Lưu kết quả chi tiết
    student.attempts.push({
      quiz: quiz._id,
      score: totalCorrect,
      totalCorrect: totalCorrect,
      totalQuestions: totalQuestions,
      percentageScore: percentageScore,
      answers: answers,
      completedAt: new Date()
    });
    
    await student.save();
    
    res.redirect(`/student/quiz/${req.params.id}/result`);
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      error: 'Không thể gửi bài kiểm tra'
    });
  }
});

// Quiz result page
router.get('/quiz/:id/result', isStudentRegistered, async (req, res) => {
  try {
    // Validate quiz ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(400).render('error', { 
        error: 'ID bài kiểm tra không hợp lệ' 
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).render('error', { 
        error: 'Bài kiểm tra không tồn tại' 
      });
    }
    
    const student = await Student.findById(req.session.studentId);
    
    // Find student's attempt for this quiz
    const attempt = student.attempts.find(
      a => a.quiz.toString() === req.params.id
    );
    
    if (!attempt) {
      return res.redirect(`/student/quiz/${req.params.id}`);
    }
    
    res.render('student/quizResult', {
      quiz,
      attempt,
      studentName: req.session.studentName,
      studentClass: req.session.studentClass
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      error: 'Không thể tải kết quả bài kiểm tra'
    });
  }
});

// Student logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/student');
});

module.exports = router;