import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class LivenessDetector {
    private landmarker: FaceLandmarker | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
        });

        this.isInitialized = true;
    }

    detectBlink(results: any): boolean {
        if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) return false;

        // index 9 is eyeBlinkLeft, 10 is eyeBlinkRight
        const shapes = results.faceBlendshapes[0].categories;
        const leftBlink = shapes.find((s: any) => s.categoryName === "eyeBlinkLeft")?.score || 0;
        const rightBlink = shapes.find((s: any) => s.categoryName === "eyeBlinkRight")?.score || 0;

        return leftBlink > 0.4 && rightBlink > 0.4;
    }

    detectHeadTurn(results: any): "left" | "right" | "center" {
        if (!results.faceLandmarks || results.faceLandmarks.length === 0) return "center";

        const landmarks = results.faceLandmarks[0];
        const nose = landmarks[1]; // Center of nose
        const leftSide = landmarks[234]; // Left ear/cheek
        const rightSide = landmarks[454]; // Right ear/cheek

        // Simple ratio based detection
        const distLeft = Math.abs(nose.x - leftSide.x);
        const distRight = Math.abs(nose.x - rightSide.x);

        if (distLeft / distRight > 1.8) return "right";
        if (distRight / distLeft > 1.8) return "left";
        return "center";
    }

    detectDrowsiness(results: any): boolean {
        if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) return false;
        const shapes = results.faceBlendshapes[0].categories;
        const eyeLookDown = shapes.find((s: any) => s.categoryName === "eyeLookDownLeft")?.score || 0;
        // Sustained high value usually indicates looking down or closed eyes
        return eyeLookDown > 0.2;
    }

    async processFrame(videoElement: HTMLVideoElement) {
        if (!this.landmarker) return null;
        return this.landmarker.detectForVideo(videoElement, performance.now());
    }
}

export const livenessDetector = new LivenessDetector();
