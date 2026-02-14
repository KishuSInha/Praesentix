import { useNavigate } from "react-router-dom";
import { LogIn, Camera, ArrowLeft, Shield, Zap, Globe, Lock, ArrowRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "../components/Logo";

const Selection = () => {
  const navigate = useNavigate();

  const options = [
    {
      id: "login",
      title: "Management Portal",
      subtitle: "Administration",
      description: "Secure access to institutional controls, attendance analytics, and system configuration.",
      icon: Shield,
      action: () => navigate("/login")
    },
    {
      id: "camera",
      title: "Biometric Entry",
      subtitle: "Verification",
      description: "Quick-access biometric scanning for instant presence verification and automated reporting.",
      icon: Camera,
      action: () => navigate("/camera-attendance")
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950 font-['Outfit'] overflow-hidden relative flex flex-col items-center justify-center p-6">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#C4F582] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-200 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 relative z-10"
      >
        <Logo size="lg" />
      </motion.div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {options.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            onClick={option.action}
            className="group cursor-pointer bg-white border border-slate-100 p-10 rounded-[2rem] shadow-sm hover:shadow-2xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#C4F582] group-hover:text-slate-950 transition-all duration-500">
                <option.icon className="w-7 h-7" />
              </div>

              <div className="space-y-4">
                <p className="label-caps">{option.subtitle}</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  {option.title}
                </h2>
                <p className="text-slate-500 text-base leading-relaxed font-medium">
                  {option.description}
                </p>
              </div>
            </div>

            <div className="mt-12">
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-950 transition-colors">
                <span>Enter Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Simplified Status Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-20 flex items-center gap-12 opacity-30 grayscale"
      >
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Network Operational</span>
        </div>
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">AES-256 Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Selection;