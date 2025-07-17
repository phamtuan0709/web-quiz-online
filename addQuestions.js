const mongoose = require('mongoose');
const { Quiz } = require('./src/models/Quiz');

async function addMoreQuestions() {
  try {
    // Kết nối MongoDB
    await mongoose.connect('mongodb://localhost:27017/webquiz', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Đã kết nối MongoDB thành công');
    
    // Tìm bài kiểm tra cần thêm câu hỏi
    const quiz = await Quiz.findById('6878af782e871d4820d0b2b6');
    if (!quiz) {
      console.log('Không tìm thấy bài kiểm tra');
      return;
    }
    
    console.log('Tìm thấy bài kiểm tra:', quiz.title);
    console.log('Số câu hỏi hiện tại:', quiz.questions.length);
    
    // Thêm câu hỏi trắc nghiệm
    const multipleChoiceQuestion = {
      type: 'multiple_choice',
      text: 'Phần mềm nào được sử dụng để tạo và chỉnh sửa văn bản?',
      image: null,
      options: ['Microsoft Word', 'Photoshop', 'Excel', 'PowerPoint'],
      correctOptionIndex: 0,
      shortAnswer: '',
      matchingPairs: []
    };
    
    // Thêm câu hỏi nối cặp
    const matchingQuestion = {
      type: 'matching',
      text: 'Nối các phím tắt với chức năng tương ứng',
      image: null,
      options: [],
      correctOptionIndex: 0,
      shortAnswer: '',
      matchingPairs: [
        {
          left: 'Ctrl + C',
          right: 'Sao chép',
          leftType: 'text',
          rightType: 'text'
        },
        {
          left: 'Ctrl + V',
          right: 'Dán',
          leftType: 'text',
          rightType: 'text'
        },
        {
          left: 'Ctrl + Z',
          right: 'Hoàn tác',
          leftType: 'text',
          rightType: 'text'
        }
      ]
    };
    
    // Thêm các câu hỏi vào bài kiểm tra
    quiz.questions.push(multipleChoiceQuestion);
    quiz.questions.push(matchingQuestion);
    
    // Lưu lại
    await quiz.save();
    
    console.log('=== ĐÃ THÊM CÂU HỎI THÀNH CÔNG ===');
    console.log('Tổng số câu hỏi hiện tại:', quiz.questions.length);
    console.log('Danh sách câu hỏi:');
    quiz.questions.forEach((q, index) => {
      console.log(`${index + 1}. [${q.type}] ${q.text}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Lỗi:', error);
    mongoose.connection.close();
  }
}

addMoreQuestions();