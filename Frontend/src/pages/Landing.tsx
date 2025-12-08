import { useNavigate } from "react-router-dom";
import { User, Camera, Shield, Clock, Users, BarChart3, FileText, Settings } from "lucide-react";

import Logo from "../components/Logo";
import NotificationCenter from "../components/NotificationCenter";
import founderImage from "../assets/founder.jpeg";
import founder2Image from "../assets/founder2.jpeg";
import cofounderImage from "../assets/cofounder.webp";
import subhamImage from "../assets/subham.jpeg";

const Landing = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <button
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              UpastithiCheck
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Smart Attendance Management System with AI-Powered Face Recognition
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/login")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
              <button 
                onClick={scrollToFeatures}
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-300"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Manual Entry</h3>
              <p className="text-gray-600 text-sm">Quick attendance marking</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-purple-200">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Face Recognition</h3>
              <p className="text-gray-600 text-sm">AI-powered automation</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-green-200">
              <div className="bg-gradient-to-br from-green-100 to-green-200 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600 text-sm">Smart insights & reports</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-orange-200">
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure</h3>
              <p className="text-gray-600 text-sm">Enterprise-grade security</p>
            </div>
          </div>

          {/* Founders Section */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-16 border border-gray-100">
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Meet Our Team</h2>
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
                    <img 
                      src={founderImage} 
                      alt="Utkarsh Sinha" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">Utkarsh Sinha</h3>
                  <p className="text-blue-600 font-medium mb-2">Founder</p>
                  <p className="text-gray-600 text-sm">Visionary leader driving innovation in attendance management</p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-orange-200 shadow-lg">
                    <img 
                      src={founder2Image} 
                      alt="Soumya Sagar Nayak" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">Soumya Sagar Nayak</h3>
                  <p className="text-orange-600 font-medium mb-2">Founder</p>
                  <p className="text-gray-600 text-sm">Strategic innovator shaping the future of education technology</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-purple-200 shadow-lg">
                    <img 
                      src={cofounderImage} 
                      alt="Avijit Choudhary" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">Avijit Choudhary</h3>
                  <p className="text-purple-600 font-medium mb-2">Co-Founder</p>
                  <p className="text-gray-600 text-sm">Technical expert specializing in AI and machine learning</p>
                </div>
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-green-200 shadow-lg">
                    <img 
                      src={subhamImage} 
                      alt="Subham Sarangi" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">Subham Sarangi</h3>
                  <p className="text-green-600 font-medium mb-2">Chief AI Architect</p>
                  <p className="text-gray-600 text-sm">AI/ML specialist building intelligent solutions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="mb-4">
                <Logo size="sm" showText={true} variant="dark" />
              </div>
              <p className="text-gray-400 text-sm">
                Smart attendance management for modern institutions
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Contact</h3>
              <div className="text-gray-400 space-y-1 text-sm">
                <p>Email: support@rex.com</p>
                <p>Phone: +91-9142195378</p>
                <p>Available 24/7</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-400 text-sm">
            <p>&copy; 2025 REX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
