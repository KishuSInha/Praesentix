# UpastithiCheck - Smart Attendance Management System

> A modern, AI-powered attendance management system built by REX for educational institutions

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Python Backend](https://img.shields.io/badge/Backend-Python-3776AB?style=flat&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [Team](#team)
- [License](#license)

## 🎯 About

UpastithiCheck is a comprehensive attendance management solution that combines traditional manual entry with cutting-edge AI-powered face recognition technology. Built from the ground up to solve real-world attendance tracking challenges in educational institutions, it offers a seamless experience for students, teachers, and administrators.

### Why UpastithiCheck?

Traditional attendance systems are time-consuming and prone to errors. We built UpastithiCheck to:
- **Save Time**: Automated face recognition reduces attendance marking time by 80%
- **Increase Accuracy**: AI-powered anti-spoofing ensures genuine attendance
- **Provide Insights**: Real-time analytics help identify attendance patterns
- **Enable Accessibility**: Works offline and syncs when connection is restored
- **Ensure Security**: Role-based access control protects sensitive data

## ✨ Features

### 🎓 For Students
- **Personal Dashboard**: View attendance percentage, present/absent days, and class rank
- **Real-time Updates**: See attendance status immediately after marking
- **Progress Tracking**: Monitor attendance trends with visual charts
- **Download Reports**: Export attendance records as CSV files
- **Notifications**: Get alerts for low attendance or important updates

### 👨‍🏫 For Teachers
- **Quick Attendance**: Mark attendance manually or via face recognition
- **Period Management**: Track attendance for individual class periods
- **Student Search**: Find students quickly with advanced search filters
- **Bulk Operations**: Mark multiple students present/absent at once
- **Analytics**: View class-wise attendance statistics and trends

### 🔐 For Administrators
- **User Management**: Add, edit, or remove students and teachers
- **Face Enrollment**: Register student faces for AI recognition
- **System Health**: Monitor database status and system performance
- **Reports Generation**: Create comprehensive attendance reports
- **Settings Control**: Configure system-wide preferences

### 🤖 AI-Powered Features
- **Face Recognition**: Automatic attendance marking using facial recognition
- **Anti-Spoofing**: Detects and prevents photo/video spoofing attempts
- **Emotion Detection**: Captures student emotions during attendance
- **Confidence Scoring**: Ensures high accuracy in face matching
- **5-Image Enrollment**: Multiple angles for better recognition accuracy

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Lucide Icons** - Beautiful icon library

### Backend
- **Python 3.x** - Core backend language
- **Flask** - Lightweight web framework
- **SQLite** - Embedded database
- **OpenCV** - Computer vision library
- **dlib** - Face recognition library
- **Flask-CORS** - Cross-origin resource sharing

### Database
- **SQLite** - Four specialized databases:
  - `enhanced_attendance.db` - Main attendance records
  - `face_encodings.db` - Face recognition data
  - `period_attendance.db` - Period-wise tracking
  - `attendance_demo.db` - Demo/testing data

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/upasthiticheck.git
cd upasthiticheck
```

#### 2. Setup Frontend
```bash
cd Frontend
npm install
```

#### 3. Setup Backend
```bash
cd ../Backend
pip install -r requirements.txt
```

### Running the Application

#### Start Backend Server
```bash
# From Backend directory
python enhanced_attendance_api.py
# Server runs on http://localhost:5002
```

Or use the startup script:
```bash
chmod +x start_enhanced_api.sh
./start_enhanced_api.sh
```

#### Start Frontend Development Server
```bash
# From Frontend directory
npm run dev
# App runs on http://localhost:5173
```

#### Access the Application
Open your browser and navigate to:
```
http://localhost:5173
```

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Student | student123 | pass123 |
| Teacher | teacher123 | pass123 |
| Admin | admin123 | pass123 |

## 📁 Project Structure

```
Final Model/
├── Frontend/                    # React frontend application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/            # Images, logos, fonts
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/        # Admin-specific components
│   │   │   ├── Logo.tsx      # Brand logo component
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── ...
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   │   ├── dashboards/  # Role-based dashboards
│   │   │   ├── Landing.tsx  # Landing page
│   │   │   └── Login.tsx    # Login page
│   │   ├── utils/           # Utility functions
│   │   │   ├── enhancedApi.ts  # API client
│   │   │   └── mockData.ts     # Mock data
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── Backend/                    # Python Flask backend
│   ├── enhanced_attendance_api.py  # Main API server
│   ├── period_attendance.py        # Period tracking API
│   ├── encodedb.py                 # Face encoding utilities
│   ├── requirements.txt            # Python dependencies
│   └── start_enhanced_api.sh       # Startup script
│
├── Database/                   # SQLite databases
│   ├── enhanced_attendance.db     # Main attendance data
│   ├── face_encodings.db          # Face recognition data
│   ├── period_attendance.db       # Period-wise data
│   └── attendance_demo.db         # Demo data
│
├── Logos/                      # Brand assets
│   ├── REX Logo Black on White.png
│   ├── Founder.jpeg
│   ├── Cofounder.webp
│   └── Subham.jpeg
│
├── package.json               # Root package config
├── requirements.txt           # Root Python dependencies
└── README.md                  # This file
```

## 📚 Usage Guide

### For Students

1. **Login**: Use your student credentials
2. **View Dashboard**: See your attendance percentage and statistics
3. **Check Calendar**: View day-by-day attendance records
4. **Download Report**: Export your attendance data as CSV

### For Teachers

1. **Login**: Use your teacher credentials
2. **Mark Attendance**: 
   - Click "Mark Attendance" for manual entry
   - Click "Face Recognition" for AI-powered marking
3. **View Reports**: Access class-wise attendance analytics
4. **Manage Periods**: Track attendance for individual class periods

### For Administrators

1. **Login**: Use admin credentials
2. **User Management**: Add/edit/remove users
3. **Face Enrollment**: 
   - Navigate to "Face Enrollment" tab
   - Enter student ID
   - Capture 5 face images from different angles
   - System automatically processes and saves encodings
4. **System Monitoring**: Check system health and database status
5. **Generate Reports**: Create institution-wide reports

## 🔌 API Documentation

### Base URL
```
http://localhost:5002/api
```

### Endpoints

#### Get Student Attendance
```http
GET /student/:studentId/attendance
```
**Response:**
```json
{
  "success": true,
  "data": {
    "attendancePercentage": 87.5,
    "totalDays": 100,
    "presentDays": 87,
    "absentDays": 13,
    "rank": 5,
    "records": [...]
  }
}
```

#### Get Notifications
```http
GET /notifications
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "warning",
      "title": "Low Attendance Alert",
      "message": "Student has 68% attendance",
      "timestamp": "2025-01-08T10:30:00Z",
      "read": 0
    }
  ]
}
```

#### Mark Notification as Read
```http
PUT /notifications/:id/read
```

## 🗄️ Database Schema

### enhanced_attendance Table
```sql
CREATE TABLE enhanced_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  emotion TEXT,
  confidence REAL,
  spoof_status TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### notifications Table
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  read INTEGER DEFAULT 0
);
```

### face_encodings Table
```sql
CREATE TABLE face_encodings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  encoding BLOB NOT NULL,
  image_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the Repository**
