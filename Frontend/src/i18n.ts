// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files)
    resources: {
      en: {
        translation: {
          enrollment: {
            // Initial View
            title: "Enroll New Face",
            description: "Capture multiple images of a student's face for facial recognition.",
            startButton: "Start Enrollment",
            // Enrollment View
            header: "Face Enrollment",
            close: "Close",
            cameraFrameHelper: "Position face within the frame and capture at least 3 images",
            imagesCaptured: "{{count}} of 5 images captured",
            studentNameLabel: "Student Name",
            studentNamePlaceholder: "Enter student name",
            studentIdLabel: "Student ID",
            studentIdPlaceholder: "Enter student ID",
            capturedImagesHeader: "Captured Images",
            noImagesCaptured: "No images captured yet",
            completeButton: "Complete Enrollment",
            enrollingButton: "Enrolling...",
            // Toasts / Notifications
            cameraError: "Camera Error",
            cameraErrorDesc: "Could not access the camera. Please check permissions.",
            imageCapturedToast: "Image Captured!",
            moreImagesNeeded: "More Images Needed",
            moreImagesNeededDesc: "Please capture at least 3 images.",
            missingInfo: "Missing Information",
            missingInfoDesc: "Please enter both student name and ID.",
            enrollSuccess: "Success!",
            enrollFailed: "Enrollment Failed",
          }
        }
      }
    },
    lng: 'en', // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    }
  });

export default i18n;