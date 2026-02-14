import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "../components/Logo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: Protocol mismatch at node:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Outfit'] antialiased flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px]" />
      </div>

      <header className="px-8 py-6 flex items-center justify-between relative z-10">
        <Logo size="sm" />
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Error 404</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-xl w-full text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[4rem] p-12 md:p-16 border border-slate-100 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

            <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl shadow-rose-500/10 mx-auto mb-10">
              <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>

            <div className="space-y-4 mb-12">
              <h1 className="text-8xl font-black text-slate-900 tracking-tighter">404</h1>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Navigation Failure</h2>
              <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-sm mx-auto uppercase tracking-wider">
                The requested resource link has been severed or does not exist in the current directory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/')}
                className="bg-emerald-600 text-white rounded-2xl py-5 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Core
              </button>

              <button
                onClick={() => navigate(-1)}
                className="bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl py-5 px-8 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>
          </motion.div>

          <div className="space-y-2 opacity-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Praesentix Biometric Systems</p>
            <div className="h-px w-12 bg-slate-200 mx-auto" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
