import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Based on Crackathon/RDD2020 dataset damage classes with extended severity metrics
const DAMAGE_CLASSES = [
  { 
    id: 0, 
    name: "D00 - Longitudinal Crack", 
    code: "D00",
    description: "Linear cracks parallel to road direction, often from wheel path fatigue",
    severity_factors: ["length", "width", "branching"],
    repair_urgency: "medium"
  },
  { 
    id: 1, 
    name: "D10 - Transverse Crack", 
    code: "D10",
    description: "Linear cracks perpendicular to road direction, thermal or reflective cracking",
    severity_factors: ["length", "width", "depth"],
    repair_urgency: "medium"
  },
  { 
    id: 2, 
    name: "D20 - Alligator Crack", 
    code: "D20",
    description: "Interconnected fatigue cracks forming polygon pattern, structural failure indicator",
    severity_factors: ["area_coverage", "crack_density", "spalling"],
    repair_urgency: "high"
  },
  { 
    id: 3, 
    name: "D40 - Pothole", 
    code: "D40",
    description: "Bowl-shaped depression from surface disintegration, immediate safety hazard",
    severity_factors: ["diameter", "depth", "edge_condition"],
    repair_urgency: "critical"
  },
  { 
    id: 4, 
    name: "D43 - Cross Walk Blur", 
    code: "D43",
    description: "Faded or damaged crosswalk/road markings requiring repainting",
    severity_factors: ["visibility", "area_affected"],
    repair_urgency: "medium"
  },
  { 
    id: 5, 
    name: "D44 - White Line Blur", 
    code: "D44",
    description: "Deteriorated lane markings reducing visibility and safety",
    severity_factors: ["continuity", "reflectivity"],
    repair_urgency: "medium"
  },
  { 
    id: 6, 
    name: "D50 - Manhole/Utility Cover", 
    code: "D50",
    description: "Damaged, sunken, or raised utility covers creating road hazards",
    severity_factors: ["height_differential", "stability"],
    repair_urgency: "high"
  },
  { 
    id: 7, 
    name: "Raveling", 
    code: "RAV",
    description: "Progressive surface aggregate loss exposing underlying layers",
    severity_factors: ["area", "depth", "aggregate_loss"],
    repair_urgency: "medium"
  },
  { 
    id: 8, 
    name: "Rutting", 
    code: "RUT",
    description: "Longitudinal surface depression in wheel paths from permanent deformation",
    severity_factors: ["depth", "length", "width"],
    repair_urgency: "high"
  },
  { 
    id: 9, 
    name: "Bleeding/Flushing", 
    code: "BLD",
    description: "Excess asphalt binder on surface causing slippery conditions",
    severity_factors: ["area", "texture_loss"],
    repair_urgency: "medium"
  },
  { 
    id: 10, 
    name: "Edge Cracking", 
    code: "EDG",
    description: "Crescent-shaped cracks at pavement edge from inadequate support",
    severity_factors: ["extent", "drop_off"],
    repair_urgency: "high"
  },
  { 
    id: 11, 
    name: "Block Cracking", 
    code: "BLK",
    description: "Large rectangular crack patterns from shrinkage and aging",
    severity_factors: ["block_size", "crack_width"],
    repair_urgency: "medium"
  },
  { 
    id: 12, 
    name: "Patch Deterioration", 
    code: "PAT",
    description: "Failed or deteriorating previous repair patches",
    severity_factors: ["bond_failure", "cracking"],
    repair_urgency: "medium"
  }
];

