import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Users } from "lucide-react";

// Import assets
import backgroundImage from "../assets/Punjab_Government_Educational_Website_Warm_Tones.jpg";
import punjabLogo from "../assets/punjab-govt-logo.png.svg"; // This path is correct if your file is in src/assets

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const userTypes = [
    { value: "student", label: "Student" },
    { value: "teacher", label: "Teacher" },
    { value: "admin", label: "Admin" },
    { value: "education", label: "Education Department" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { username, password, userType } = formData;

    let isAuthenticated = false;
    switch (userType) {
      case "student":
        isAuthenticated = username === "student123" && password === "pass123";
        break;
      case "teacher":
        isAuthenticated = username === "teacher123" && password === "pass123";
        break;
      case "admin":
        isAuthenticated = username === "admin123" && password === "pass123";
        break;
      case "education":
        isAuthenticated = username === "education123" && password === "pass123";
        break;
      default:
        alert("Please select a user type");
        setIsLoading(false);
        return;
    }

    if (isAuthenticated) {
      // Navigate to appropriate dashboard
      switch (userType) {
        case "student":
          navigate("/dashboard/student");
          break;
        case "teacher":
          navigate("/dashboard/teacher");
          break;
        case "admin":
          navigate("/dashboard/admin");
          break;
        case "education":
          navigate("/dashboard/education");
          break;
        default:
          alert("An unexpected error occurred.");
      }
    } else {
      alert("Invalid credentials for " + userType + ". Please try again.");
    }
    
    setIsLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="min-h-screen bg-black/50">
        {/* Header */}
        <header className="bg-transparent backdrop-blur-sm p-4">
          <div className="container mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Login to Smart Attend</h1>
                <p className="text-xs text-gray-300">Punjab Education Portal</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="max-w-md w-full animate-fade-in">
            {/* Glassmorphism Card */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
              {/* Logo */}
              <div className="text-center mb-6">
                <img 
                  src={punjabLogo} 
                  alt="Punjab Government Logo" 
                  className="w-20 h-20 mx-auto mb-3" 
                />
                <h2 className="text-2xl font-bold text-white">Portal Login</h2>
                <p className="text-sm text-gray-300">Enter your credentials to continue</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      id="username"
                      required
                      className="bg-white/10 border border-white/20 rounded-lg py-2 px-3 pl-10 w-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("username", e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      id="password"
                      required
                      className="bg-white/10 border border-white/20 rounded-lg py-2 px-3 pl-10 w-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("password", e.target.value)}
                    />
                  </div>
                </div>

                {/* User Type */}
                <div>
                  <label htmlFor="userType" className="block text-sm font-medium text-gray-200 mb-2">
                    User Type
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      id="userType"
                      required
                      className="bg-white/10 border border-white/20 rounded-lg py-2 px-3 pl-10 w-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm"
                      value={formData.userType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("userType", e.target.value)}
                    >
                      <option value="" className="text-black">Select your role</option>
                      {userTypes.map((type) => (
                        <option key={type.value} value={type.value} className="text-black">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white text-base font-semibold py-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;