import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Scan,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import praesentixLogo from "../assets/Praesentix.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DetectedFace {
  name: string;
  rollNumber: string;
  spoofed: boolean;
  emotion: string;
  attendanceMarked?: boolean;
  attendanceAlreadyMarked?: boolean;
  recognitionConfidence?: number;
  livenessConfidence?: number;
}

const CameraAttendance = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showAlreadyMarkedDialog, setShowAlreadyMarkedDialog] = useState(false);
  const [alreadyMarkedStudents, setAlreadyMarkedStudents] = useState<string[]>(
    []
  );
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // RTSP State
  const [cameraSource, setCameraSource] = useState<'device' | 'rtsp'>('device');
  const [rtspUrl, setRtspUrl] = useState('');
  const [rtspPreviewImage, setRtspPreviewImage] = useState<string | null>(null);

  const periods = [
    "1st Period (9:00-10:00)",
    "2nd Period (10:00-11:00)",
    "3rd Period (11:00-12:00)",
    "4th Period (12:00-1:00)",
    "5th Period (2:00-3:00)",
    "6th Period (3:00-4:00)",
  ];

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (cameraSource === 'rtsp') {
      await testRtspConnection();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreamActive(true);
        showToast("success", "Camera Ready", "You can start scanning");
      }
    } catch (error: any) {
      showToast("error", "Camera Error", error.message);
    }
  };

  const testRtspConnection = async () => {
    if (!rtspUrl) {
      showToast("warning", "Missing URL", "Please enter an RTSP URL");
      return;
    }

    // Validation for placeholders and incomplete IPs
    if (rtspUrl.includes('XX') || rtspUrl.includes('*') || rtspUrl.includes('IP_ADDRESS') || rtspUrl.includes('.x:') || rtspUrl.includes('.x/')) {
      showToast("error", "Incomplete IP Address", "Please replace 'x' or placeholders with the complete IP address digits (e.g., 223.231.237.123)");
      return;
    }

    // Check for incomplete IP patterns like ending with .x
    const ipMatch = rtspUrl.match(/@(\d+\.\d+\.\d+\.(\w+)):/);
    if (ipMatch && (ipMatch[2] === 'x' || ipMatch[2] === 'X' || ipMatch[2].includes('*'))) {
      showToast("error", "Incomplete IP Address", `Replace '${ipMatch[1]}' with your complete camera IP (all 4 numbers)`);
      return;
    }

    if (rtspUrl.includes('admin:password')) {
      showToast("warning", "Check Credentials", "You are using default 'admin:password'. Ensure these are correct.");
    }

    setIsScanning(true); // Reuse scanning state for loading
    try {
      const apiService = (await import("../utils/api")).default;
      const result = await apiService.getRtspPreview(rtspUrl);
      if (result.success && result.image) {
        setRtspPreviewImage(`data:image/jpeg;base64,${result.image}`);
        setIsStreamActive(true);
        showToast("success", "Connection Successful", "Camera connected");
      }
    } catch (e: any) {
      showToast("error", "Connection Failed", e.message);
      setIsStreamActive(false);
    } finally {
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (cameraSource === 'device') {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsStreamActive(false);
    setDetectedFaces([]);
    setIsScanning(false);
    setRtspPreviewImage(null);
  };

  const toggleCamera = () => {
    setFacingMode((p) => (p === "user" ? "environment" : "user"));
    stopCamera();
    setTimeout(startCamera, 200);
  };

  const startScanning = async () => {
    if (!currentPeriod) {
      showToast("warning", "Select Period", "Please select a class period");
      return;
    }

    setIsScanning(true);
    setDetectedFaces([]);

    const apiService = (await import("../utils/api")).default;

    try {
      let result;

      if (cameraSource === 'device') {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 640;
        canvas.height = 480;

        const captureFrame = async () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/jpeg", 0.7)
          );
          if (!blob) return null;

          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve(base64);
            };
          });
        };

        // Capture 3 frames with 200ms delay
        const frames: string[] = [];
        for (let i = 0; i < 3; i++) {
          const frame = await captureFrame();
          if (frame) frames.push(frame);
          if (i < 2) await new Promise(r => setTimeout(r, 200));
        }

        if (frames.length === 0) {
          setIsScanning(false);
          return;
        }

        result = await apiService.recognizeFace(frames, {
          period: currentPeriod,
          date: attendanceDate,
        });

      } else {
        // RTSP Mode
        result = await apiService.recognizeRtsp(rtspUrl, {
          period: currentPeriod,
          date: attendanceDate
        });
      }

      if (result.success) {
        setDetectedFaces(result.detectedFaces);

        const already = result.detectedFaces
          .filter((f: any) => f.attendanceAlreadyMarked)
          .map((f: any) => `${f.name} (${f.rollNumber})`);

        if (already.length > 0) {
          setAlreadyMarkedStudents(already);
          setShowAlreadyMarkedDialog(true);
        }
      } else {
        showToast("info", "No Faces", "No students detected");
      }
    } catch (e: any) {
      showToast("error", "Scan Failed", e.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <img src={praesentixLogo} className="w-8 h-8" />
        <h1 className="font-semibold">Camera Attendance</h1>
      </header>

      {/* CONTROLS */}
      <section className="px-4 py-4 space-y-3 bg-white border-b">

        <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${cameraSource === 'device' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => { setCameraSource('device'); stopCamera(); }}
          >
            Device Camera
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${cameraSource === 'rtsp' ? 'bg-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => { setCameraSource('rtsp'); stopCamera(); }}
          >
            External Camera (IP)
          </button>
        </div>

        {cameraSource === 'rtsp' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Camera RTSP URL</label>
            <input
              type="text"
              placeholder="rtsp://admin:kishusinha123@223.231.237.123:554/cam/realmonitor?channel=1&subtype=0"
              className="w-full border rounded p-3 text-sm font-mono bg-gray-50"
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
            />
            <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-2 rounded border border-blue-200">
              <p className="flex gap-1 items-center font-medium text-blue-900">
                <Info className="w-3 h-3" />
                <span>Enter your complete camera IP address</span>
              </p>
              <p className="pl-4">Example: <code className="bg-white px-1 py-0.5 rounded text-blue-800">rtsp://admin:kishusinha123@223.231.237.123:554/cam/realmonitor?channel=1&subtype=0</code></p>
              <p className="pl-4 text-orange-700 font-medium">
                ⚠️ Replace <code className="bg-white px-1 rounded">223.231.237.123</code> with your actual camera IP
              </p>
              <p className="pl-4 text-gray-600">
                • Ensure Port 554 is forwarded on your router for public IPs
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <select
            className="w-full border rounded p-3"
            value={currentPeriod}
            onChange={(e) => setCurrentPeriod(e.target.value)}
          >
            <option value="">Select Period</option>
            {periods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <input
            type="date"
            className="w-full border rounded p-3"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>


        <div className="flex gap-2">
          {!isStreamActive ? (
            <button onClick={startCamera} className="btn-primary w-full">
              <Camera className="w-4 h-4 mr-2" />
              {cameraSource === 'rtsp' ? 'Connect to Camera' : 'Start Camera'}
            </button>
          ) : (
            <>
              {cameraSource === 'device' && (
                <button onClick={toggleCamera} className="btn-secondary w-full">
                  Switch Camera
                </button>
              )}
              <button onClick={stopCamera} className="btn-secondary w-full">
                Stop
              </button>
            </>
          )}
        </div>
      </section>

      {/* CAMERA */}
      <main className="px-4 py-4 space-y-4">
        <div className="relative bg-black rounded overflow-hidden aspect-[4/3]">

          {cameraSource === 'device' ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : (
            // RTSP View
            rtspPreviewImage ? (
              <img src={rtspPreviewImage} className="w-full h-full object-contain bg-black" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                <Camera className="w-12 h-12 opacity-20" />
                <p className="text-sm">Enter stream URL and connect</p>
              </div>
            )
          )}


          {!isStreamActive && cameraSource === 'device' && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              Camera not active
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span>{cameraSource === 'rtsp' && !isStreamActive ? 'Connecting...' : 'Scanning...'}</span>
              </div>
            </div>
          )}
        </div>

        {isStreamActive && (
          <button
            onClick={startScanning}
            disabled={isScanning}
            className="btn-primary w-full"
          >
            <Scan className="w-4 h-4 mr-2" />
            Start Scanning
          </button>
        )}

        {/* RESULTS */}
        <section className="bg-white border rounded p-4">
          <h2 className="font-medium mb-3">
            Detected Students ({detectedFaces.length})
          </h2>

          {detectedFaces.length === 0 && (
            <p className="text-sm text-gray-500">No students detected yet</p>
          )}

          <div className="space-y-2">
            {detectedFaces.map((face, i) => (
              <div
                key={i}
                className={`p-3 rounded border flex justify-between ${face.spoofed
                  ? "border-red-400 bg-red-50"
                  : face.attendanceAlreadyMarked
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-green-400 bg-green-50"
                  }`}
              >
                <div>
                  <p className="font-medium">{face.name}</p>
                  <p className="text-xs text-gray-600">
                    Roll: {face.rollNumber}
                  </p>
                </div>
                {face.spoofed ? (
                  <AlertCircle className="text-red-600" />
                ) : (
                  <CheckCircle className="text-green-600" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ALERT */}
      <AlertDialog open={showAlreadyMarkedDialog} onOpenChange={setShowAlreadyMarkedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex gap-2">
              <Info /> Attendance Already Marked
            </AlertDialogTitle>
            <AlertDialogDescription>
              <ul className="mt-2 space-y-1">
                {alreadyMarkedStudents.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CameraAttendance;
