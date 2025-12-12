# Wellness & Vodka Tracker

A simple, beautiful app for tracking your daily wellness metrics and vodka consumption. Because balance is everything.

## Features

### Wellness Tracking
- **Mood** - Track how you're feeling (1-5 scale with emojis)
- **Energy** - Monitor your energy levels throughout the day
- **Sleep** - Log hours of sleep
- **Water** - Count glasses of water consumed
- **Exercise** - Track minutes of physical activity

### Vodka Tracking
- **Shots/Drinks** - Count your drinks
- **Type/Brand** - Note what you're drinking
- **Mixer** - Track how you take it (neat, ice, tonic, soda, juice)

### Citrus (Bonus!)
- Track citrus intake (lemon, lime, orange, grapefruit)
- Log vitamin C supplements
- Balance your vodka with some healthy citrus!

### Stats & Insights
- View averages over 7 days, 30 days, or all time
- Get personalized insights based on your patterns
- Discover correlations between wellness and consumption

## Tech Stack

- **Vanilla HTML/CSS/JS** - No frameworks, just the essentials
- **LocalStorage** - Data stored in your browser
- **Mobile-first design** - Works great on phones
- **Dark mode** - Easy on the eyes

## Deployment (Coolify)

This app is designed for easy deployment on [Coolify](https://coolify.io/).

### Option 1: Dockerfile (Recommended)

1. Connect your repo to Coolify
2. Select "Docker" as the build method
3. Deploy!

### Option 2: Static Site

1. In Coolify, create a new "Static" resource
2. Set the publish directory to `.` (root)
3. Deploy!

### Option 3: Nixpacks

1. Coolify auto-detects `nixpacks.toml`
2. Just deploy!

## Local Development

Simply open `index.html` in your browser. No server required!

Or use a local server:

```bash
# Python
python -m http.server 8080

# Node
npx serve .

# PHP
php -S localhost:8080
```

## Docker (Local)

```bash
# Build
docker build -t wellness-vodka .

# Run
docker run -p 8080:80 wellness-vodka
```

Then open http://localhost:8080

## Data Privacy

All data is stored locally in your browser's localStorage. Nothing is sent to any server. Your wellness and vodka habits are your business!

## License

MIT - Do whatever you want with it. Drink responsibly.

---

*Made with balance in mind*
