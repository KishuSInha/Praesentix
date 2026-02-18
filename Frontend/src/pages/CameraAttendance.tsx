import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  History,
  WifiOff,
  CheckCircle,
  XCircle,
  LayoutGrid,
  Shield,
  Calendar,
  Zap,
  UserCheck,
  Video,
  Monitor,
  RefreshCw,
  Smartphone,
  Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LivenessScanner } from "../components/LivenessScanner";
import { useToast } from "../hooks/useToast";
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

const DEFAULT_RTSP_URL = "rtsp://10.12.3.8:554/stream1";

const CameraAttendance = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isClassroomMode, setIsClassroomMode] = useState(false);

  // Dual Camera Mode
  const [cameraSource, setCameraSource] = useState<'device' | 'rtsp'>('device');
  const [rtspUrl, setRtspUrl] = useState(localStorage.getItem('rtspUrl') || DEFAULT_RTSP_URL);
  const [rtspPreview, setRtspPreview] = useState<string | null>(null);
  const [isTestingRtsp, setIsTestingRtsp] = useState(false);
  const [rtspConnected, setRtspConnected] = useState(false);

  const periods = ["1st Period", "2nd Period", "3rd Period", "4th Period", "5th Period", "6th Period"];

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
      const result = await api.recognizeFace(images, { period: currentPeriod, date: attendanceDate });
      if (result.success) {
        setDetectedFaces(result.detectedFaces);
        const recognized = result.detectedFaces.filter((f: any) => f.name !== 'Unknown').length;
        showToast("success", "Recognition Complete", `Identified ${recognized} student(s)`);
      } else {
        showToast("info", isOffline ? "Offline Mode" : "No Match", isOffline ? "Attendance queued for sync" : "No recognized faces in the frame");
      }
    } catch {
      showToast("error", "Error", "Failed to process identification");
    } finally {
      setIsScanning(false);
    }
  };

  const checkRtspConnection = async () => {
    if (!rtspUrl) { showToast("warning", "Missing URL", "Please enter an RTSP URL first"); return; }
    try {
      setIsTestingRtsp(true);
      setRtspConnected(false);
      showToast("info", "Testing Connection", "Attempting to reach camera...");
      const result = await api.getRtspPreview(rtspUrl);
      if (result.success && result.image) {
        setRtspPreview(result.image);
        setRtspConnected(true);
        showToast("success", "Connection Established", "Camera is online and reachable");
      }
    } catch (err: any) {
      showToast("error", "Connection Failed", err.message || "Could not reach camera");
      setRtspPreview(null);
      setRtspConnected(false);
    } finally {
      setIsTestingRtsp(false);
    }
  };

  const handleRtspRecognition = async () => {
    if (!currentPeriod) { showToast("warning", "Missing Info", "Please select a period first"); return; }
    if (!rtspUrl) { showToast("warning", "Missing URL", "Please enter an RTSP URL"); return; }
    try {
      setIsScanning(true);
      showToast("info", "Processing", "Requesting frames from remote camera...");
      const result = await api.recognizeRtsp(rtspUrl, { period: currentPeriod, date: attendanceDate });
      if (result.success) {
        setDetectedFaces(result.detectedFaces);
        const recognized = result.detectedFaces.filter((f: any) => f.name !== 'Unknown').length;
        showToast("success", "Recognition Complete", `Identified ${recognized} student(s)`);
      } else {
        showToast("info", "No Match", "No recognized faces in remote stream");
      }
    } catch (err: any) {
      showToast("error", "RTSP Error", err.message || "Failed to process remote recognition");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f0f4f8] text-slate-900 font-['Outfit'] antialiased flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="px-6 py-3 bg-white border-b border-slate-100 z-50 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-emerald-600">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Logo size="sm" />
          <div className="h-5 w-px bg-slate-100 hidden md:block" />
          <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hidden md:block">
            Biometric Relay <span className="text-emerald-600 italic">v4.0</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera Source Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setCameraSource('device')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${cameraSource === 'device' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Smartphone className="w-3 h-3" /> Device
            </button>
            <button
              onClick={() => setCameraSource('rtsp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${cameraSource === 'rtsp' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Monitor className="w-3 h-3" /> RTSP
              {rtspConnected && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
            </button>
          </div>

          {/* Classroom Mode */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:block">Classroom</span>
            <button
              onClick={() => setIsClassroomMode(!isClassroomMode)}
              className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${isClassroomMode ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isClassroomMode ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>

          {isOffline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase tracking-wider">
              <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
          <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content - fills remaining screen */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">

        {/* Left Panel */}
        <div className="lg:col-span-3 bg-white border-r border-slate-100 flex flex-col overflow-y-auto order-2 lg:order-1">
          {/* Session Config */}
          <div className="p-5 border-b border-slate-50">
            <h2 className="flex items-center gap-2 font-black text-slate-400 uppercase tracking-widest text-[9px] mb-4">
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" /> Session Config
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-0.5 mb-1 block">Period</label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(e.target.value)}
                >
                  <option value="">Choose Period...</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-0.5 mb-1 block">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pl-9 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* RTSP Config (shown when RTSP mode) */}
              <AnimatePresence>
                {cameraSource === 'rtsp' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-0.5 mb-1 block">RTSP Endpoint</label>
                      <div className="relative">
                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="rtsp://..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pl-9 text-[10px] font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          value={rtspUrl}
                          onChange={(e) => {
                            setRtspUrl(e.target.value);
                            localStorage.setItem('rtspUrl', e.target.value);
                            setRtspConnected(false);
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={checkRtspConnection}
                      disabled={isTestingRtsp}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${rtspConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-900 text-white hover:bg-black'} disabled:opacity-50`}
                    >
                      {isTestingRtsp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : rtspConnected ? <Wifi className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                      {isTestingRtsp ? "Connecting..." : rtspConnected ? "Connected ✓" : "Verify Link"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Session History */}
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-400 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-600" /> History
              </h2>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{detectedFaces.length}</span>
            </div>

            <div className="space-y-2">
              {detectedFaces.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">No data yet</p>
                </div>
              ) : (
                detectedFaces.map((face, i) => (
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={i}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${face.spoofed || face.name === 'Unknown' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {face.name === 'Unknown' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 leading-none">{face.name}</p>
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                          {face.recognitionConfidence?.toFixed(0) || 0}% | T:{face.currentTrustScore || 100}
                        </p>
                      </div>
                    </div>
                    {face.attendanceMarked && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Scanner - takes full remaining space */}
        <div className="lg:col-span-9 order-1 lg:order-2 relative bg-slate-900 flex flex-col">
          <AnimatePresence mode="wait">
            {!isScanning ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col items-center justify-center gap-8 relative overflow-hidden h-full"
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                </div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

                {/* RTSP Preview or Idle State */}
                {cameraSource === 'rtsp' && rtspPreview ? (
                  <div className="relative w-full max-w-3xl mx-auto px-8">
                    <div className="relative rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl aspect-video">
                      <img
                        src={`data:image/jpeg;base64,${rtspPreview}`}
                        alt="Camera Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live Preview
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">{rtspUrl}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border-2 shadow-2xl transition-all duration-500 ${cameraSource === 'rtsp' ? 'bg-slate-800 border-slate-700' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      {cameraSource === 'rtsp' ? <Monitor className="w-10 h-10 text-slate-500" /> : <Shield className="w-10 h-10 text-emerald-400" />}
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                        {cameraSource === 'rtsp' ? 'Remote Camera' : 'Biometric Capture'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                        {cameraSource === 'rtsp'
                          ? rtspConnected ? '● Connected — Ready to scan' : '○ Verify camera link to proceed'
                          : isClassroomMode ? 'Classroom Mode Active' : 'Protocol Standby'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="relative z-10 flex flex-col items-center gap-3 w-full px-8 max-w-md mx-auto">
                  {cameraSource === 'device' ? (
                    <button
                      onClick={() => setIsScanning(true)}
                      disabled={!currentPeriod}
                      className="w-full bg-emerald-500 text-white rounded-2xl py-4 px-10 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      {isClassroomMode ? '⬡ Start Group Scan' : '⬡ Open Capture Link'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRtspRecognition}
                      disabled={!currentPeriod || !rtspUrl || isScanning}
                      className="w-full bg-emerald-500 text-white rounded-2xl py-4 px-10 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                    >
                      {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Monitor className="w-4 h-4" />}
                      {isScanning ? "Analyzing Stream..." : "Initiate RTSP Recognition"}
                    </button>
                  )}

                  {!currentPeriod && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-rose-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 fill-rose-400" /> Select a period to authorize
                    </motion.p>
                  )}
                </div>

                {/* Corner brackets */}
                <div className="absolute inset-12 pointer-events-none">
                  <div className="absolute top-0 left-0 border-l-2 border-t-2 border-emerald-500/30 w-10 h-10" />
                  <div className="absolute top-0 right-0 border-r-2 border-t-2 border-emerald-500/30 w-10 h-10" />
                  <div className="absolute bottom-0 left-0 border-l-2 border-b-2 border-emerald-500/30 w-10 h-10" />
                  <div className="absolute bottom-0 right-0 border-r-2 border-b-2 border-emerald-500/30 w-10 h-10" />
                </div>

                {/* Footer info */}
                <div className="absolute bottom-6 left-0 w-full flex justify-center">
                  <div className="flex items-center gap-6 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      {cameraSource === 'device' ? <Shield className="w-3 h-3 text-emerald-500" /> : <Monitor className="w-3 h-3 text-emerald-500" />}
                      {cameraSource === 'device' ? 'End-to-End Encrypted' : 'Secured Remote Link'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {isClassroomMode ? 'Batch Match Mode' : 'Neural Match Active'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 relative bg-black h-full"
              >
                <LivenessScanner
                  mode={isClassroomMode ? 'classroom' : 'single'}
                  onSuccess={handleLivenessSuccess}
                  onFailure={(err) => {
                    showToast("error", "Capture Failed", err);
                    setIsScanning(false);
                  }}
                />
                <div className="absolute bottom-8 left-0 w-full flex justify-center z-50">
                  <button
                    onClick={() => setIsScanning(false)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-3"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" /> Terminate Session
                  </button>
                </div>
                {/* Scanner corner brackets */}
                <div className="absolute inset-x-10 top-10 flex justify-between items-start pointer-events-none z-50">
                  <div className="border-l-2 border-t-2 border-emerald-500 w-12 h-12" />
                  <div className="border-r-2 border-t-2 border-emerald-500 w-12 h-12" />
                </div>
                <div className="absolute inset-x-10 bottom-20 flex justify-between items-end pointer-events-none z-50">
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