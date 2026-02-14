import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { livenessDetector } from '../lib/liveness';
import { CheckCircle2, AlertCircle, RefreshCcw, ShieldCheck, Camera, UserCheck } from 'lucide-react';

interface LivenessScannerProps {
    onSuccess: (images: string[]) => void;
    onFailure: (reason: string) => void;
    studentId?: string;
    mode?: 'single' | 'classroom';
}

export const LivenessScanner: React.FC<LivenessScannerProps> = ({ onSuccess, onFailure, studentId, mode = 'single' }) => {
    const webcamRef = useRef<Webcam>(null);
    const [step, setStep] = useState<'initializing' | 'idle' | 'blink' | 'turn' | 'verifying' | 'success' | 'countdown' | 'capturing'>('initializing');
    const [progress, setProgress] = useState(0);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [trustScore, setTrustScore] = useState(100);

    useEffect(() => {
        const init = async () => {
            try {
                await livenessDetector.initialize();
                setStep('idle');
            } catch (err) {
                onFailure("Failed to initialize camera");
            }
        };
        init();
    }, [onFailure]);

    const captureFrame = useCallback(() => {
        if (webcamRef.current) {
            const screenshot = webcamRef.current.getScreenshot();
            if (screenshot) {
                const base64Content = screenshot.includes(',') ? screenshot.split(',')[1] : screenshot;
                setCapturedImages(prev => [...prev, base64Content]);
                return base64Content;
            }
        }
        return null;
    }, []);

    const startClassroomCapture = () => {
        setStep('countdown');
        setProgress(0);
        let count = 0;
        const interval = setInterval(async () => {
            count += 4;
            setProgress(count);
            if (count >= 100) {
                clearInterval(interval);
                setStep('capturing');

                // Capture burst of 3 frames for liveness detection
                const frames: string[] = [];
                for (let i = 0; i < 3; i++) {
                    const img = captureFrame();
                    if (img) frames.push(img);
                    if (i < 2) await new Promise(r => setTimeout(r, 150)); // 150ms delay between burst frames
                }

                if (frames.length > 0) {
                    onSuccess(frames);
                    setStep('success');
                } else {
                    onFailure("Capture failed");
                }
            }
        }, 100);
    };

    useEffect(() => {
        let animationFrameId: number;
        const checkLiveness = async () => {
            const video = webcamRef.current?.video;

            // Comprehensive readiness check: Does it exist, is it playing, does it have dimensions?
            const isVideoReady = video &&
                video.readyState >= 2 &&
                video.videoWidth > 0 &&
                video.videoHeight > 0;

            if (step === 'initializing' || step === 'success' || step === 'countdown' || step === 'capturing' || !isVideoReady) {
                if (step !== 'success' && step !== 'capturing') {
                    animationFrameId = requestAnimationFrame(checkLiveness);
                }
                return;
            }

            if (mode === 'classroom') {
                if (step === 'idle') {
                    startClassroomCapture();
                }
                return;
            }

            try {
                const results = await livenessDetector.processFrame(video!);

                if (results) {
                    if (step === 'idle') {
                        if (results.faceLandmarks?.length > 0) {
                            setStep('blink');
                            captureFrame();
                        }
                    } else if (step === 'blink') {
                        if (livenessDetector.detectBlink(results)) {
                            setProgress(p => Math.min(100, p + 20));
                            if (progress >= 100) {
                                setStep('turn');
                                setProgress(0);
                                captureFrame();
                            }
                        }
                    } else if (step === 'turn') {
                        const turn = livenessDetector.detectHeadTurn(results);
                        if (turn !== 'center') {
                            setProgress(p => Math.min(100, p + 10));
                            if (progress >= 100) {
                                setStep('verifying');
                                captureFrame();
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Liveness processing error:", err);
                // Don't crash the whole app, just retry next frame
            }

            animationFrameId = requestAnimationFrame(checkLiveness);
        };

        checkLiveness();
        return () => cancelAnimationFrame(animationFrameId);
    }, [step, progress, captureFrame]);

    useEffect(() => {
        if (step === 'verifying') {
            onSuccess(capturedImages);
            setStep('success');
        }
    }, [step, capturedImages, onSuccess]);

    return (
        <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-white border border-slate-100 shadow-2xl">
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="absolute inset-0 w-full h-full object-cover"
                videoConstraints={{ facingMode: "user", width: 720, height: 960 }}
            />

            {/* Scanning Frame (Simplified) */}
            <div className="absolute inset-10 rounded-[2rem] border-2 border-white/20 pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-[#C4F582]/50 absolute top-1/2 -translate-y-1/2 animate-scan shadow-[0_0_20px_#C4F582]" />
            </div>

            {/* Bottom Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

            {/* Status Indicators */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C4F582]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Security Scan Active</span>
                </div>
            </div>

            {/* Progress Pill */}
            <div className="absolute top-0 inset-x-0 h-1 z-20 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-[#C4F582]"
                />
            </div>

            <div className="absolute inset-x-0 bottom-12 px-8 flex flex-col items-center text-center z-20">
                <AnimatePresence mode="wait">
                    {step === 'initializing' && (
                        <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                            <RefreshCcw className="w-8 h-8 animate-spin text-white/40" />
                            <p className="label-caps-accent">Verifying Camera...</p>
                        </motion.div>
                    )}

                    {(step === 'idle' || step === 'blink') && (
                        <motion.div key="blink" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="space-y-3">
                            <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">Verify Identity</h3>
                            <p className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C4F582] text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full">
                                Action: Blink Twice
                            </p>
                        </motion.div>
                    )}

                    {step === 'turn' && (
                        <motion.div key="turn" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="space-y-3">
                            <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">Liveness Check</h3>
                            <p className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full">
                                Action: Turn Head
                            </p>
                        </motion.div>
                    )}

                    {step === 'countdown' && (
                        <motion.div key="countdown" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <h3 className="text-4xl font-black text-white leading-tight uppercase tracking-tight animate-pulse">Classroom Capture</h3>
                            <div className="flex flex-col items-center gap-2">
                                <p className="inline-flex items-center gap-2 px-6 py-2 bg-[#C4F582] text-slate-950 text-xs font-black uppercase tracking-widest rounded-full">
                                    Hold Steady: Scanning Group
                                </p>
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Resolution: Ultra-High Optimizer On</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'capturing' && (
                        <motion.div key="capturing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                            <RefreshCcw className="w-12 h-12 animate-spin text-[#C4F582]" />
                            <p className="label-caps-accent">Processing Group Data...</p>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center space-y-4">
                            <div className="bg-[#C4F582] w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-[#C4F582]/20 border-4 border-white/20">
                                <UserCheck className="w-8 h-8 text-slate-950" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Identity Verified</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#C4F582]">Success: Record Logged</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
