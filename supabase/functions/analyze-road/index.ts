import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAMAGE_CLASSES = [
  { id: 0, name: "Longitudinal Crack", description: "Cracks running parallel to the road direction" },
  { id: 1, name: "Transverse Crack", description: "Cracks running perpendicular to the road direction" },
  { id: 2, name: "Alligator Crack", description: "Interconnected cracks forming a pattern like alligator skin" },
  { id: 3, name: "Other Corruption", description: "Other types of road surface damage" },
  { id: 4, name: "Pothole", description: "Bowl-shaped holes in the road surface" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert road damage detection AI system. Analyze the provided road image and detect any damage.

For each detected damage, provide:
1. The damage class (0-4):
   - 0: Longitudinal Crack (cracks parallel to road direction)
   - 1: Transverse Crack (cracks perpendicular to road direction)
   - 2: Alligator Crack (interconnected pattern like alligator skin)
   - 3: Other Corruption (other surface damage)
   - 4: Pothole (bowl-shaped holes)

2. Bounding box coordinates (normalized 0-1):
   - x_center: center x position
   - y_center: center y position
   - width: box width
   - height: box height

3. Confidence score (0-1)

4. Severity level (low, medium, high, critical)

5. Brief description of the damage

Respond ONLY with valid JSON in this exact format:
{
  "detections": [
    {
      "class_id": 0,
      "class_name": "Longitudinal Crack",
      "x_center": 0.5,
      "y_center": 0.5,
      "width": 0.2,
      "height": 0.1,
      "confidence": 0.95,
      "severity": "medium",
      "description": "15cm longitudinal crack along the lane"
    }
  ],
  "summary": {
    "total_damages": 1,
    "overall_condition": "fair",
    "priority_level": "medium",
    "recommendation": "Schedule repair within 2 weeks"
  }
}

If no damage is detected, return:
{
  "detections": [],
  "summary": {
    "total_damages": 0,
    "overall_condition": "good",
    "priority_level": "low",
    "recommendation": "No immediate action required"
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this road image for damage. Provide detailed detection results.",
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from the AI
    let analysisResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Return a default response if parsing fails
      analysisResult = {
        detections: [],
        summary: {
          total_damages: 0,
          overall_condition: "unknown",
          priority_level: "low",
          recommendation: "Unable to analyze image. Please try with a clearer road image."
        }
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        damage_classes: DAMAGE_CLASSES,
        ...analysisResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
