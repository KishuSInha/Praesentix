import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Shield, User, Lock, ArrowLeft, RefreshCcw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../components/Logo";

const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: "teacher"
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userType) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.userType
        })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem("currentUser", JSON.stringify(result.user));
        if (result.token) localStorage.setItem("token", result.token);
        navigate(`/dashboard/${formData.userType}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 font-['Outfit'] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-100 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Logo size="lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-10 md:p-14 shadow-2xl space-y-10"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Security Login</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.1em]">Verify your identity to proceed</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Role Switcher */}
            <div className="flex p-1.5 bg-slate-50 rounded-2xl border border-slate-100 gap-1.5">
              {['teacher', 'admin'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: role })}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${formData.userType === role
                    ? 'bg-slate-950 text-white shadow-xl'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-950 transition-colors" />
                <input
                  type="text"
                  placeholder="Username / Email"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold focus:outline-none focus:border-slate-950 transition-all placeholder:text-slate-300 ring-0"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-950 transition-colors" />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold focus:outline-none focus:border-slate-950 transition-all placeholder:text-slate-300 ring-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.userType}
              className="bg-[#C4F582] text-slate-950 w-full rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-[#C4F582]/10"
            >
              {isLoading ? (
                <RefreshCcw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  Connect Securely
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </button>
          </div>
        </motion.div>

        <div className="mt-12 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Praesentix Biometrics System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
