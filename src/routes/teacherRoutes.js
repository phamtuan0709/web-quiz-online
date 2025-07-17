const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const { Quiz } = require('../models/Quiz');
const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const multer = require('multer');

// Cấu hình multer cho việc upload ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Giới hạn chỉ cho phép upload ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên file ảnh!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

// Helper function to generate class list from 1A to 5K
function generateClassList() {
  const classes = [];
  for (let grade = 1; grade <= 5; grade++) {
    for (let classLetter = 'A'; classLetter <= 'K'; classLetter = String.fromCharCode(classLetter.charCodeAt(0) + 1)) {
      classes.push(`${grade}${classLetter}`);
    }
  }
  return classes;
}

// Middleware to check if teacher is authenticated
const isTeacherAuthenticated = (req, res, next) => {
  if (req.session.teacherId) {
    return next();
  }
  res.redirect('/teacher/login');
};

// Teacher login page
router.get('/login', (req, res) => {
  res.render('teacher/login');
});

// Teacher login process
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const teacher = await Teacher.findOne({ username });
    
    if (!teacher) {
      return res.render('teacher/login', { error: 'Tài khoản không tồn tại' });
    }
    
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.render('teacher/login', { error: 'Mật khẩu không đúng' });
    }
    
    // Set session
    req.session.teacherId = teacher._id;
    req.session.teacherName = teacher.fullName;
    
    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('teacher/login', { error: 'Đã xảy ra lỗi, vui lòng thử lại' });
  }
});

// Teacher registration page (only accessible for first teacher setup)
router.get('/register', async (req, res) => {
  const teacherCount = await Teacher.countDocuments();
  if (teacherCount > 0) {
    return res.redirect('/teacher/login');
  }
  res.render('teacher/register');
});

// Teacher registration process
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName } = req.body;
    
    const teacherCount = await Teacher.countDocuments();
    if (teacherCount > 0) {
      return res.redirect('/teacher/login');
    }
    
    const newTeacher = new Teacher({
      username,
      password,
      fullName
    });
    
    await newTeacher.save();
    
    res.redirect('/teacher/login');
  } catch (error) {
    console.error(error);
    res.status(500).render('teacher/register', { error: 'Đã xảy ra lỗi, vui lòng thử lại' });
  }
});

// Teacher dashboard
router.get('/dashboard', isTeacherAuthenticated, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.session.teacherId });
    res.render('teacher/dashboard', { 
      quizzes,
      teacherName: req.session.teacherName 
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể tải trang tổng quan' });
  }
});

// Create new quiz page
router.get('/quiz/create', isTeacherAuthenticated, (req, res) => {
  res.render('teacher/createQuiz');
});

// Save new quiz
router.post('/quiz/create', isTeacherAuthenticated, async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    const newQuiz = new Quiz({
      title,
      description,
      questions: JSON.parse(questions),
      createdBy: req.session.teacherId
    });
    
    await newQuiz.save();
    
    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể tạo bài kiểm tra' });
  }
});

// Edit quiz page
router.get('/quiz/edit/:id', isTeacherAuthenticated, async (req, res) => {
  try {
    // Validate quiz ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(400).render('error', { error: 'ID bài kiểm tra không hợp lệ' });
    }

    const quiz = await Quiz.findOne({ 
      _id: req.params.id,
      createdBy: req.session.teacherId 
    });
    
    if (!quiz) {
      return res.status(404).render('error', { error: 'Không tìm thấy bài kiểm tra' });
    }
    
    // Debug: Log thông tin quiz
    console.log('Quiz ID:', req.params.id);
    console.log('Quiz title:', quiz.title);
    console.log('Quiz questions count:', quiz.questions.length);
    console.log('Quiz questions:', JSON.stringify(quiz.questions, null, 2));
    
    res.render('teacher/editQuiz', { quiz });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể tải bài kiểm tra' });
  }
});

