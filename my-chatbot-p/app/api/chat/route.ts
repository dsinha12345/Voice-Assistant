import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // Call your external API here
  const apiUrl = "https://api.langflow.astra.datastax.com/lf/d3284e5a-177f-4180-96ef-e0c951532254/api/v1/run/1640c2e6-d445-4638-a95a-5ad52035e5c4";
  const payload = {
    input_value: message,
    output_type: "chat",
    input_type: "chat",
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.ASTRA_TOKEN}`,
  };

  try {
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const apiData = await apiRes.json();

    const reply =
      apiData?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
      "No response from API.";

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ reply: "API error." }, { status: 500 });
  }
}