2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Coding Standards
- Use TypeScript for frontend code
- Follow PEP 8 for Python code
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting

## 👥 Team

### Founders

**Utkarsh Sinha** - *Founder*  
Visionary leader driving innovation in attendance management  
[LinkedIn](#) | [GitHub](#)

**Avijit Choudhary** - *Co-Founder*  
Technical expert specializing in AI and machine learning  
[LinkedIn](#) | [GitHub](#)

**Subham Sarangi** - *Chief AI Architect*  
AI/ML specialist building intelligent solutions  
[LinkedIn](#) | [GitHub](#)

### Company

**REX**  
Building innovative solutions for modern challenges  
Website: [rex.com](#) | Email: support@rex.com | Phone: +91-9142195378

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors who helped build this project
- OpenCV and dlib communities for excellent computer vision libraries
- React and Flask communities for robust frameworks
- All the students and teachers who provided feedback during development

## 📞 Support

Need help? We're here for you!

- **Email**: support@rex.com
- **Phone**: +91-9142195378
- **Available**: 24/7

## 🔮 Future Roadmap

- [ ] Mobile app (iOS & Android)
- [ ] Biometric integration (fingerprint)
- [ ] Multi-language support
- [ ] Advanced analytics with ML predictions
- [ ] Integration with existing school management systems
- [ ] Parent portal for attendance monitoring
- [ ] SMS/Email notifications
- [ ] Cloud deployment options

---

<div align="center">

**UpastithiCheck** - Smart Attendance, Simplified

Made with ❤️ by [REX](https://rex.com)

⭐ Star us on GitHub — it helps!

</div>