// Update quiz
router.post('/quiz/edit/:id', isTeacherAuthenticated, async (req, res) => {
  try {
    // Validate quiz ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id.length !== 24) {
      return res.status(400).render('error', { error: 'ID bài kiểm tra không hợp lệ' });
    }

    const { title, description, questions } = req.body;
    
    await Quiz.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.session.teacherId },
      { 
        title,
        description,
        questions: JSON.parse(questions)
      }
    );
    
    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể cập nhật bài kiểm tra' });
  }
});

// Delete quiz
router.post('/quiz/delete/:id', isTeacherAuthenticated, async (req, res) => {
  try {
    await Quiz.findOneAndDelete({ 
      _id: req.params.id,
      createdBy: req.session.teacherId 
    });
    
    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể xóa bài kiểm tra' });
  }
});

// View quiz results with class selection
router.get('/quiz/results/:id', isTeacherAuthenticated, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      _id: req.params.id,
      createdBy: req.session.teacherId 
    });
    
    if (!quiz) {
      return res.status(404).render('error', { error: 'Không tìm thấy bài kiểm tra' });
    }
    
    // Lấy tất cả học sinh đã làm bài kiểm tra này
    const students = await Student.find({
      'attempts.quiz': req.params.id
    });
    
    // Tính toán thống kê tổng thể
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let highestScore = 0;
    let lowestScore = 100;
    
    const results = [];
    const classNames = new Set(); // Lưu danh sách các lớp đã làm bài
    
    students.forEach(student => {
      const attempt = student.attempts.find(a => a.quiz.toString() === req.params.id);
      if (attempt) {
        totalAttempts++;
        totalCorrect += attempt.totalCorrect || 0;
        totalQuestions += attempt.totalQuestions || 0;
        
        const score = attempt.percentageScore || 0;
        highestScore = Math.max(highestScore, score);
        lowestScore = Math.min(lowestScore, score);
        
        classNames.add(student.className);
        
        results.push({
          studentId: student._id,
          studentName: student.name,
          className: student.className,
          score: attempt.totalCorrect || 0,
          totalQuestions: attempt.totalQuestions || quiz.questions.length,
          percentageScore: attempt.percentageScore || 0,
          completedAt: attempt.completedAt
        });
      }
    });
    
    // Tính điểm trung bình
    const averageScore = totalAttempts > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Sắp xếp kết quả theo lớp và theo điểm
    results.sort((a, b) => {
      if (a.className === b.className) {
        return b.percentageScore - a.percentageScore; // Điểm cao đến thấp
      }
      return a.className.localeCompare(b.className); // Sắp theo tên lớp
    });
    
    // Tạo danh sách tất cả các lớp từ 1A đến 5K
    const allClasses = generateClassList();
    
    res.render('teacher/quizResults', { 
      quiz, 
      results, 
      classNames: Array.from(classNames),
      allClasses: allClasses,
      stats: {
        totalAttempts,
        averageScore,
        highestScore,
        lowestScore
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể tải kết quả bài kiểm tra' });
  }
});

