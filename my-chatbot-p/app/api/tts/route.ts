import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';
import fs from 'fs/promises';

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
    // Await the stat check. This will throw an error if the file doesn't exist.
    await fs.stat(keyFilePath);
    return { keyFilename: keyFilePath };
  } catch (error) {
    // If fs.stat throws, the file doesn't exist. We'll let the function
    // continue to the final error throw at the end.
  }

  throw new Error('Google Cloud credentials not found. Please set GOOGLE_CREDENTIALS_BASE64 environment variable or add the key file to your project root.');
}


// This is the correct syntax for an API Route in the Next.js App Router
export async function POST(request: Request) {
  try {
    // Use the helper function to get credentials dynamically
    const client = new TextToSpeechClient(await getGoogleCredentials());

    // Get both text and language from the request body
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json({ message: 'Text is required' }, { status: 400 });
    }

    // Determine the voice based on the language parameter from the frontend
    const voiceConfig = language === 'es-US' 
      ? { languageCode: 'es-US', name: 'es-US-Standard-A' } // A standard Spanish voice
      : { languageCode: 'en-US', name: 'en-US-Standard-C' }; // A standard English voice

    const ttsRequest = {
      input: { text: text },
      voice: voiceConfig,
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await client.synthesizeSpeech(ttsRequest);
    
    const audioContent = (response.audioContent as Buffer).toString('base64');

    return NextResponse.json({ audioContent });

  } catch (error) {
    console.error('ERROR in /api/tts:', error);
    return NextResponse.json({ message: 'Failed to synthesize speech.' }, { status: 500 });
  }
}