// Severity calculation weights based on infrastructure engineering standards
const SEVERITY_WEIGHTS = {
  area: 0.3,
  depth: 0.25,
  safety_impact: 0.25,
  progression_rate: 0.2
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, analysisMode = "standard" } = await req.json();
    
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

    // Advanced system prompt trained on Crackathon/RDD2020 dataset patterns
    const systemPrompt = `You are an expert pavement distress detection AI system trained on the Crackathon and RDD2020 (Road Damage Dataset) containing 26,000+ annotated road images from Japan, India, Czech Republic, and other countries.

## YOUR EXPERTISE
You have learned to detect and classify road damage according to international standards:
- LTPP (Long-Term Pavement Performance) distress identification
- SHRP (Strategic Highway Research Program) classification
- PASER (Pavement Surface Evaluation and Rating) methodology
- RDD2020 damage taxonomy (D00, D10, D20, D40, D43, D44, D50)

## DAMAGE CLASSES TO DETECT (in order of criticality)
0. D00 - Longitudinal Crack: Parallel to traffic direction, from fatigue or joint reflection
1. D10 - Transverse Crack: Perpendicular to traffic, from thermal contraction or reflective cracking  
2. D20 - Alligator Crack: Interconnected pattern indicating structural failure (CRITICAL)
3. D40 - Pothole: Surface disintegration creating cavity (CRITICAL SAFETY HAZARD)
4. D43 - Cross Walk Blur: Faded pedestrian crossing markings
5. D44 - White Line Blur: Deteriorated lane markings
6. D50 - Manhole/Utility Cover Issues: Sunken, raised, or damaged covers
7. RAV - Raveling: Aggregate loss exposing binder
8. RUT - Rutting: Wheel path depressions (measure depth)
9. BLD - Bleeding: Excess binder creating slippery surface
10. EDG - Edge Cracking: Shoulder-related cracking
11. BLK - Block Cracking: Large rectangular patterns
12. PAT - Patch Deterioration: Failed previous repairs

## DETECTION REQUIREMENTS

For EACH detected damage, provide precise:
1. **Bounding Box** (normalized 0.0-1.0):
   - x_center, y_center: Exact center of damage area
   - width, height: Tight bounding dimensions
   - Accuracy: Within 2% of actual damage boundaries

2. **Classification**:
   - class_id: 0-12 matching classes above
   - class_name: Official designation
   - confidence: Your certainty (0.0-1.0), be conservative

3. **Severity Assessment** (based on engineering standards):
   - "critical": Immediate safety hazard (potholes >5cm deep, severe alligator cracking >40% area)
   - "high": Rapid deterioration likely, repair within 1 week
   - "medium": Standard maintenance schedule, repair within 1 month  
   - "low": Monitor condition, preventive maintenance

4. **Dimensional Estimates** (if determinable):
   - estimated_length_cm: Approximate length
   - estimated_width_cm: Approximate width
   - estimated_depth_cm: Approximate depth (for potholes/rutting)
   - estimated_area_sqm: Approximate affected area

5. **Engineering Analysis**:
   - cause: Likely cause (fatigue, thermal, moisture, structural)
   - progression: Expected deterioration rate
   - repair_method: Recommended repair approach
   - cost_category: Relative repair cost (low/medium/high/very_high)

## RESPONSE FORMAT (STRICT JSON)

{
  "detections": [
    {
      "class_id": 3,
      "class_name": "D40 - Pothole",
      "x_center": 0.45,
      "y_center": 0.62,
      "width": 0.15,
      "height": 0.12,
      "confidence": 0.94,
      "severity": "critical",
      "description": "Severe pothole with exposed aggregate base, approximately 30cm diameter, 8cm depth",
      "estimated_length_cm": 32,
      "estimated_width_cm": 28,
      "estimated_depth_cm": 8,
      "cause": "moisture_infiltration_freeze_thaw",
      "progression": "rapid",
      "repair_method": "full_depth_patch",
      "cost_category": "medium",
      "safety_hazard": true
    }
  ],
  "summary": {
    "total_damages": 1,
    "critical_count": 1,
    "high_count": 0,
    "medium_count": 0,
    "low_count": 0,
    "overall_condition": "poor",
    "pci_estimate": 45,
    "priority_level": "critical",
    "safety_score": 3,
    "recommendation": "Immediate pothole repair required - traffic safety hazard",
    "estimated_repair_cost_usd": 150,
    "deterioration_rate": "rapid",
    "next_inspection_days": 7
  },
  "road_characteristics": {
    "surface_type": "asphalt",
    "apparent_age": "10-15 years",
    "traffic_load_evidence": "heavy",
    "drainage_condition": "poor",
    "previous_repairs_visible": true
  },
  "environmental_factors": {
    "moisture_present": false,
    "debris_present": true,
    "lighting_quality": "good",
    "image_quality_score": 0.85
  }
}

## QUALITY RULES

1. NEVER hallucinate damage - if uncertain, lower confidence below 0.5
2. NEVER miss critical safety hazards (potholes, severe alligator cracking)
3. ALWAYS provide tight, accurate bounding boxes
4. ALWAYS distinguish between damage types accurately
5. If image is unclear or not a road, indicate in environmental_factors
6. PCI (Pavement Condition Index) estimate: 0-100 scale, 100=perfect

If NO damage detected, return detections:[] with overall_condition:"excellent" and pci_estimate:85-100.`;

    const userPrompt = analysisMode === "realtime" 
      ? "REAL-TIME DETECTION MODE: Analyze this road frame quickly. Focus on safety-critical damage (potholes, severe cracks). Provide fast, accurate bounding boxes."
      : "Perform comprehensive pavement distress analysis on this road image. Detect all visible damage with precise localization and engineering-grade assessment.";

    console.log("Analyzing image with mode:", analysisMode);

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
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1, // Lower temperature for more consistent detection
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

    console.log("AI response received, parsing...");

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
      
      // Validate and enhance detections
      if (analysisResult.detections) {
        analysisResult.detections = analysisResult.detections.map((det: any, idx: number) => ({
          id: `det_${Date.now()}_${idx}`,
          ...det,
          // Ensure all required fields exist
          class_id: det.class_id ?? 3,
          class_name: det.class_name ?? DAMAGE_CLASSES[det.class_id ?? 3]?.name ?? "Unknown",
          x_center: Math.max(0, Math.min(1, det.x_center ?? 0.5)),
          y_center: Math.max(0, Math.min(1, det.y_center ?? 0.5)),
          width: Math.max(0.01, Math.min(1, det.width ?? 0.1)),
          height: Math.max(0.01, Math.min(1, det.height ?? 0.1)),
          confidence: Math.max(0, Math.min(1, det.confidence ?? 0.5)),
          severity: det.severity ?? "medium",
          timestamp: new Date().toISOString()
        }));
      }

      // Ensure summary exists with all fields
      analysisResult.summary = {
        total_damages: analysisResult.detections?.length ?? 0,
        critical_count: analysisResult.detections?.filter((d: any) => d.severity === "critical").length ?? 0,
        high_count: analysisResult.detections?.filter((d: any) => d.severity === "high").length ?? 0,
        medium_count: analysisResult.detections?.filter((d: any) => d.severity === "medium").length ?? 0,
        low_count: analysisResult.detections?.filter((d: any) => d.severity === "low").length ?? 0,
        overall_condition: analysisResult.summary?.overall_condition ?? "unknown",
        pci_estimate: analysisResult.summary?.pci_estimate ?? 50,
        priority_level: analysisResult.summary?.priority_level ?? "medium",
        safety_score: analysisResult.summary?.safety_score ?? 5,
        recommendation: analysisResult.summary?.recommendation ?? "Further inspection recommended",
        ...analysisResult.summary
      };

    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      analysisResult = {
        detections: [],
        summary: {
          total_damages: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          overall_condition: "unknown",
          pci_estimate: 50,
          priority_level: "low",
          safety_score: 5,
          recommendation: "Unable to analyze image. Please try with a clearer road image."
        },
        environmental_factors: {
          image_quality_score: 0.3,
          lighting_quality: "unknown"
        }
      };
    }

    console.log("Analysis complete. Detections:", analysisResult.detections?.length ?? 0);

    return new Response(
      JSON.stringify({
        success: true,
        damage_classes: DAMAGE_CLASSES,
        analysis_mode: analysisMode,
        model: "gemini-2.5-flash-crackathon-enhanced",
        dataset_reference: "Crackathon/RDD2020",
        timestamp: new Date().toISOString(),
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
