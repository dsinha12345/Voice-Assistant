// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   const { message } = await req.json();

//   const apiUrl = "https://api.langflow.astra.datastax.com/lf/d3284e5a-177f-4180-96ef-e0c951532254/api/v1/run/1640c2e6-d445-4638-a95a-5ad52035e5c4";
//   const payload = {
//     input_value: message,
//     output_type: "chat",
//     input_type: "chat",
//   };

//   const token = process.env.ASTRA_TOKEN;
//   if (!token) {
//     return NextResponse.json({ reply: "Server misconfiguration: missing token." }, { status: 500 });
//   }

//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };

//   try {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 120000); // 20 seconds timeout

//     const apiRes = await fetch(apiUrl, {
//       method: "POST",
//       headers,
//       body: JSON.stringify(payload),
//       signal: controller.signal,
//     });

//     clearTimeout(timeout);

//     if (!apiRes.ok) {
//       const err = await apiRes.text();
//       throw new Error(`Langflow error: ${apiRes.status} - ${err}`);
//     }

//     const apiData = await apiRes.json();
//     const reply =
//       apiData?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
//       "No response from API.";

//     return NextResponse.json({ reply });
//   } catch (e: any) {
//     console.error("Langflow API error:", e?.message || e);
//     return NextResponse.json({ reply: "Langflow API error or timeout." }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // --- Step 1: Get API Keys from Environment Variables ---
  const ASTRA_TOKEN = process.env.ASTRA_TOKEN;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!ASTRA_TOKEN || !OPENROUTER_API_KEY) {
    console.error("Missing ASTRA_TOKEN or OPENROUTER_API_KEY in .env.local");
    return NextResponse.json({ reply: "Server misconfiguration: missing API keys." }, { status: 500 });
  }

  // --- Step 2: Get the current date to pass to the prompt ---
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // --- Step 3: Construct the Tweaks Object for your new flow ---
  const tweaks = {
    "OpenRouterComponent-0v9xU": {
      "api_key": OPENROUTER_API_KEY,
    },
    "ChatInput-6ANsL": {
      "input_value": message,
    },
    "Prompt-3I9a1": {
        "current_date": currentDate,
    }
  };

  // --- Step 4: Construct the Full Payload with Tweaks ---
  const apiUrl = "https://api.langflow.astra.datastax.com/lf/d3284e5a-177f-4180-96ef-e0c951532254/api/v1/run/1640c2e6-d445-4638-a95a-5ad52035e5c4";
  
  // *** THE FIX IS HERE ***
  // We have removed the top-level `input_value` to avoid conflict with the tweak.
  const payload = {
    output_type: "chat",
    input_type: "chat",
    tweaks: tweaks,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ASTRA_TOKEN}`,
  };

  try {
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      throw new Error(`Langflow error: ${apiRes.status} - ${err}`);
    }

    const apiData = await apiRes.json();
    const reply =
      apiData?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
      "No response from API.";

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("Langflow API error:", e?.message || e);
    return NextResponse.json({ reply: "Langflow API error." }, { status: 500 });
  }
}
