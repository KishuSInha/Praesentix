import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Cpu, Globe, Lock, CheckCircle2, Activity } from "lucide-react";
import Logo from "../components/Logo";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = React.useState(0);

  const features = [
    {
      id: "identity",
      label: "Identity",
      title: "Verified Identity",
      caption: "Live Identity",
      metric: "99.8%",
      metricLabel: "Precision",
      response: "142ms",
      responseLabel: "Response Time",
      icon: Shield,
      color: "#C4F582",
      description: "Sub-second biometric verification.",
      image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "security",
      label: "Security",
      title: "Encrypted Data",
      caption: "Protocol 4.0",
      metric: "100%",
      metricLabel: "Integrity",
      response: "AES-256",
      responseLabel: "Encryption",
      icon: Lock,
      color: "#3b82f6",
      description: "Privacy-first biometric storage.",
      image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "performance",
      label: "Performance",
      title: "Global Scale",
      caption: "Neural Core",
      metric: "1.2M",
      metricLabel: "Throughput",
      response: "84ms",
      responseLabel: "Avg Latency",
      icon: Activity,
      color: "#f59e0b",
      description: "Ultra-low latency global infrastructure.",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
    }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const f = features[activeFeature];

  return (
    <div className="bg-white text-slate-900 font-['Outfit'] antialiased">

      {/* NAVBAR */}
      <header className="absolute top-0 w-full z-50 px-8 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <div className="flex gap-6 items-center">
            <button onClick={() => navigate("/login")} className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 hover:text-slate-900">
              SIGN IN
            </button>
            <button onClick={() => navigate("/selection")} className="bg-slate-900 text-white px-8 py-3 rounded-full text-[11px] font-semibold tracking-[0.2em] hover:bg-slate-700 transition">
              CONTACT SALES
            </button>
          </div>
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="min-h-screen flex items-center px-8 pt-32">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <span className="text-[11px] tracking-[0.3em] text-slate-400 font-semibold uppercase">
                AI Biometric Infrastructure
              </span>

              <h1 className="text-6xl md:text-7xl font-black leading-tight mt-6">
                Attendance Intelligence.
                <br />
                Built for Institutions.
              </h1>

              <p className="text-lg text-slate-500 mt-8 max-w-xl leading-relaxed">
                Preseantix provides real-time facial recognition attendance
                infrastructure for schools, universities and enterprises.
                Accurate. Secure. Globally scalable.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex justify-center lg:justify-end pr-8"
            >
              {/* Stacked Cards Layout */}
              <div className="relative w-full max-w-[420px] h-[480px]">

                {/* Background Shadow Card */}
                <motion.div
                  initial={{ opacity: 0, rotate: -5, x: 20 }}
                  animate={{ opacity: 1, rotate: -8, x: 0 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="absolute inset-0 bg-slate-50 border border-slate-100 rounded-[3rem] shadow-sm transform -rotate-6"
                />

                {/* Secondary Data Card */}
                <motion.div
                  key={`data-${activeFeature}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute top-12 -right-6 w-full h-full bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 p-10 flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <f.icon className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{f.label}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="h-2 bg-slate-50 rounded-full w-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} transition={{ duration: 1.5 }} className="h-full bg-slate-200" />
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full w-2/3 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} transition={{ duration: 1.5, delay: 0.2 }} className="h-full bg-slate-100" />
                      </div>
                    </div>
                  </div>

                  {/* CENTER VISUAL: Filling the empty area with premium imagery */}
                  <div className="flex-1 flex items-center justify-center p-4 relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`img-${activeFeature}`}
                        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm"
                      >
                        <img
                          src={f.image}
                          alt={f.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                        {/* Gradient Overlay for Depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.responseLabel}</p>
                      <p className="text-2xl font-bold text-slate-950">{f.response}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.metricLabel}</p>
                      <p style={{ color: f.color }} className="text-2xl font-bold">{f.metric}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Primary Face ID Card (Apple Style) */}
                <motion.div
                  key={`main-${activeFeature}`}
                  initial={{ opacity: 0, scale: 0.95, x: -30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -top-10 -left-10 w-[260px] bg-white border border-slate-100 rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center gap-6 z-10"
                >
                  <div style={{ backgroundColor: f.color }} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-950 shadow-lg relative overflow-hidden transition-colors duration-1000">
                    <motion.div
                      animate={{ top: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1/2 bg-white/30 blur-xl translate-y-full"
                    />
                    <f.icon className="w-8 h-8 relative z-10" />
                  </div>

                  <div className="text-center space-y-2">
                    <p style={{ color: f.color }} className="text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-1000">{f.caption}</p>
                    <h4 className="text-xl font-bold text-slate-950">{f.title}</h4>
                    <p className="text-[13px] text-slate-500 leading-relaxed px-2">
                      {f.description}
                    </p>
                  </div>

                  <div className="w-full flex justify-center gap-1.5 pt-2">
                    {features.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${i === activeFeature ? 'w-6' : 'w-1 bg-slate-100'}`}
                        style={{ backgroundColor: i === activeFeature ? f.color : undefined }}
                      />
                    ))}
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </section>


      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-20 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm text-slate-500">

          <div>
            <Logo size="sm" showText={false} />
            <p className="mt-6 text-xs">
              Enterprise-grade biometric attendance infrastructure.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>Overview</li>
              <li>Security</li>
              <li>Compliance</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Solutions</h4>
            <ul className="space-y-2">
              <li>Education</li>
              <li>Enterprise</li>
              <li>Government</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-16 border-t border-slate-100 pt-8 flex justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Preseantix Labs</span>
          <span>Privacy Policy • Terms of Service</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;


/* Feature Component */
type FeatureProps = {
  icon: React.ElementType;
  title: string;
  desc: string;
};

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, desc }) => (
  <div className="space-y-6">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
      <Icon className="w-6 h-6 text-slate-700" />
    </div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
  </div>
);
