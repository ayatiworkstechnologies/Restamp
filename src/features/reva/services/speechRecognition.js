// Safe loader for expo-speech-recognition. The native module is missing in
// Expo Go, where requiring it throws; fall back to a no-op so the app runs
// and the mic just reports "voice unavailable".
let SpeechModule = null;
let useSpeechEvent = () => {};

try {
  const lib = require("expo-speech-recognition");
  SpeechModule = lib.ExpoSpeechRecognitionModule;
  useSpeechEvent = lib.useSpeechRecognitionEvent;
} catch {
  SpeechModule = null;
}

export { SpeechModule, useSpeechEvent };
export const speechAvailable = () => {
  try {
    return !!SpeechModule && SpeechModule.isRecognitionAvailable();
  } catch {
    return false;
  }
};
