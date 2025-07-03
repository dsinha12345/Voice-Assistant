import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const apiUrl = "https://api.langflow.astra.datastax.com/lf/d3284e5a-177f-4180-96ef-e0c951532254/api/v1/run/1640c2e6-d445-4638-a95a-5ad52035e5c4";
  const payload = {
    input_value: message,
    output_type: "chat",
    input_type: "chat",
  };

  const token = process.env.ASTRA_TOKEN;
  if (!token) {
    return NextResponse.json({ reply: "Server misconfiguration: missing token." }, { status: 500 });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

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
    return NextResponse.json({ reply: "Langflow API error or timeout." }, { status: 500 });
  }
}
