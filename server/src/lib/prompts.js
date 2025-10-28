export function buildPrompt(userInstruction) {
  const core = `Convert the chart IMAGE into valid Vega-Lite v6 JSON.

OUTPUT: Valid JSON only, starting with { "$schema": "https://vega.github.io/schema/vega-lite/v6.json" }

CRITICAL: Match EXACT appearance - colors (#hex), labels, positions, formats.

STRUCTURE:

**Single View (bars/lines/scatter):**
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "data": {"values": [...]},
  "mark": {"type": "bar"},
  "encoding": {
    "x": {"field": "cat", "type": "nominal"},
    "y": {"field": "val", "type": "quantitative"}
  },
  "width": 520,
  "height": 320
}

**Pie/Donut with External Labels:**
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "width": 520,
  "height": 320,
  "layer": [
    {
      "mark": {"type": "arc", "innerRadius": 0},
      "encoding": {
        "theta": {"field": "value", "type": "quantitative", "stack": true},
        "color": {"field": "cat", "type": "nominal", "scale": {"range": ["#5b9bd5", "#f28e2b"]}}
      }
    },
    {
      "mark": {"type": "text", "fontSize": 14, "align": "left"},
      "data": {
        "values": [
          {"text": "Label text", "x": 280, "y": 100, "fill": "#000"}
        ]
      },
      "encoding": {
        "text": {"field": "text"},
        "x": {"field": "x", "type": "quantitative", "axis": null},
        "y": {"field": "y", "type": "quantitative", "axis": null},
        "fill": {"field": "fill", "type": "nominal", "scale": {"range": ["#000000"]}}
      }
    }
  ]
}

PIE CHART TEXT RULES:
- ALWAYS use separate layer for external labels
- Position text OUTSIDE pie (not on/in slices)
- Use absolute coordinates: x (left: 200-280, right: 350-450), y (50-250)
- Left side labels: x around 250, align left
- Right side labels: x around 400, align right

AXIS FORMATTING:
- Numbers: "axis.format": ",d" (prevents scientific notation)
- Explicit ticks: "axis.values": [100, 200, 300]
- Y-axis: domain [0, max] unless truncated in image

${userInstruction ? `USER INSTRUCTION:\n${userInstruction}\n` : ''}`;
  return core;
}

export function normalizeModelId(name) {
  return String(name || "").replace(/^models\//, "");
}

