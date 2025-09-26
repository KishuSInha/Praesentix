import { useNavigate } from "react-router-dom";
import { User, Camera, Shield, Check } from "lucide-react";
import heroImage from "../assets/hero-classroom.png";
import LanguageSelector from "../components/LanguageSelector";
import { useTranslation } from 'react-i18next';

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Smart Attend</h1>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="relative min-h-screen flex items-center justify-center">
          {/* Hero Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroImage})`
            }}
          />
          
          {/* Hero Content */}
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-7xl font-bold mb-4">{t('Welcome to Smart Attend')}</h1>
            <p className="text-lg md:text-2xl mb-8 font-medium">
              {t('Modernizing attendance tracking in Punjab government schools')}
            </p>

            {/* Get Started Button */}
            <button
              onClick={() => navigate("/login")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg text-base transition-all duration-300 transform hover:scale-105 mb-8 shadow-lg hover:shadow-xl"
            >
               {t('Login')}
            </button>

            {/* Feature Icons */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-16">
              <button
                className="flex flex-col items-center space-y-2 text-white hover:text-orange-300 transition-colors p-2 rounded-lg"
              >
                <User className="w-6 h-6" />
                <span className="text-xs">Manual Entry</span>
              </button>
              
              <button
                className="flex flex-col items-center space-y-2 text-white hover:text-orange-300 transition-colors p-2 rounded-lg"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Camera Recognition</span>
              </button>
              
              <button
                className="flex flex-col items-center space-y-2 text-white hover:text-orange-300 transition-colors p-2 rounded-lg"
              >
                <Shield className="w-6 h-6" />
                <span className="text-xs">Admin Dashboard</span>
              </button>
            </div>
          </div>
        </div>


      </main>
    </div>
  );
};

export default Landing;
