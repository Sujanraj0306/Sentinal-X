import { useState, useEffect, useRef, useCallback } from 'react';

export default function useWhisper() {
     const [isReady, setIsReady] = useState(false);
     const [isLoading, setIsLoading] = useState(false);
     const [progress, setProgress] = useState(null);
     const [transcript, setTranscript] = useState('');
     const [isRecording, setIsRecording] = useState(false);
     const [isTranscribing, setIsTranscribing] = useState(false);

     const worker = useRef(null);
     const streamRef = useRef(null);
     const mediaRecorderRef = useRef(null);
     const audioChunksRef = useRef([]);

     // Initialize worker
     useEffect(() => {
          if (!worker.current) {
               worker.current = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), { type: 'module' });
          }
          const onMessageReceived = (e) => {
               if (e.data.type === 'ready') {
                    setIsReady(true);
                    setIsLoading(false);
               } else if (e.data.type === 'progress') {
                    setProgress(e.data.data);
               } else if (e.data.type === 'transcription') {
                    setTranscript(e.data.text);
                    setIsTranscribing(false);
               } else if (e.data.type === 'error') {
                    console.error("Whisper Error:", e.data.error);
                    setIsTranscribing(false);
                    setIsLoading(false);
               }
          };
          worker.current.addEventListener('message', onMessageReceived);
          return () => worker.current.removeEventListener('message', onMessageReceived);
     }, []);

     const loadModel = useCallback(() => {
          if (!isReady && !isLoading) {
               setIsLoading(true);
               worker.current.postMessage({ type: 'load' });
          }
     }, [isReady, isLoading]);

     const startRecording = useCallback(async () => {
          if (!isReady) loadModel();
          setTranscript('');

          try {
               const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
               streamRef.current = stream;
               mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
               audioChunksRef.current = [];

               mediaRecorderRef.current.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
               };

               mediaRecorderRef.current.start(100);
               setIsRecording(true);
          } catch (err) {
               console.error("Microphone access denied:", err);
               alert("Microphone access is required.");
          }
     }, [isReady, loadModel]);

     const stopRecording = useCallback(() => {
          return new Promise((resolve) => {
               if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                    resolve('');
                    return;
               }

               mediaRecorderRef.current.onstop = async () => {
                    setIsRecording(false);
                    setIsTranscribing(true);

                    try {
                         const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                         const arrayBuffer = await blob.arrayBuffer();

                         // Fix AudioContext instantiation for standard browsers
                         const AudioContextStr = window.AudioContext || window.webkitAudioContext;
                         const audioContext = new AudioContextStr({ sampleRate: 16000 });
                         const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                         const audioData = audioBuffer.getChannelData(0); // Float32Array at 16kHz

                         worker.current.postMessage({ type: 'transcribe', audio: audioData });
                    } catch (err) {
                         console.error("Audio processing failed", err);
                         setIsTranscribing(false);
                    }

                    // Cleanup
                    if (streamRef.current) {
                         streamRef.current.getTracks().forEach(track => track.stop());
                    }

                    resolve();
               };
               mediaRecorderRef.current.stop();
          });
     }, []);

     return {
          isReady, isLoading, progress, transcript,
          isRecording, isTranscribing,
          loadModel, startRecording, stopRecording,
          setTranscript
     };
}
