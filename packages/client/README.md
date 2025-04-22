# BioDAO CoreAgent Plugin

An Eliza plugin that provides a guided onboarding experience for creating a Decentralized Science (DeSci) project and BioDAO.

## Features

- **Agent-First Interaction**: All platform actions are mediated through the chat UI
- **NFT Minting**: Guide users through minting Idea and Vision NFTs
- **Discord Integration**: Help users create and grow their Discord community
- **Level System**: Progressive onboarding process with clear requirements

## Level System

The plugin implements a 4-level progression system:

1. **Level 1: App Started**

   - Requirements: Wallet Connected
   - Actions: Mint Idea and Vision NFTs

2. **Level 2: Science NFTs Minted**

   - Requirements: Discord Server Created, 4+ Discord Members
   - Actions: Setup a Discord server and add members

3. **Level 3: Community Initiated**

   - Requirements: 10+ Discord Members, 25+ Papers Shared, 100+ Messages
   - Actions: Grow community and share scientific content

4. **Level 4: Community Growth + Proof**
   - Actions: Complete sandbox guide and schedule team call

## Integration with Portal API

This plugin connects to the BioDAO Portal API via WebSocket to:

- Authenticate users
- Process NFT minting requests
- Monitor Discord server statistics
- Track user progress through levels
- Send/receive chat messages with the CoreAgent

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev:client

# Build for production
npm run build
```

## Configuration

The plugin requires the following environment variables:

- `NEXT_PUBLIC_WS_URL`: WebSocket URL for the Portal API (defaults to `ws://localhost:3001`)
- `NEXT_PUBLIC_API_URL`: HTTP URL for the Portal API (defaults to `http://localhost:3001`)

## License

Proprietary - All rights reserved.

# BioDAO Portal Client

This is the client-side application for the BioDAO Portal, built with React, TypeScript, and Vite.

## Database Structure

The application uses Supabase for database storage and authentication. Key tables include:

### Profiles Table

The `profiles` table stores user profile information including:

- Basic user information (user_id, privy_id, email)
- Project details (name, description, vision)
- Scientific references and credentials
- Team information and progress

### User Levels

The `user_levels` table tracks user progression within the platform.

### NFT Metadata

The `nft_metadata` table stores information about NFTs minted by users.

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Database Setup

The database schema can be set up using the scripts in the `scripts` directory:

```bash
# Setup the database tables and security policies
npm run setup-db
```

This will create the necessary tables, indexes, and security policies in your Supabase instance.

## Authentication

The application uses Privy for authentication, with Supabase as the backend user store. When a user authenticates via Privy, a corresponding user is created in Supabase.

## Discord API Interaction (Backend)

To verify a Discord server and fetch member counts, the backend server needs to make a direct, authenticated request to the official Discord API.

**Note:** This interaction **must** happen on the backend server. Your Discord Bot Token should _never_ be exposed in the frontend client code.

**Endpoint:** `GET /guilds/{serverId}`

**Query Parameters:**

- `with_counts=true`: Include approximate member counts in the response.

**Headers:**

- `Authorization: Bot <YOUR_DISCORD_BOT_TOKEN>`: Authenticate the request using your bot token (stored securely on the backend).
- `User-Agent: YourBotName (YourProjectWebsite, v1.0)`: Recommended by Discord.

**Example Request (using fetch in Node.js):**

```javascript
const serverId = '...'; // The server ID from the frontend
const botToken = process.env.DISCORD_BOT_TOKEN; // Securely loaded from backend environment

const url = `https://discord.com/api/v10/guilds/${serverId}?with_counts=true`;

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${botToken}`,
      'User-Agent': 'BioDAOIntegrationBot (BioDAO Portal, v1.0)',
    },
  });

  if (response.ok) {
    const data = await response.json();
    const serverName = data.name;
    const memberCount = data.approximate_member_count;
    // Link serverId, serverName, memberCount to user in database
    // Send { success: true, server: { id, name, memberCount } } to frontend
  } else {
    // Handle errors (404: Not Found, 403: Missing Permissions, etc.)
    // Send { success: false, error: '...' } to frontend
  }
} catch (error) {
  // Handle network errors
  // Send { success: false, error: '...' } to frontend
}
```

**Expected Success Response Body (JSON):**

```json
{
  "id": "YOUR_SERVER_ID",
  "name": "Your Server Name",
  "icon": "...",
  // ... other guild fields
  "approximate_member_count": 123,
  "approximate_presence_count": 45
}
```

Refer to the official [Discord API Documentation](https://discord.com/developers/docs/resources/guild#get-guild) for more details.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react';

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
});
```
