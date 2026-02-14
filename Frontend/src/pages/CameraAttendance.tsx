import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  History,
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
  Shield,
  Calendar,
  Zap,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LivenessScanner } from "../components/LivenessScanner";
import { useToast } from "../hooks/useToast";
import { offlineStorage } from "../lib/offline-storage";
import api from "../utils/api";
import Logo from "../components/Logo";

interface DetectedFace {
  name: string;
  rollNumber: string;
  spoofed: boolean;
  emotion: string;
  attendanceMarked?: boolean;
  attendanceAlreadyMarked?: boolean;
  recognitionConfidence?: number;
  livenessConfidence?: number;
  currentTrustScore?: number;
}

const CameraAttendance = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isClassroomMode, setIsClassroomMode] = useState(false);

  const periods = [
    "1st Period", "2nd Period", "3rd Period", "4th Period", "5th Period", "6th Period"
  ];

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const handleLivenessSuccess = async (images: string[]) => {
    if (!currentPeriod) {
      showToast("warning", "Missing Info", "Please select a period first");
      setIsScanning(false);
      return;
    }

    try {
      showToast("info", "Processing", isClassroomMode ? "Analyzing group capture..." : "Verifying identity...");
      const result = await api.recognizeFace(images, {
        period: currentPeriod,
        date: attendanceDate,
      });

      if (result.success) {
        setDetectedFaces(result.detectedFaces);
        const recognized = result.detectedFaces.filter((f: any) => f.name !== 'Unknown').length;
        showToast("success", "Recognition Complete", `Identified ${recognized} student(s)`);
      } else {
        if (isOffline) {
          showToast("info", "Offline Mode", "Attendance queued for sync");
        } else {
          showToast("info", "No Match", "No recognized faces in the frame");
        }
      }
    } catch (err) {
      showToast("error", "Error", "Failed to process identification");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Outfit'] antialiased">
      <header className="px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-emerald-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo size="sm" />
          <div className="h-6 w-px bg-slate-100 hidden md:block" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              Biometric Relay <span className="text-emerald-600 italic">v4.0</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classroom Mode</span>
            <button
              onClick={() => setIsClassroomMode(!isClassroomMode)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isClassroomMode ? 'bg-[#C4F582]' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isClassroomMode ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {isOffline && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5" /> Local Only
            </div>
          )}
          <button className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left: Configuration & Logs */}
        <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h2 className="flex items-center gap-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">
              <LayoutGrid className="w-4 h-4 text-emerald-600" /> Session Configuration
            </h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Class Segment</label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(e.target.value)}
                >
                  <option value="">Choose Phase...</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 ml-1">Protocol Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-8 px-1">
              <h2 className="font-black text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" /> Session History
              </h2>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{detectedFaces.length} Detected</span>
            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {detectedFaces.length === 0 ? (
                <div className="text-center py-16 grayscale opacity-30">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No telemetry data</p>
                </div>
              ) : (
                detectedFaces.map((face, i) => (
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={i}
                    className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${face.spoofed || face.name === 'Unknown' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {face.name === 'Unknown' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{face.name}</p>
                        <p className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${face.recognitionConfidence && face.recognitionConfidence < 70 ? 'text-amber-500' : 'text-slate-400'}`}>
                          Match: {face.recognitionConfidence?.toFixed(1) || 0}% | Trust: {face.currentTrustScore || 100}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right: Scanner */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <AnimatePresence mode="wait">
            {!isScanning ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center gap-8 h-[650px] bg-white rounded-[4rem] border border-slate-100 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <div className="w-28 h-28 bg-emerald-50 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-xl shadow-emerald-500/10 group-hover:scale-110 transition-transform duration-500">
                  <Shield className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-slate-900 leading-tight">Biometric Capture <br />Subsystem</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Active Status: {isClassroomMode ? 'Classroom Mode' : 'Protocol Standby'}</p>
                </div>

                <div className="flex flex-col items-center gap-4 w-full px-12">
                  <button
                    onClick={() => setIsScanning(true)}
                    disabled={!currentPeriod}
                    className="w-full max-w-sm bg-emerald-600 text-white rounded-[2.5rem] py-5 px-12 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    {isClassroomMode ? 'Start Group Scan' : 'Open Capture Link'}
                  </button>
                  {!currentPeriod && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3 fill-rose-500" /> Select Phase to Authorize
                    </motion.p>
                  )}
                </div>

                <div className="absolute bottom-8 left-0 w-full flex justify-center">
                  <div className="flex items-center gap-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> End-to-End Encryption</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500" /> {isClassroomMode ? 'Batch Match Mode' : 'Neural Match Active'}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative h-[650px] bg-black rounded-[4rem] overflow-hidden border-8 border-white shadow-2xl"
              >
                <LivenessScanner
                  mode={isClassroomMode ? 'classroom' : 'single'}
                  onSuccess={handleLivenessSuccess}
                  onFailure={(err) => {
                    showToast("error", "Capture Failed", err);
                    setIsScanning(false);
                  }}
                />
                <div className="absolute bottom-10 left-0 w-full flex justify-center z-50">
                  <button
                    onClick={() => setIsScanning(false)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-3"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" /> Terminate Session
                  </button>
                </div>
                <div className="absolute inset-x-12 top-12 flex justify-between items-start pointer-events-none z-50">
                  <div className="border-l-2 border-t-2 border-emerald-500 w-12 h-12" />
                  <div className="border-r-2 border-t-2 border-emerald-500 w-12 h-12" />
                </div>
                <div className="absolute inset-x-12 bottom-24 flex justify-between items-start pointer-events-none z-50">
                  <div className="border-l-2 border-b-2 border-emerald-500 w-12 h-12" />
                  <div className="border-r-2 border-b-2 border-emerald-500 w-12 h-12" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default CameraAttendance;
