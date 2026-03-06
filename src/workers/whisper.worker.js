import { pipeline, env } from '@xenova/transformers';

// Skip local checks in browser, use Xenova cache
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
     static task = 'automatic-speech-recognition';
     static model = 'Xenova/whisper-tiny.en';
     static instance = null;

     static async getInstance(progress_callback = null) {
          if (this.instance === null) {
               this.instance = await pipeline(this.task, this.model, { progress_callback });
          }
          return this.instance;
     }
}

self.addEventListener('message', async (event) => {
     if (event.data.type === 'load') {
          try {
               await PipelineSingleton.getInstance((x) => {
                    self.postMessage({ type: 'progress', data: x });
               });
               self.postMessage({ type: 'ready' });
          } catch (e) {
               self.postMessage({ type: 'error', error: e.message });
          }
     } else if (event.data.type === 'transcribe') {
          try {
               const transcriber = await PipelineSingleton.getInstance();
               const result = await transcriber(event.data.audio);
               self.postMessage({ type: 'transcription', text: result.text });
          } catch (e) {
               self.postMessage({ type: 'error', error: e.message });
          }
     }
});
