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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsStreamActive(false);
    setDetectedFaces([]);
    setIsScanning(false);
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

    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setDetectedFaces([]);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.8)
    );

    if (!blob) {
      setIsScanning(false);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(blob);

    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const apiService = (await import("../utils/api")).default;

        const result = await apiService.recognizeFace(base64, {
          period: currentPeriod,
          date: attendanceDate,
        });

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

        <div className="flex gap-2">
          {!isStreamActive ? (
            <button onClick={startCamera} className="btn-primary w-full">
              <Camera className="w-4 h-4 mr-2" /> Start Camera
            </button>
          ) : (
            <>
              <button onClick={toggleCamera} className="btn-secondary w-full">
                Switch Camera
              </button>
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
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {!isStreamActive && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              Camera not active
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              Scanning...
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
                className={`p-3 rounded border flex justify-between ${
                  face.spoofed
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
