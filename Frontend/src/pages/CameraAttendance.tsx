import { useState, useEffect, useRef, useCallback } from "react";
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
  Wifi,
  Scan
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LivenessScanner } from "../components/LivenessScanner";
import { useToast } from "../hooks/useToast";
import api from "../utils/api";
import Logo from "../components/Logo";
import { API_CONFIG } from "../utils/mockData";

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
  isCapturing?: boolean;
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

  // Continuous RTSP Recognition state
  const [isContinuousRtspScanning, setIsContinuousRtspScanning] = useState(false);
  const continuousRtspRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Camera Device Selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

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

  // RTSP logic uses MJPEG stream from the backend instead of polling logic

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };
    getDevices();
  }, [selectedDeviceId]);

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
        setRtspPreview(`${API_CONFIG.BASE_URL}/rtsp/stream?url=${encodeURIComponent(rtspUrl)}`);
        setRtspConnected(true);
        showToast("success", "Connection Established", "Live stream active!");
      }
    } catch (err: any) {
      showToast("error", "Connection Failed", err.message || "Could not reach camera");
      setRtspPreview(null);
      setRtspConnected(false);
    } finally {
      setIsTestingRtsp(false);
    }
  };

  const fetchRecentAttendance = useCallback(async () => {
    if (!currentPeriod) return;
    try {
      const [attendanceRes, liveRes] = await Promise.all([
        api.getPeriodAttendance(attendanceDate, currentPeriod),
        isContinuousRtspScanning ? api.getRtspDetections() : Promise.resolve({ success: true, detectedFaces: [] })
      ]);

      // 1. Map Confirmed Records
      const records = attendanceRes.data || [];
      const confirmedFaces = records.map((r: any) => ({
        name: r.name,
        rollNumber: r.studentId,
        spoofed: r.spoofingStatus !== 'LIVE',
        emotion: r.emotion || 'Neutral',
        recognitionConfidence: r.recognitionConfidence,
        livenessConfidence: r.livenessConfidence,
        isLive: r.spoofingStatus === 'LIVE',
        attendanceMarked: true
      }));

      // 2. Map Live Unconfirmed Detections
      const liveFaces = (liveRes.detectedFaces || []).map((f: any) => ({
        ...f,
        attendanceMarked: false,
        isCapturing: true // UI hint
      }));

      // Merge: Live faces first, then confirmed ones (which are already newest-first)
      const combined: any[] = [];

      // 1. Add unconfirmed active detections at the very top
      liveFaces.forEach((lf: any) => {
        if (!confirmedFaces.some((cf: any) => cf.rollNumber === lf.rollNumber && lf.rollNumber !== 'N/A')) {
          combined.push(lf);
        }
      });

      // 2. Add confirmed records (backend already returns them sorted desc by time)
      combined.push(...confirmedFaces);

      // Take the top 10 most recent (without reversing)
      setDetectedFaces(combined.slice(0, 10));
    } catch (err) {
      console.error("[RTSP Polling] Failed to fetch latest attendance:", err);
    }
  }, [currentPeriod, attendanceDate, isContinuousRtspScanning]);

  // Removed auto-fetch useEffect - user requested history only on manual scan

  const handleRtspRecognition = async () => {
    if (!currentPeriod) { showToast("warning", "Missing Info", "Please select a period first"); return; }
    if (!rtspUrl) { showToast("warning", "Missing URL", "Please enter an RTSP URL"); return; }
    try {
      showToast("info", "Processing", "Requesting frames from remote camera...");
      const result = await api.recognizeRtsp(rtspUrl, { period: currentPeriod, date: attendanceDate });
      if (result.success) {
        setDetectedFaces(result.detectedFaces.slice(0, 8).map((f: any) => ({
          ...f,
          spoofed: !f.isLive,
          isLive: f.isLive,
          attendanceMarked: true // Assume marked if returned from backend recognize
        })));

        const recognized = result.detectedFaces.filter((f: any) => f.name !== 'Unknown').length;
        if (recognized > 0 && !isContinuousRtspScanning) {
          showToast("success", "Recognition Complete", `Identified ${recognized} student(s)`);
        }
      } else if (!isContinuousRtspScanning) {
        showToast("info", "No Match", "No recognized faces in remote stream");
      }
    } catch (err: any) {
      if (!isContinuousRtspScanning) {
        showToast("error", "RTSP Error", err.message || "Failed to process remote recognition");
      }
      console.error("[RTSP Recognition] Error:", err);
      // Optional: stop continuous scanning on fatal error to prevent spam
      // stopContinuousRtsp(); 
    }
  };

  const startContinuousRtsp = async () => {
    if (!currentPeriod || !rtspUrl) return;
    try {
      setIsContinuousRtspScanning(true);
      showToast("info", "Continuous Monitoring Started", "Backend is now recognizing faces every second...");

      await api.startRtspRecognition(rtspUrl, currentPeriod);

      // Pull results immediately
      fetchRecentAttendance();

      // Then poll for UI updates every 3 seconds (reduces network load compared to 1s recognition)
      continuousRtspRef.current = setInterval(() => {
        fetchRecentAttendance();
      }, 3000);
    } catch (err: any) {
      showToast("error", "Failed to start monitoring", err.message);
      setIsContinuousRtspScanning(false);
    }
  };

  const stopContinuousRtsp = async () => {
    try {
      setIsContinuousRtspScanning(false);
      if (continuousRtspRef.current) {
        clearInterval(continuousRtspRef.current);
        continuousRtspRef.current = null;
      }
      await api.stopRtspRecognition();
      showToast("info", "Monitoring Stopped", "Remote recognition worker deactivated.");
    } catch (err: any) {
      showToast("error", "Error stopping monitoring", err.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (continuousRtspRef.current) {
        clearInterval(continuousRtspRef.current);
      }
    };
  }, []);

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

              {/* Camera Device Selector (shown when Device mode) */}
              {cameraSource === 'device' && videoDevices.length > 1 && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 ml-0.5 mb-1 block">Camera</label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pl-9 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                      {videoDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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

            <div className="space-y-3">
              {detectedFaces.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">No data yet</p>
                </div>
              ) : (
                detectedFaces.map((face, i) => {
                  const isKnown = face.name !== 'Unknown';
                  const isSpoofed = face.spoofed;
                  const isCapturing = face.isCapturing;
                  const conf = face.recognitionConfidence ?? 0;
                  const statusColor = isSpoofed ? 'rose' : isCapturing ? 'slate' : isKnown ? 'emerald' : 'amber';
                  const statusLabel = isSpoofed ? 'SPOOFED' : isCapturing ? 'CAPTURING...' : isKnown ? 'LIVE ✓' : 'UNKNOWN';
                  const initials = isKnown
                    ? face.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    : '?';
                  const confColor = conf >= 85 ? 'bg-emerald-500' : conf >= 70 ? 'bg-amber-400' : 'bg-rose-400';

                  return (
                    <motion.div
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      key={i}
                      className={`rounded-2xl border overflow-hidden transition-all hover:shadow-md ${isSpoofed ? 'bg-rose-50 border-rose-200' :
                        isKnown ? 'bg-white border-emerald-100' :
                          'bg-amber-50 border-amber-200'
                        }`}
                    >
                      {/* Top row: avatar + name + status */}
                      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                        {/* Avatar circle with initials */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${isSpoofed ? 'bg-rose-200 text-rose-700' :
                          isKnown ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-200 text-amber-700'
                          }`}>
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* STUDENT NAME — large, bold, prominent */}
                          <p className={`font-black text-[15px] leading-tight truncate ${isSpoofed ? 'text-rose-800' : isKnown ? 'text-slate-900' : 'text-amber-800'
                            }`}>
                            {face.name}
                          </p>

                          {/* Roll number badge */}
                          {isKnown && face.rollNumber !== 'N/A' && (
                            <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              #{face.rollNumber}
                            </span>
                          )}
                        </div>

                        {/* Status pill */}
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${isSpoofed ? 'bg-rose-500 text-white' :
                          isKnown ? 'bg-emerald-500 text-white' :
                            'bg-amber-400 text-white'
                          }`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Bottom row: confidence bar + trust score */}
                      <div className="px-3 pb-3 space-y-1.5">
                        {/* Confidence bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${confColor}`}
                              style={{ width: `${Math.min(conf, 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-black text-slate-500 tabular-nums w-8 text-right">
                            {conf.toFixed(0)}%
                          </span>
                        </div>

                        {/* Trust score + attendance dot */}
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Trust&nbsp;
                            <span className="text-slate-600">{face.currentTrustScore?.toFixed(0) ?? 100}</span>
                          </span>
                          {face.attendanceMarked && (
                            <span className="text-[8px] font-black text-emerald-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                              Marked
                            </span>
                          )}
                          {face.attendanceAlreadyMarked && (
                            <span className="text-[8px] font-black text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full inline-block" />
                              Already marked
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
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
                  <div className="relative w-full flex-1 min-h-0 p-4 pb-0 flex flex-col pt-12 z-20">
                    <div className="relative rounded-[2rem] border-2 border-white/10 shadow-2xl flex-1 w-full min-h-0 bg-black/50 backdrop-blur-sm overflow-hidden">
                      <img
                        src={rtspPreview.startsWith('http') ? rtspPreview : `data:image/jpeg;base64,${rtspPreview}`}
                        alt="Camera Preview"
                        className="w-full h-full object-contain"
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
                <div className="relative z-10 flex flex-col items-center gap-3 w-full px-8 max-w-md mx-auto flex-shrink-0 pb-8 mt-auto">
                  {cameraSource === 'device' ? (
                    <button
                      onClick={() => setIsScanning(true)}
                      disabled={!currentPeriod}
                      className="w-full bg-emerald-500 text-white rounded-2xl py-4 px-10 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      {isClassroomMode ? '⬡ Start Group Scan' : '⬡ Start Camera Recognition'}
                    </button>
                  ) : (
                    <div className="w-full flex gap-3">
                      <button
                        onClick={handleRtspRecognition}
                        disabled={!currentPeriod || !rtspUrl || isContinuousRtspScanning}
                        className="flex-1 bg-[#1a2b3c] border border-slate-700 text-white rounded-2xl py-4 px-4 text-[11px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-slate-800 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
                      >
                        <Scan className="w-4 h-4" />
                        Manual Scan
                      </button>
                      <button
                        onClick={isContinuousRtspScanning ? stopContinuousRtsp : startContinuousRtsp}
                        disabled={!currentPeriod || !rtspUrl}
                        className={`flex-[2] text-white flex-shrink-0 rounded-2xl py-4 px-4 text-[11px] font-black uppercase tracking-[0.1em] shadow-xl transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2 ${isContinuousRtspScanning
                          ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'
                          : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                          }`}
                      >
                        {isContinuousRtspScanning ? <XCircle className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        {isContinuousRtspScanning ? "Stop Scanning" : "Start Continuous"}
                      </button>
                    </div>
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
                  deviceId={selectedDeviceId}
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