# PinchTab Setup (Optional Fallback)

PinchTab is an optional fallback browser automation tool that will be used if Playwright fails.

## Installation

### Option 1: Using npm (if available)
```bash
npm install -g pinchtab
```

### Option 2: Using the installer script
```bash
curl -fsSL https://pinchtab.com/install.sh | sh
```

### Option 3: Download binary
Visit https://pinchtab.com/ and download the binary for your platform.

### Option 4: Using Docker
```bash
docker run -d -p 9867:9867 pinchtab/pinchtab
```

## Running PinchTab

Start the PinchTab server:
```bash
pinchtab
```

The server will run on `http://localhost:9867` by default.

## Usage

The logo scraper will automatically use PinchTab as a fallback if:
1. Playwright fails to fetch a page
2. PinchTab server is running on `http://localhost:9867`

## Benefits

- **Stealth mode**: Better bot detection bypass
- **Lightweight**: 12MB binary vs Playwright's larger footprint
- **Persistent sessions**: Can maintain login state
- **Token efficient**: Optimized for AI agents (though not critical for our use case)

## Configuration

You can change the PinchTab URL by setting an environment variable:
```bash
export PINCHTAB_URL=http://localhost:9867
```

Or modify the `pinchtabUrl` option in the code.

## Notes

- PinchTab is **optional** - the scraper works fine with just Playwright
- PinchTab only activates as a fallback if Playwright fails
- If PinchTab is not running, the scraper will continue with Playwright and HTTP fallbacks
