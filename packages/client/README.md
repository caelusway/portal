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

## 🧬 What is Portal?

Portal is an AI-powered platform designed to help scientists and researchers launch their own Decentralized Science (DeSci) communities called BioDAOs. Through a guided level onboarding process, Portal helps you build a credible scientific community with verified members, social presence, and clear governance structure.

## 🤖 Meet CoreAgent

CoreAgent is your personal AI assistant that guides you through every step of the BioDAO creation process. Unlike traditional platforms where you have to figure things out yourself, CoreAgent:

- **Takes direct action** Instead of asking "Would you like me to...?", CoreAgent says "I'll do this now" and handles tasks for you
- **Provides real-time guidance** Offers specific, actionable advice based on your current progress
- **Tracks your metrics** Automatically monitors your Discord activity, Twitter engagement, and community growth
- **Ensures integrity** All metrics are earned through real activity, not manual updates

## 📊 The Level Guided Journey

Portal guides you through a structured 7-level process to build your BioDAO. Each level builds on the last to ensure a strong foundation.

---

### 🎯 **Level 1: Science NFT Creation**

> Goal: Establish your scientific identity on the blockchain

- Mint your **Idea NFT** – A digital certificate of your project concept
- Mint your **Vision NFT** – Represents your long-term scientific vision
- Receive **custom AI-generated artwork** for each NFT

These NFTs serve as timestamped proof of your scientific ideas and establish your authenticity in the DeSci ecosystem.

CoreAgent mints your NFTs and generates images, no manual approval needed.

---

### 🗣️ **Level 2: Discord Setup**

> Goal: Create your community hub and communication space

- Create a **Discord server** for your community
- Install **Portal's verification bot**
- Grow to **4+ members**
- Learn Discord best practices (optional resources included)

1. **Create** your Discord and share the invite link with CoreAgent
2. **Install** the verification bot using CoreAgent's provided link

Discord is your primary community hub for collaboration and communication.

Registers your server, helps install the bot, and tracks growth.

---

### 🌱 **Level 3: Community Growth**

> Goal: Build an active, engaged scientific community

- Grow to **10+ members**
- Share **25+ scientific papers**
- Generate **100+ messages** of discussion
- Establish regular community activity

**Growth strategies:**

- Invite research colleagues
- Share and explain recent studies
- Create topic-specific channels
- Encourage discussion around shared content

Shows genuine scientific engagement — not just member count.

Offers growth strategies, tracks metrics, and provides updates.

---

### 🐦 **Level 4: Social Foundation**

> Goal: Establish your public scientific presence

- Connect your **Twitter account**
- Publish **3 introductory tweets** about your BioDAO
- Share tweet URLs with CoreAgent for verification

**Twitter strategy:**

- Share your BioDAO's mission
- Talk about the problems you're solving
- Invite others to join
- Use hashtags like **#DeSci**, **#BioDAO**

Social visibility boosts credibility and attracts quality members.

Guides account connection, suggests tweet content, and verifies URLs.

---

### 👥 **Level 5: Community Verification & Outreach**

> Goal: Build a network of verified scientists and thought leaders

- Recruit **10+ verified scientists or patients**
- Host a **public Twitter Space**
- Grow your reputation and scientific network

**Verification process:**

- Members DM credentials to the bot (papers, LinkedIn, background)
- Patients can verify through advocacy or community roles

**Twitter Space guidelines:**

- Run a 15+ minute session
- Topics: "Latest in [Your Field]", "Q&A with Founders"
- Share the Space URL with CoreAgent

Verified members increase trust and expand your reach.

Explains verification, guides Twitter Space setup, and tracks counts.

---

### ✍️ **Level 6: Vision Articulation**

> Goal: Articulate your long-term vision and expand public reach

- Write an **800–1500 word visionary blogpost**
- Convert it into a **Twitter thread (5–10 tweets)**
- Share both with CoreAgent

**Content guidelines:**

- Describe your DAO in 5–10 years
- Include mission, breakthroughs, and societal impact
- Publish on Medium, Substack, Mirror, etc.

**Twitter thread:**

- Summarize blogpost in 5–10 tweets
- Use relevant hashtags
- Link to full blogpost

Demonstrates thought leadership and communicates your long-term vision.

Offers writing support and verifies your blogpost + thread.

---

