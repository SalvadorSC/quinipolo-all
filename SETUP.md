# Quinipolo - Setup Guide

This guide will help you set up the Quinipolo project for local development.

## Project Structure

```
quinipolo-all/
├── quinipolo-fe/     # React frontend application
└── quinipolo-be/     # Node.js/Express backend API
```

## Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn**
- **Supabase** account and project
- **Stripe** account (for payment processing)
- **GitHub** personal access token (for private packages)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd quinipolo-all
```

### 2. GitHub NPM Token Setup (Required)

The project uses a private GitHub package (`@salvadorsc/quinipolo-shared`). Create a GitHub Personal Access Token:

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Quinipolo NPM")
4. Select the **`read:packages`** scope
5. Generate and copy the token
6. Add to your shell profile:
   ```bash
   echo 'export NPM_TOKEN=your_github_token_here' >> ~/.zshrc
   source ~/.zshrc
   ```

### 3. Backend Setup

```bash
cd quinipolo-be

# Create environment file
cp .env.example .env

# Edit .env and fill in your configuration
# See quinipolo-be/README.md for detailed explanation

# Install dependencies
npm install

# Start the backend server
npm start
```

The backend will run on `http://localhost:3000`

### 4. Frontend Setup

```bash
cd quinipolo-fe

# Create environment file
cp .env.example .env

# Edit .env and fill in your configuration
# Minimum required:
# - REACT_APP_SUPABASE_URL
# - REACT_APP_SUPABASE_ANON_KEY
# - NPM_TOKEN (if not set globally)

# Install dependencies
npm install

# Start the frontend
npm start
```

The frontend will run on `http://localhost:3001`

## Environment Configuration

### Backend (quinipolo-be/.env)

Required environment variables:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Stripe
REACT_APP_ENV=development
STRIPE_SECRET_KEY_TEST=your_stripe_test_secret_key
STRIPE_SECRET_KEY=your_stripe_live_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_MANAGED_LEAGUE_PRICE_ID=your_managed_league_price_id
STRIPE_SELF_MANAGED_LEAGUE_PRICE_ID=your_self_managed_league_price_id

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Optional
GLOBAL_LEAGUE_ID=your_global_league_id
SCRAPER_USE_RFEN=false
```

### Frontend (quinipolo-fe/.env)

Required environment variables:

```env
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub NPM Token (if not set globally in shell)
NPM_TOKEN=your_github_personal_access_token
```

## Getting Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `SUPABASE_URL` / `REACT_APP_SUPABASE_URL`
   - **anon public** key → `REACT_APP_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (backend only, keep secret!)

## Common Issues

### TypeScript Version Conflict

The frontend uses react-scripts 5.0.1 which requires TypeScript 4.9.5 (not 5.x). This is already configured in `package.json`.

If you see peer dependency errors:

```bash
npm install --legacy-peer-deps
```

### NPM Authentication Error

If you see `401 Unauthorized` for `@salvadorsc/quinipolo-shared`:

- Ensure `NPM_TOKEN` is set in your environment
- Verify the token has `read:packages` scope
- Check that `.npmrc` file exists in quinipolo-fe with:
  ```
  @salvadorsc:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
  ```

### Supabase Connection Error

If the backend crashes with "supabaseUrl is required":

- Ensure `.env` file exists in `quinipolo-be/`
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
- Check that `dotenv` is loading correctly (first line of `app.js`)

## Development Workflow

1. Start backend: `cd quinipolo-be && npm start`
2. Start frontend: `cd quinipolo-fe && npm start`
3. Access the app at `http://localhost:3001`
4. Backend API available at `http://localhost:3000`

## Additional Resources

- [Frontend README](quinipolo-fe/README.md)
- [Backend README](quinipolo-be/README.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
