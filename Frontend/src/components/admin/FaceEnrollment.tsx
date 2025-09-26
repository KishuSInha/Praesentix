// src/components/FaceEnrollment.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, Check, User, Hash, Loader2 } from 'lucide-react';
// Assuming these are Shadcn UI components, adjust paths if needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const API_BASE_URL = 'http://localhost:5001';

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
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
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
        title: t('enrollment.cameraError'),
        description: t('enrollment.cameraErrorDesc'),
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
      title: t('enrollment.imageCapturedToast'),
      description: `${t('enrollment.imagesCaptured', { count: capturedImages.length + 1 })}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (capturedImages.length < 3) {
      toast({
        title: t('enrollment.moreImagesNeeded'),
        description: t('enrollment.moreImagesNeededDesc'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!studentName || !studentId) {
      toast({
        title: t('enrollment.missingInfo'),
        description: t('enrollment.missingInfoDesc'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('studentName', studentName);
      formData.append('studentId', studentId);
      
      // Add all captured images
      capturedImages.forEach((img, index) => {
        const blob = dataURLtoBlob(img);
        formData.append('images', blob, `image_${index}.jpg`);
      });
      
      const response = await fetch(`${API_BASE_URL}/api/enroll-face`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to enroll student');
      }
      
      // Success
      toast({
        title: t('enrollment.enrollSuccess'),
        description: 'Student enrolled successfully!',
      });
      
      // Reset form
      setStudentName('');
      setStudentId('');
      setCapturedImages([]);
      
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast({
        title: t('enrollment.enrollFailed'),
        description: 'Failed to enroll student. Please try again.',
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
        <h3 className="text-lg font-medium mb-2">{t('enrollment.title')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('enrollment.description')}
        </p>
        <Button onClick={startEnrollment}>
          <Camera className="mr-2 h-4 w-4" />
          {t('enrollment.startButton')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{t('enrollment.header')}</h3>
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
              <p>{t('enrollment.imagesCaptured', { count: capturedImages.length })}</p>
            ) : (
              <p>{t('enrollment.cameraFrameHelper')}</p>
            )}
          </div>
        </div>

        {/* Form and Images Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="studentName">{t('enrollment.studentNameLabel')}</Label>
            </div>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t('enrollment.studentNamePlaceholder')}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="studentId">{t('enrollment.studentIdLabel')}</Label>
            </div>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={t('enrollment.studentIdPlaceholder')}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('enrollment.capturedImagesHeader')}</p>
            {capturedImages.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {/* ... mapping over capturedImages */}
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center text-muted-foreground">
                <p className="text-sm">{t('enrollment.noImagesCaptured')}</p>
              </div>
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
                  {t('enrollment.enrollingButton')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('enrollment.completeButton')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};