### 🏆 **Level 7: Onboarding Completion (Final Level)**

> Goal: Complete onboarding and prepare for ecosystem opportunities

- Finalize all previous levels
- Record a **3–5 minute welcome Loom video**
- Share it in your Discord's welcome channel
- Get recognized and introduced to the BioDAO ecosystem

**Video content:**

- Introduce your DAO to new members
- Share your vision and how others can contribute
- Share the video link with CoreAgent

**Completion benefits:**

- Gain access to **funding opportunities**
- Connect with other **successful DeSci projects**
- Receive **ongoing support** from the Bio team
- Qualify for **grants and partnerships**

Completion shows serious commitment and opens the door to high-level opportunities.

Verifies your video and connects you to next-stage opportunities.

---

## 🧪 **Advanced Features**

### 🔬 **Proof of Invention (POI) System**

Beyond the standard onboarding, Portal offers advanced blockchain verification for your scientific work:

**What is POI?**

- Upload research documents, videos, lab notes, and data files
- Generate cryptographic proofs using merkle tree technology
- Mint blockchain-verified NFTs as permanent proof of your inventions
- Integration with Molecule POI API for professional-grade verification

**How it works:**

1. **Upload Files**: Documents, videos, images, data files (up to 100MB total)
2. **Generate Proof**: AI creates a merkle root and blockchain transaction data
3. **Mint NFT**: Create a commemorative NFT with embedded verification data
4. **Blockchain Record**: Optional submission to POI contract for complete verification

**Supported Formats**: PDF, DOCX, MP4, PNG, JPG, XLSX, and more

**Use Cases:**

- Timestamp research breakthroughs
- Prove prior art for patent applications
- Create immutable research records
- Establish invention priority

---

### 👥 **Team Collaboration System**

Portal supports multi-member projects with built-in collaboration tools:

**Project Invitations:**

- Invite co-founders and team members via email
- Role-based access control (Founder, Admin, Member)
- Secure token-based invitation system
- 7-day expiration for security

**Team Management:**

- Multiple users can collaborate on one BioDAO
- Shared access to Discord stats and progress
- Coordinated level progression
- Joint ownership of project NFTs

**How to invite team members:**

1. Navigate to your project settings
2. Enter teammate's email and select role
3. CoreAgent sends secure invitation link
4. Teammate joins via link and gets project access

---

## 🛡️ Platform Integrity Features

### 🔄 **Automated Metrics Tracking**

- **Discord stats** (members, messages, papers) tracked via the Discord bot
- **No manual updates** – All progress must result from real community activity
- **Real-time verification** – CoreAgent receives live updates as activity happens
- **Anti-manipulation safeguards** – Technical systems detect and prevent artificial progress

### ✅ **Quality Assurance**

- **Scientist verification** requires real credentials: research papers, academic profiles, or patient advocacy work
- **Twitter verification** only valid with actual tweets from connected accounts
- **Discord engagement** must show meaningful scientific conversations
- **Content checks** ensure blogposts and videos meet required quality standards

### 🤖 **AI-Powered Guidance**

- **Context-aware assistance** – CoreAgent understands your current level and goals
- **Proactive suggestions** – Delivers specific, actionable strategies
- **Progress monitoring** – Highlights achievements and flags areas needing attention
- **24/7 availability** – Always accessible through the chat interface

---

## ⚙️ **Technical Infrastructure**

### 🔗 **Blockchain Integration**

- **Network**: Base Sepolia (Ethereum L2)
- **Wallet**: Privy embedded wallets (no manual setup required)
- **NFT Contracts**: Zora protocol for minting
- **POI Integration**: Molecule Proof of Invention API

### 🔌 **Developer Features**

- **REST API**: Full programmatic access to platform features
- **Webhook Support**: Real-time notifications for level progression
- **Custom Integrations**: Connect your existing tools and workflows
- **Open Source**: Core components available for community contribution

---

## 🚀 **Getting Started**

1. **Connect Wallet**: Use any email address to create a gasless embedded wallet
2. **Start Chat**: Begin conversation with CoreAgent about your research area
3. **Follow Guidance**: Complete levels step-by-step with AI assistance
4. **Grow Community**: Build your verified scientific network
5. **Access Opportunities**: Unlock funding and partnership opportunities

**Ready to launch your BioDAO? Start chatting with CoreAgent today!**
