// src/components/FaceEnrollment.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, Check, User, Hash, Loader2 } from 'lucide-react';
// Assuming these are Shadcn UI components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const API_BASE_URL = 'http://localhost:5002';

export const FaceEnrollment = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [isEnrolling, setIsEnrolling] = useState(false);
  // ... (rest of the state and refs are the same)
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // The logic for dataURLtoBlob, startCamera, stopCamera, captureImage,
  // and handleSubmit remains the same as the refined version.
  // We'll just show the JSX with the t() function implemented.
  
  // ... (insert all the functions from the previous correct answer here)
  const dataURLtoBlob = (dataUrl: string): Blob => {
    try {
      // Remove data URL prefix if present
      const base64String = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      
      // Decode base64 string
      const byteString = atob(base64String);
      
      // Create array buffer
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      
      // Return blob with JPEG mime type
      return new Blob([uint8Array], { type: 'image/jpeg' });
    } catch (error) {
      console.error('Error converting data URL to blob:', error);
      throw new Error('Failed to process image data');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to data URL and add to captured images
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImages(prev => [...prev, imageDataUrl]);
    
    // Show success toast
    toast({
      title: 'Image Captured',
      description: `${capturedImages.length + 1} image(s) captured successfully`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (capturedImages.length < 3) {
      toast({
        title: 'More Images Needed',
        description: 'Please capture at least 3 images for better accuracy',
        variant: 'destructive',
      });
      return;
    }
    
    if (!studentName || !studentId) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both student name and ID',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Starting enrollment for:', studentName, studentId);
      console.log('Number of images:', capturedImages.length);
      
      const formData = new FormData();
      formData.append('studentName', studentName);
      formData.append('studentId', studentId);
      
      // Add all captured images
      capturedImages.forEach((img, index) => {
        try {
          const blob = dataURLtoBlob(img);
          console.log(`Image ${index + 1} blob size:`, blob.size, 'bytes');
          formData.append('images', blob, `image_${index}.jpg`);
        } catch (error) {
          console.error(`Failed to process image ${index + 1}:`, error);
          throw new Error(`Failed to process image ${index + 1}`);
        }
      });
      
      console.log('Sending enrollment request to:', `${API_BASE_URL}/api/enroll-face`);
      
      const response = await fetch(`${API_BASE_URL}/api/enroll-face`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response data:', result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to enroll student');
      }
      
      // Success
      toast({
        title: 'Enrollment Successful',
        description: result.message || `${studentName} enrolled successfully!`,
      });
      
      // Reset form
      setStudentName('');
      setStudentId('');
      setCapturedImages([]);
      stopCamera();
      setIsEnrolling(false);
      
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Failed to enroll student. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const startEnrollment = () => {
    setCapturedImages([]);
    setStudentName('');
    setStudentId('');
    setIsEnrolling(true);
    startCamera();
  };
  
  const cancelEnrollment = () => {
    stopCamera();
    setIsEnrolling(false);
    onClose(); // Also call onClose when cancelling
  };
  

  if (!isEnrolling) {
    return (
      <div className="text-center p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">Face Enrollment</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Enroll student faces for AI-powered attendance recognition. Capture 3-5 images from different angles.
        </p>
        <Button onClick={startEnrollment}>
          <Camera className="mr-2 h-4 w-4" />
          Start Enrollment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Face Enrollment</h3>
        <Button variant="ghost" size="sm" onClick={cancelEnrollment}>
          <X className="h-4 w-4" />
          <span className="sr-only">{t('enrollment.close')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera and Capture Section */}
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
              width="640"
              height="480"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <Button
                onClick={captureImage}
                disabled={isSubmitting}
                size="lg"
                className="rounded-full h-16 w-16 p-0 bg-red-500 hover:bg-red-600"
              >
                <Camera className="h-8 w-8" />
              </Button>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {capturedImages.length > 0 ? (
              <p className="text-green-600 font-medium">✓ {capturedImages.length} image(s) captured</p>
            ) : (
              <p>Position your face in the frame and click the camera button</p>
            )}
          </div>
        </div>

        {/* Form and Images Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="studentName">Student Name</Label>
            </div>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter student full name"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="studentId">Student ID / Roll Number</Label>
            </div>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter student ID or roll number"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Captured Images ({capturedImages.length}/5)</p>
            {capturedImages.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {capturedImages.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border-2 border-green-500">
                    <img src={img} alt={`Capture ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center text-muted-foreground">
                <p className="text-sm">No images captured yet. Click the camera button to capture.</p>
              </div>
            )}
            {capturedImages.length < 3 && (
              <p className="text-xs text-orange-600">⚠️ Minimum 3 images required (5 recommended for better accuracy)</p>
            )}
          </div>
          
          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || capturedImages.length < 3 || !studentName || !studentId}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Enrollment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};