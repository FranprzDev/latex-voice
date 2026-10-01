# Vibe LaTeX

Dictate math and notes by voice in Obsidian. Speak in Spanish or English —
your words are transcribed and converted into Markdown + LaTeX at the cursor.

> "la integral de a a b de efe de equis de equis" → `$\int_a^b f(x)\,dx$`

## How it works

```
voice → transcription (gpt-transcribe) → LLM conversion → Markdown + LaTeX
```

1. Run **Vibe LaTeX: Start/stop voice dictation** (ribbon icon or hotkey)
2. Speak — e.g. *"sumatoria de i igual a uno hasta n de i al cuadrado"*
3. Run the command again → `$\sum_{i=1}^{n} i^2$` appears at the cursor

## Features

- Dictation in **Spanish and English** (selectable; per-language math
  vocabulary and homophone fixes: "equis"→x, "dee ex"→dx)
- Inline `$...$` and display `$$...$$` math, Markdown prose mixed in
- Configurable transcription & conversion models, plus an editable
  conversion prompt
- Optional: keep audio recordings in your vault
- Provider abstraction: OpenAI by default, any OpenAI-compatible endpoint
  via the Base URL setting

## Setup

1. Install the plugin, enable it
2. Settings → Vibe LaTeX → paste your **OpenAI API key**
3. Optional: assign a hotkey for **Start/stop voice dictation**
   (e.g. `Cmd+Shift+M`)
4. Grant microphone permission when macOS asks

## Requirements & cost

- An OpenAI API key. Dictating a minute of math costs roughly $0.01–0.02.
- Desktop and mobile (any platform with microphone access).

## Development

```bash
npm install
npm run build          # bundle to main.js

npm test               # unit tests
npm run test:e2e       # real API e2e with synthesized speech (needs OPENAI_API_KEY)
npm run test:obsidian  # drives real Obsidian over CDP (Obsidian must not be running)
```

Test audio fixtures are synthesized with macOS `say` — the pipeline is
verified end-to-end without a human speaking.

## Privacy

Audio is sent to the configured provider for transcription. Recordings are
discarded unless "Save audio" is enabled.
