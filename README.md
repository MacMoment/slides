# AI Slideshow Generator

An AI-powered presentation generator that creates stunning Google Slides-compatible presentations using the MegaLLM API with Claude Opus.

## Features

- 🎨 **AI-Generated Content**: Uses Claude Opus to create comprehensive, well-structured presentations
- 📊 **Automatic Charts**: Generates charts with realistic data (bar, line, pie, doughnut)
- 🖼️ **Image Suggestions**: Provides search queries for relevant images
- 📝 **Speaker Notes**: AI-generated speaker notes for each slide
- 🎯 **Multiple Slide Types**: Title, content, comparison, chart, quote, image, conclusion
- 🌈 **Custom Themes**: AI-selected professional color schemes
- 📤 **Export Options**: Export to HTML or follow instructions for Google Slides

## Getting Started

### Prerequisites

- Node.js 18.0 or higher

### Installation

```bash
npm install
```

### Configuration

The application **requires** the API key to be set via environment variable:

```bash
export MEGALLM_API_KEY=your-api-key-here
```

Additional optional configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `MEGALLM_API_KEY` | *required* | Your MegaLLM/Anthropic API key |
| `MEGALLM_MODEL` | `claude-opus-4-5-20251101` | The model to use |
| `MEGALLM_API_URL` | `https://api.anthropic.com/v1/messages` | API endpoint URL |

Example with custom API URL:
```bash
export MEGALLM_API_KEY=your-api-key
export MEGALLM_API_URL=https://your-custom-api.com/v1/chat/completions
npm start
```

### Running the Server

```bash
npm start
```

The server will start on port **6767**. Access it at:
```
http://localhost:6767
```

Or on your VPS:
```
http://your-vps-ip:6767
```

## Usage

1. Open the web interface in your browser
2. Enter your presentation topic (e.g., "The Future of Renewable Energy")
3. Click "Generate Presentation"
4. Wait 30-60 seconds for AI to generate your presentation
5. Navigate through slides using arrows or keyboard
6. Export to HTML or use as reference for Google Slides

## API Endpoints

### Generate Presentation
```
POST /api/generate
Content-Type: application/json

{
  "topic": "Your presentation topic"
}
```

### Health Check
```
GET /api/health
```

## Keyboard Shortcuts

- **←** Previous slide
- **→** Next slide

## Technical Details

- **API**: MegaLLM API
- **Model**: claude-opus-4-5-20251101
- **Port**: 6767
- **Charts**: Chart.js for dynamic graph rendering

## License

MIT
