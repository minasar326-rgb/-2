const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// Get all students
router.get('/', (req, res) => {
  try {
    const students = db.getStudents();
    res.json({ success: true, data: students.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add new student
router.post('/', (req, res) => {
  try {
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'يرجى إدخال اسم الطالب والكود' 
      });
    }
    
    const students = db.getStudents();
    
    const existingStudent = students.find(s => s.code === code);
    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: 'كود الطالب مسجل بالفعل' 
      });
    }

    const newStudent = {
      _id: Date.now().toString(),
      name,
      code,
      createdAt: new Date().toISOString()
    };
    
    students.push(newStudent);
    db.saveStudents(students);
    
    res.json({ success: true, data: newStudent, message: 'تم إضافة الطالب بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search student by code or name
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const students = db.getStudents();
    const attendance = db.getAttendance();
    
    const student = students.find(s => s.code === query || s.name.includes(query));

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'الطالب غير موجود' 
      });
    }

    const studentRecords = attendance.filter(r => r.studentId === student._id);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
    const totalDays = presentCount + absentCount;
    const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        student,
        stats: { present: presentCount, absent: absentCount, percentage: attendancePercentage },
        records: studentRecords
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get student by code
router.get('/code/:code', (req, res) => {
  try {
    const students = db.getStudents();
    const student = students.find(s => s.code === req.params.code);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete student
router.delete('/:id', (req, res) => {
  try {
    let students = db.getStudents();
    const attendance = db.getAttendance();
    
    students = students.filter(s => s._id !== req.params.id);
    db.saveStudents(students);
    
    // Delete related attendance
    let allAttendance = db.getAttendance();
    allAttendance = allAttendance.filter(a => a.studentId !== req.params.id);
    db.saveAttendance(allAttendance);
    
    res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get total students count
router.get('/count/total', (req, res) => {
  try {
    const students = db.getStudents();
    res.json({ success: true, data: students.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