// Xuất kết quả bài kiểm tra sang CSV (cho tất cả học sinh)
router.get('/quiz/results/:id/export', isTeacherAuthenticated, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      _id: req.params.id,
      createdBy: req.session.teacherId 
    });
    
    if (!quiz) {
      return res.status(404).render('error', { error: 'Không tìm thấy bài kiểm tra' });
    }
    
    const students = await Student.find({
      'attempts.quiz': req.params.id
    });
    
    // Tạo thư mục exports nếu chưa tồn tại
    const exportDir = path.join(__dirname, '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Tên file CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ket-qua-${quiz.title.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.csv`;
    const filepath = path.join(exportDir, filename);
    
    // Tạo CSV Writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'stt', title: 'STT' },
        { id: 'name', title: 'Họ và Tên' },
        { id: 'class', title: 'Lớp' },
        { id: 'score', title: 'Điểm Số' },
        { id: 'percentage', title: 'Phần Trăm' },
        { id: 'correct', title: 'Số Câu Đúng' },
        { id: 'wrong', title: 'Số Câu Sai' },
        { id: 'date', title: 'Thời Gian Làm Bài' }
      ],
      encoding: 'utf8'
    });
    
    // Tạo dữ liệu CSV
    const records = [];
    students.forEach((student, index) => {
      const attempt = student.attempts.find(a => a.quiz.toString() === req.params.id);
      if (attempt) {
        const totalCorrect = attempt.totalCorrect || 0;
        const totalQuestions = attempt.totalQuestions || quiz.questions.length;
        const wrong = totalQuestions - totalCorrect;
        const percentageScore = attempt.percentageScore || Math.round((totalCorrect / totalQuestions) * 100);
        
        records.push({
          stt: index + 1,
          name: student.name,
          class: student.className,
          score: `${totalCorrect}/${totalQuestions}`,
          percentage: `${percentageScore}%`,
          correct: totalCorrect,
          wrong: wrong,
          date: new Date(attempt.completedAt).toLocaleString('vi-VN')
        });
      }
    });
    
    // Ghi file CSV
    await csvWriter.writeRecords(records);
    
    // Trả về file cho người dùng tải xuống
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      
      // Xóa file sau khi tải xuống
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể xuất kết quả bài kiểm tra' });
  }
});

// Xuất kết quả theo lớp
router.get('/quiz/results/:id/export/:className', isTeacherAuthenticated, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      _id: req.params.id,
      createdBy: req.session.teacherId 
    });
    
    if (!quiz) {
      return res.status(404).render('error', { error: 'Không tìm thấy bài kiểm tra' });
    }
    
    const className = req.params.className;
    
    const students = await Student.find({
      'attempts.quiz': req.params.id,
      'className': className
    });
    
    // Tạo thư mục exports nếu chưa tồn tại
    const exportDir = path.join(__dirname, '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Tên file CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ket-qua-${className}-${quiz.title.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.csv`;
    const filepath = path.join(exportDir, filename);
    
    // Tạo CSV Writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'stt', title: 'STT' },
        { id: 'name', title: 'Họ và Tên' },
        { id: 'score', title: 'Điểm Số' },
        { id: 'percentage', title: 'Phần Trăm' },
        { id: 'correct', title: 'Số Câu Đúng' },
        { id: 'wrong', title: 'Số Câu Sai' },
        { id: 'date', title: 'Thời Gian Làm Bài' }
      ],
      encoding: 'utf8'
    });
    
    // Tạo dữ liệu CSV
    const records = [];
    students.forEach((student, index) => {
      const attempt = student.attempts.find(a => a.quiz.toString() === req.params.id);
      if (attempt) {
        const totalCorrect = attempt.totalCorrect || 0;
        const totalQuestions = attempt.totalQuestions || quiz.questions.length;
        const wrong = totalQuestions - totalCorrect;
        const percentageScore = attempt.percentageScore || Math.round((totalCorrect / totalQuestions) * 100);
        
        records.push({
          stt: index + 1,
          name: student.name,
          score: `${totalCorrect}/${totalQuestions}`,
          percentage: `${percentageScore}%`,
          correct: totalCorrect,
          wrong: wrong,
          date: new Date(attempt.completedAt).toLocaleString('vi-VN')
        });
      }
    });
    
    // Ghi file CSV
    await csvWriter.writeRecords(records);
    
    // Trả về file cho người dùng tải xuống
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      
      // Xóa file sau khi tải xuống
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { error: 'Không thể xuất kết quả bài kiểm tra' });
  }
});

// API upload ảnh cho câu hỏi
router.post('/upload-image', isTeacherAuthenticated, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file nào được tải lên' });
    }
    
    // Trả về đường dẫn của ảnh đã upload
    const imagePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, imagePath });
  } catch (error) {
    console.error('Lỗi khi upload ảnh:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi tải ảnh lên' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/teacher/login');
});

module.exports = router;