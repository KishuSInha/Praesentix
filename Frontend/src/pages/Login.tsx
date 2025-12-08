import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Users } from "lucide-react";

import Logo from "../components/Logo";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="max-w-md w-full animate-fade-in">
          {/* Login Card */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Logo size="lg" />
              </div>
              <p className="text-gray-600">Enter your credentials to access the system</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    required
                    className="bg-white border border-gray-300 rounded-lg py-3 px-4 pl-12 w-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("username", e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    required
                    className="bg-white border border-gray-300 rounded-lg py-3 px-4 pl-12 w-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("password", e.target.value)}
                  />
                </div>
              </div>

              {/* User Type */}
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="userType"
                    required
                    className="bg-white border border-gray-300 rounded-lg py-3 px-4 pl-12 w-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                    value={formData.userType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("userType", e.target.value)}
                  >
                    <option value="">Select your role</option>
                    {userTypes.map((type) => (
                      <option key={type.value} value={type.value}>
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
                className="w-full bg-primary hover:bg-primary/90 text-white text-lg font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">REX Technologies</p>
              <p className="text-xs text-gray-400 mt-1">Secure • Smart • Simple</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;