---
name: image-gen
description: Image generation using Gemini 2.0 Flash (Nano Banana 2) for creating brand assets, marketing visuals, and UI illustrations.
---

# Image Generation Skill

Generate images using the Gemini 2.0 Flash model (Nano Banana 2) for HiGantic's creative needs.

## Prerequisites

- `GEMINI_API_KEY` must be configured. If not available, escalate to the board via COLDBOT.

## Prompt Engineering Guidelines

### Structure

A good image generation prompt has these components in order:

1. **Subject:** What is in the image
2. **Style:** Visual style (flat design, 3D render, isometric, minimalist, photorealistic)
3. **Composition:** Layout, aspect ratio, focal point
4. **Colors:** Specific palette or color direction
5. **Mood:** Professional, playful, futuristic, clean, bold
6. **Technical:** Resolution, format, background (transparent, solid, gradient)

### Example Prompts

**Hero Image:**
```
A modern SaaS dashboard interface showing an AI agent builder, dark theme with deep navy background (#1a1a2e), electric blue accent (#4361ee), showing a conversational agent configuration panel with tool icons in a left sidebar, clean minimalist flat design, 16:9 aspect ratio, professional and futuristic mood
```

**Icon Set:**
```
Set of 6 minimal line icons for AI agent tools: memory, email, calendar, search, automation, webhook. Consistent 2px stroke weight, rounded corners, single color (#4361ee) on transparent background, 64x64px each, modern flat style
```

**Marketing Illustration:**
```
Isometric illustration of AI agents collaborating in a digital workspace, soft pastel colors with blue and purple accents, floating UI cards and chat bubbles, clean white background, friendly and approachable tech aesthetic, suitable for a landing page hero section
```

## Best Practices

- Save successful prompts in your TOOLS.md for reuse
- When iterating, change one variable at a time (color, style, composition)
- Always specify the intended use case — web hero, social media, icon, etc.
- Include brand colors once the palette is defined
