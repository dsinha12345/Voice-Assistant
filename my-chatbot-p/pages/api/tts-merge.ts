import type { NextApiRequest, NextApiResponse } from 'next';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set the path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * A helper function to get Google Cloud credentials.
 * It reads from the Vercel environment variable in production,
 * and falls back to a local file for local development.
 */
async function getGoogleCredentials() {
  // Check if the environment variable is set (for Vercel deployment)
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    // Decode the base64 string to a standard JSON string
    const credentialsJson = Buffer.from(
      process.env.GOOGLE_CREDENTIALS_BASE64,
      'base64'
    ).toString('utf-8');
    // Parse the JSON string into an object
    const credentials = JSON.parse(credentialsJson);
    return { credentials };
  }
  
  // Fallback for local development (reads the file)
  const keyFilePath = path.join(process.cwd(), 'gen-lang-client-0041438265-36302a4ebf82.json');
  try {
    // CORRECTED: Await the stat check. This will throw an error if the file doesn't exist.
    await fs.stat(keyFilePath);
    return { keyFilename: keyFilePath };
  } catch (error) {
    // If fs.stat throws, the file doesn't exist. We'll let the function
    // continue to the final error throw at the end.
  }

  throw new Error('Google Cloud credentials not found. Please set GOOGLE_CREDENTIALS_BASE64 environment variable or add the key file to your project root.');
}


/**
 * A helper function to generate a single audio buffer from Google TTS.
 */
async function generateSpeech(text: string, language: 'en-US' | 'es-US'): Promise<Buffer> {
  // CORRECTED: Added 'await' to handle the async getGoogleCredentials function
  const client = new TextToSpeechClient(await getGoogleCredentials());

  const voiceConfig = language === 'es-US'
    ? { languageCode: 'es-US', name: 'es-US-Standard-A' }
    : { languageCode: 'en-US', name: 'en-US-Standard-C' };

  const request = {
    input: { text },
    voice: voiceConfig,
    audioConfig: { audioEncoding: 'MP3' as const },
  };

  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent as Buffer;
}


// The main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const tempFilePaths: string[] = [];

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const englishMatch = text.match(/English:\s*"([^"]*)"/);
    const spanishMatch = text.match(/Spanish:\s*"([^"]*)"/);

    if (!englishMatch || !spanishMatch) {
      return res.status(400).json({ message: 'Bilingual text format not found' });
    }

    const [englishAudio, spanishAudio] = await Promise.all([
      generateSpeech(englishMatch[1], 'en-US'),
      generateSpeech(spanishMatch[1], 'es-US'),
    ]);

    const tempDir = os.tmpdir();
    const englishFilePath = path.join(tempDir, `english_${Date.now()}.mp3`);
    const spanishFilePath = path.join(tempDir, `spanish_${Date.now()}.mp3`);
    const mergedFilePath = path.join(tempDir, `merged_${Date.now()}.mp3`);
    const listFilePath = path.join(tempDir, `list_${Date.now()}.txt`);
    
    tempFilePaths.push(englishFilePath, spanishFilePath, mergedFilePath, listFilePath);

    await fs.writeFile(englishFilePath, englishAudio);
    await fs.writeFile(spanishFilePath, spanishAudio);

    const fileList = `file '${englishFilePath.replace(/\\/g, '/')}'\nfile '${spanishFilePath.replace(/\\/g, '/')}'`;
    await fs.writeFile(listFilePath, fileList);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions('-c copy')
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(mergedFilePath);
    });

    const mergedAudioBuffer = await fs.readFile(mergedFilePath);
    const audioContent = mergedAudioBuffer.toString('base64');

    return res.status(200).json({ audioContent });

  } catch (error) {
    console.error('ERROR in /api/tts-merge:', error);
    return res.status(500).json({ message: 'Failed to merge audio files.' });
  } finally {
    for (const filePath of tempFilePaths) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        // Suppress errors
      }
    }
  }
}
