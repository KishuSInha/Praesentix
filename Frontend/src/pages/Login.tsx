import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ScanFace, Database, Network } from "lucide-react";
import Logo from "../components/Logo";
const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "", userType: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userType) return alert("SECURITY ALERT: Please select a Role.");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.userType
        })
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Store user data for dashboards
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        navigate(`/dashboard/${formData.userType}`);
      } else {
        alert(result.message || "Access Denied: Invalid Credentials");
      }
    } catch (error) {
      console.error("Connection Failed:", error);
      alert(`System Error: Failed to connect to secure server (${API_URL}). Please ensure the backend is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#121212] flex flex-col lg:flex-row font-sans">



      {/* LEFT SIDE: BIOMETRIC INTERFACE */}
      <div className="w-full lg:w-1/2 bg-[#0a0a0a] flex flex-col relative min-h-[450px] lg:h-screen overflow-hidden text-white shrink-0">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070"
            className="w-full h-full object-cover opacity-40 grayscale"
            alt="Facial Recognition HUD"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="w-full h-[1px] bg-blue-500 shadow-[0_0_15px_#3b82f6] absolute animate-scan-slow opacity-60" />
        </div>

        <div className="mt-auto p-6 md:p-16 z-20 w-full relative">
          <h1 className="text-4xl md:text-[4.5vw] font-black uppercase tracking-tighter leading-[0.8] mb-8">
            Identity <br /> <span className="text-blue-600">Verification.</span>
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ScanFace, label: "Face ID", desc: "Neural Match" },
              { icon: Database, label: "Ledger", desc: "Immutable Log" },
              { icon: Network, label: "Mesh", desc: "Live Node" }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 border border-white/10 bg-black/60 backdrop-blur-md rounded-lg hover:border-blue-500 transition-colors"
              >
                <item.icon className="text-blue-500 mb-2" size={18} />
                <h4 className="text-[9px] font-black uppercase tracking-widest mb-0.5">{item.label}</h4>
                <p className="text-[8px] text-slate-400 uppercase tracking-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: THE FORM */}
      <div className="flex-1 bg-white p-6 md:p-24 flex flex-col justify-center relative min-h-screen lg:min-h-0">
        <div className="max-w-md w-full mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors mb-10"
          >
            <ArrowLeft size={14} /> System Exit
          </button>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authorization Role</label>
              <div className="grid grid-cols-2 gap-2">
                {["student", "teacher", "admin", "education"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleChange("userType", role)}
                    className={`py-3 border text-[9px] font-black uppercase tracking-widest transition-all rounded-sm ${formData.userType === role ? "border-blue-600 bg-blue-600 text-white" : "border-slate-100 text-slate-400 bg-[#fafafa]"}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="group border-b border-slate-200 focus-within:border-blue-600 transition-all">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-blue-600">User_Token</span>
                <input
                  type="text"
                  required
                  className="w-full bg-transparent py-3 text-lg font-bold outline-none"
                  placeholder="ID Number"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                />
              </div>

              <div className="group border-b border-slate-200 focus-within:border-blue-600 transition-all">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-blue-600">Access_Secret</span>
                <input
                  type="password"
                  required
                  className="w-full bg-transparent py-3 text-lg font-bold outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#121212] active:scale-95 text-white py-5 flex items-center justify-center gap-4 transition-all duration-300"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {isLoading ? "Validating..." : "Establish Connection"}
              </span>
              {!isLoading && <ChevronRight size={16} />}
            </button>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (min-width: 1024px) {
        }
        @keyframes scan-slow { 
          0% { top: 0% } 
          100% { top: 100% } 
        }
        .animate-scan-slow { 
          animation: scan-slow 6s linear infinite; 
        }
        input::placeholder { color: #cbd5e1; font-weight: 400; font-size: 14px; }
      `}} />
    </div>
  );
};

export default Login;