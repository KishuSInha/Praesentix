# Upastithi - Government Attendance Management System

An advanced digital attendance management system developed by REX Technologies for government institutions, featuring AI-powered face recognition, comprehensive analytics, and secure multi-role access.

## 🚀 Features

- **Government-Grade Security**: Role-based access control with secure authentication
- **AI-Powered Recognition**: Advanced facial recognition with anti-spoofing technology
- **Multi-Institution Support**: Centralized management across multiple government institutions
- **Real-time Analytics**: Comprehensive reporting and dashboard analytics
- **Professional Design**: Clean, government website-compliant interface
- **Scalable Architecture**: Built to handle large-scale government deployments
- **Compliance Ready**: Meets government data protection and privacy standards
- **24/7 Support**: Enterprise-level support by REX Technologies

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React Query + Context API
- **UI Components**: Custom design system with shadcn/ui base
- **PWA**: Service Worker + Web App Manifest
- **Data**: Mock API with IndexedDB for offline storage

## 🚀 Quick Start

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd smartattend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open http://localhost:8080

### Production Build

```bash
npm run build
npm run preview
```

## 🔧 Configuration

### API Mode Switching

Edit `src/utils/mockData.ts`:

```javascript
export const API_CONFIG = {
  USE_MOCK: true,  // Set to false for real API
  BASE_URL: "http://127.0.0.1:5000/api"
};
```

### Mock Data

The system includes comprehensive mock data for:
- 8 students across multiple classes
- 3 teachers with different subjects  
- 5 schools with realistic metrics
- Attendance records and analytics

## 📱 PWA Features

### Offline Support
- Service worker caches essential assets
- Background sync for attendance data
- Offline fallback pages
- IndexedDB for local data storage

### Installation
1. Visit the app in Chrome/Edge
2. Look for "Install" prompt or menu option
3. Add to home screen for native app experience

### Testing Offline Mode
1. Install the PWA
2. Open Chrome Developer Tools
3. Go to Application > Service Workers
4. Check "Offline" 
5. Reload page - should work offline

## 🎨 Design System

### Color Scheme
- **Background**: Clean white (#FFFFFF)
- **Text**: Professional dark gray (#1F2937)  
- **Primary**: Government blue (#1E40AF)
- **Success**: Green (#059669)
- **Warning**: Amber (#D97706)
- **Error**: Red (#DC2626)

### Role-Based Colors
- **Student**: Cyan (#00bcd4)
- **Teacher**: Purple (#9c27b0) 
- **Admin**: Orange (#ff9800)
- **Education**: Magenta (#e91e63)

## 📊 User Roles & Features

### Student Dashboard
- Personal attendance percentage
- Daily/period-wise attendance status
- Progress tracking and goals
- Class rank and achievements

### Teacher Dashboard  
- Class-wise attendance management
- Manual and camera attendance entry
- Student search and bulk operations
- CSV export and reporting

### Admin Dashboard
- User management and roles
- System configuration
- Database backup and maintenance
- School-wide analytics

### Education Department
- Multi-school oversight
- District-wide reporting
- Dropout rate analysis
- Performance comparisons

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Student | student123 | pass123 |
| Teacher | teacher123 | pass123 |
| Admin | admin123 | pass123 |
| Education | education123 | pass123 |

## 📱 Mobile Features

- **Touch-Optimized**: 44px minimum touch targets
- **Responsive Design**: Works on all screen sizes
- **Gesture Support**: Swipe navigation where appropriate
- **Camera Integration**: Face recognition attendance
- **Offline Sync**: Data syncs when connection restored

## 🛠️ Development

### Project Structure
```
src/
├── components/         # Reusable UI components
├── pages/             # Route components
│   ├── dashboards/    # Role-specific dashboards
├── hooks/             # Custom React hooks  
├── utils/             # Utilities and mock data
└── assets/            # Static assets
```

### Key Files
- `src/utils/mockData.ts` - Mock API and data
- `src/hooks/useToast.tsx` - Toast notification system
- `public/sw.js` - Service Worker for PWA
- `public/manifest.json` - PWA configuration

### Manual Deployment
Works with any static hosting:
- Netlify
- Vercel  
- GitHub Pages
- Firebase Hosting

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Upastithi** - Developed by REX Technologies for Government of India 🇮🇳

*Secure • Reliable • Government Approved*