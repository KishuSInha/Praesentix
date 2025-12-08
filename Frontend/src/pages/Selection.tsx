import { useNavigate } from "react-router-dom";
import { LogIn, Camera, ArrowLeft } from "lucide-react";
import govEmblem from "../assets/government-emblem.svg";

const Selection = () => {
  const navigate = useNavigate();

  const options = [
    {
      id: "login",
      title: "System Login",
      description: "Access your dashboard with secure authentication",
      icon: LogIn,
      color: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
      action: () => navigate("/login")
    },
    {
      id: "camera",
      title: "Face Recognition Attendance",
      description: "Quick attendance marking using advanced AI technology",
      icon: Camera,
      color: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
      action: () => navigate("/camera-attendance")
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <img src={govEmblem} alt="Government Emblem" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-semibold">Upastithi Access Portal</h1>
                <p className="text-sm opacity-90">Choose your preferred access method</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {options.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                className={`${option.color} rounded-2xl p-8 border shadow-lg cursor-pointer card-hover transition-all duration-300 hover:shadow-xl`}
                onClick={option.action}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-md">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      {option.title}
                    </h2>
                    <p className="text-gray-600 text-lg">
                      {option.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0 opacity-50">
                    <ArrowLeft className="w-6 h-6 rotate-180" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-2xl font-semibold mb-6 text-gray-900">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">2,500+</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">150+</div>
              <div className="text-sm text-gray-600">Institutions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">25+</div>
              <div className="text-sm text-gray-600">Districts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Selection;