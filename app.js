// ============================================
// Student Attendance System - Main App JavaScript
// ============================================

const API_BASE = '/api';

// Utility Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => alertDiv.remove(), 3000);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDayName(dayIndex) {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex] || '';
}

function getCurrentDay() {
    return new Date().getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday
}

function isValidAttendanceDay() {
    const day = getCurrentDay();
    return day === 4 || day === 5; // Thursday or Friday
}

function getCurrentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
}

// Play success sound using Web Audio API
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio play failed:', e);
    }
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('adminToken') !== null;
}

// Logout function
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
}

// Redirect if not logged in
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// ============================================
// API Functions
// ============================================

// Login
async function login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('adminToken', data.token);
    }
    return data;
}

// Students API
async function getStudents() {
    const response = await fetch(`${API_BASE}/students`);
    return await response.json();
}

async function addStudent(name, code) {
    const response = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code })
    });
    return await response.json();
}

async function searchStudent(query) {
    const response = await fetch(`${API_BASE}/students/search?q=${encodeURIComponent(query)}`);
    return await response.json();
}

// Attendance API
async function markAttendance(code, part) {
    const response = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, part })
    });
    const data = await response.json();
    if (data.success) {
        playSuccessSound();
    }
    return data;
}

async function getTodayAttendance() {
    const response = await fetch(`${API_BASE}/attendance/today`);
    return await response.json();
}

async function getStudentAttendance(studentId) {
    const response = await fetch(`${API_BASE}/attendance/student/${studentId}`);
    return await response.json();
}

// Dashboard Stats
async function getDashboardStats() {
    const response = await fetch(`${API_BASE}/attendance/stats`);
    return await response.json();
}

// Reports
async function exportToWord(weekFilter = 'all') {
    const response = await fetch(`${API_BASE}/reports/word?week=${weekFilter}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
}

async function getAllAttendance(weekFilter = 'all') {
    const response = await fetch(`${API_BASE}/reports/all?week=${weekFilter}`);
    return await response.json();
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check current page and initialize
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        initLoginPage();
    } else if (path === '/dashboard.html' || path === '/dashboard') {
        if (requireAuth()) initDashboard();
    } else if (path === '/add-student.html' || path === '/add-student') {
        if (requireAuth()) initAddStudent();
    } else if (path === '/attendance.html' || path === '/attendance') {
        if (requireAuth()) initAttendance();
    } else if (path === '/search.html' || path === '/search') {
        if (requireAuth()) initSearch();
    } else if (path === '/reports.html' || path === '/reports') {
        if (requireAuth()) initReports();
    }
});

// Login Page
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const result = await login(username, password);
            if (result.success) {
                window.location.href = '/dashboard';
            } else {
                showAlert(result.message, 'error');
            }
        });
    }
}

// Dashboard Page
function initDashboard() {
    loadDashboardStats();
    setInterval(loadDashboardStats, 30000); // Refresh every 30 seconds
}

async function loadDashboardStats() {
    const stats = await getDashboardStats();
    if (stats.success) {
        document.getElementById('totalStudents').textContent = stats.data.totalStudents;
        document.getElementById('todayPresent').textContent = stats.data.todayPresent;
        document.getElementById('todayAbsent').textContent = stats.data.todayAbsent;
        document.getElementById('mostAbsent').textContent = stats.data.mostAbsent || 'لا يوجد';
    }
}

// Add Student Page
function initAddStudent() {
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('studentName').value;
            const code = document.getElementById('studentCode').value;
            
            const result = await addStudent(name, code);
            if (result.success) {
                showAlert('تم إضافة الطالب بنجاح!', 'success');
                form.reset();
            } else {
                showAlert(result.message, 'error');
            }
        });
    }
}

// Attendance Page
function initAttendance() {
    // Check if it's a valid day
    if (!isValidAttendanceDay()) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-error">
                    <h2>⚠️ لا يمكن تسجيل الحضور اليوم</h2>
                    <p>التسجيل متاح فقط في يوم الخميس أو الجمعة</p>
                    <p>اليوم الحالي: ${getDayName(getCurrentDay())}</p>
                </div>
            `;
        }
        return;
    }
    
    const form = document.getElementById('attendanceForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('studentCode').value;
            const part = document.getElementById('part').value;
            
            const result = await markAttendance(code, part);
            if (result.success) {
                showAlert(`✅ تم تسجيل حضور ${result.data.studentName} بنجاح!`, 'success');
                document.getElementById('studentCode').value = '';
                document.getElementById('studentCode').focus();
            } else {
                showAlert(result.message, 'error');
            }
        });
    }
    
    // Show current day info
    const dayInfo = document.getElementById('currentDay');
    if (dayInfo) {
        dayInfo.textContent = getDayName(getCurrentDay());
    }
}

// Search Page
function initSearch() {
    const form = document.getElementById('searchForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('searchQuery').value;
            
            const result = await searchStudent(query);
            if (result.success) {
                displayStudentResult(result.data);
            } else {
                showAlert(result.message, 'error');
                document.getElementById('studentResult').innerHTML = '';
            }
        });
    }
}

async function displayStudentResult(student) {
    const container = document.getElementById('studentResult');
    const attendance = await getStudentAttendance(student._id);
    
    const presentCount = attendance.data.filter(a => a.status === 'present').length;
    const absentCount = attendance.data.filter(a => a.status === 'absent').length;
    const total = presentCount + absentCount;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    
    container.innerHTML = `
        <div class="student-card">
            <h3>${student.name}</h3>
            <p>الكود: ${student.code}</p>
            <div class="stats">
                <div class="stat">
                    <span class="label">الحضور:</span>
                    <span class="value present">${presentCount}</span>
                </div>
                <div class="stat">
                    <span class="label">الغياب:</span>
                    <span class="value absent">${absentCount}</span>
                </div>
                <div class="stat">
                    <span class="label">النسبة:</span>
                    <span class="value">${percentage}%</span>
                </div>
            </div>
            <h4>سجل الحضور:</h4>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>اليوم</th>
                        <th>الجزء</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${attendance.data.map(a => `
                        <tr class="${a.status}">
                            <td>${formatDate(a.date)}</td>
                            <td>${getDayName(new Date(a.date).getDay())}</td>
                            <td>${a.part}</td>
                            <td>${a.status === 'present' ? '✅ حاضر' : '❌ غائب'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Reports Page
function initReports() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportToWord();
        });
    }
    
    loadAllAttendance();
}

async function loadAllAttendance() {
    const data = await getAllAttendance();
    if (data.success) {
        const container = document.getElementById('attendanceTable');
        if (container) {
            container.innerHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>اسم الطالب</th>
                            <th>الكود</th>
                            <th>التاريخ</th>
                            <th>اليوم</th>
                            <th>الجزء</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(a => `
                            <tr class="${a.status}">
                                <td>${a.studentName}</td>
                                <td>${a.studentCode}</td>
                                <td>${formatDate(a.date)}</td>
                                <td>${getDayName(new Date(a.date).getDay())}</td>
                                <td>${a.part}</td>
                                <td>${a.status === 'present' ? '✅ حاضر' : '❌ غائب'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }
}

