import { Service, IAgentRuntime } from '@elizaos/core';
import axios from 'axios';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';
const MAILGUN_DOMAIN =
  process.env.MAILGUN_DOMAIN || 'sandboxaebe4f00726647d187dcb0f5e2dc1c4c.mailgun.org';
const FROM_EMAIL = process.env.FROM_EMAIL || `BioDAO <postmaster@${MAILGUN_DOMAIN}>`;
const SANDBOX_NOTIFICATION_EMAILS = (process.env.SANDBOX_NOTIFICATION_EMAIL || 'james@bio.xyz')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);
const MAILGUN_API_BASE = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

/**
 * Eliza-compliant EmailService for sending onboarding and level-up emails
 */
export class EmailService extends Service {
  static serviceType = 'email';
  capabilityDescription =
    'Sends onboarding, level-up, and notification emails for BioDAO onboarding.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<EmailService> {
    // No async setup needed for Mailgun
    return new EmailService(runtime);
  }

  async stop(): Promise<void> {
    // No persistent connections to clean up
  }

  /**
   * Send an email to the user when they level up
   * @param userEmail Email address of the user
   * @param level The new level the user has reached
   */
  async sendLevelUpEmail(userEmail: string, level: number): Promise<void> {
    await sendLevelUpEmail(userEmail, level);
  }

  /**
   * Send an email to the Bio team when a user reaches the sandbox level
   * @param project The project data
   */
  async sendSandboxEmail(project: any): Promise<void> {
    await sendSandboxEmail(project);
  }
}

// Helper to send email via Mailgun HTTP API
async function sendMailgunEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const params = new URLSearchParams();
  params.append('from', FROM_EMAIL);
  params.append('to', to);
  params.append('subject', subject);
  params.append('text', text);

  await axios.post(MAILGUN_API_BASE, params, {
    auth: {
      username: 'api',
      password: MAILGUN_API_KEY,
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export async function sendLevelUpEmail(userEmail: string, level: number): Promise<void> {
  if (!userEmail) {
    console.warn('Cannot send level up email: No user email provided');
    return;
  }

  try {
    const subject = `🚀 Congratulations! You've reached Level ${level} in your BioDAO`;

    let message = '';
    switch (level) {
      case 2:
        message = `
          Congratulations on reaching Level 2 of your BioDAO journey! 
          \nYou've successfully minted your Science NFTs, establishing the foundation of your research DAO. Now, it's time to build your community.
          \nYour next goals:
          - Create a Discord server
          - Add our verification bot
          - Grow your community to at least 4 members
          \nLog in to continue your progress and receive guidance from our AI assistant.
        `;
        break;
      case 3:
        message = `
          Impressive work! You've reached Level 3 of your BioDAO journey.
          \nYour Discord community is now established with at least 4 members. This is a significant milestone in building your decentralized research organization.
          \nYour next goals:
          - Grow your Discord to at least 10 members
          - Share at least 25 scientific papers
          - Achieve 100+ quality messages in your server
          \nLog in to continue your progress and receive guidance from our AI assistant.
        `;
        break;
      case 4:
        message = `
          Outstanding achievement! You've reached Level 4 - the highest level in your BioDAO journey!
          \nYou've built a thriving scientific community with:
          - 10+ active members
          - 25+ scientific papers shared
          - 100+ quality discussions
          \nThe Bio team will contact you shortly to discuss your next steps and sandbox access. In the meantime, continue growing your community and engaging with your members.
          \nThank you for your dedication to decentralized science!
        `;
        break;
      default:
        message = `Congratulations on reaching Level ${level} of your BioDAO journey! Log in to continue your progress and receive guidance from our AI assistant.`;
    }

    await sendMailgunEmail({ to: userEmail, subject, text: message });
    console.log(`Level up email sent to ${userEmail} for level ${level}.`);
  } catch (error) {
    console.error(`Error sending level up email to ${userEmail}:`, error);
  }
}

export async function sendSandboxEmail(project: any): Promise<void> {
  if (!project) {
    console.warn('Cannot send sandbox email: No project data provided');
    return;
  }

  try {
    const subject = `🎉 New Sandbox User: ${project.projectName || 'Unknown Project'}`;

    const message = `
      A new user has reached the sandbox level (Level 4) in BioDAO!
      \nProject Details:
      - Project Name: ${project.projectName || 'Not specified'}
      - Project Description: ${project.projectDescription || 'Not specified'}
      - Full Name: ${project.fullName || 'Not specified'}
      - Email: ${project.email || 'Not specified'}
      - Wallet: ${project.wallet || 'Not specified'}
      \nCommunity Stats:
      - Discord Members: ${project.Discord?.memberCount || 0}
      - Papers Shared: ${project.Discord?.papersShared || 0}
      - Messages Count: ${project.Discord?.messagesCount || 0}
      \nPlease reach out to this user to discuss next steps and provide sandbox access.
    `;

    await Promise.all(
      SANDBOX_NOTIFICATION_EMAILS.map((email) =>
        sendMailgunEmail({ to: email, subject, text: message })
      )
    );
    console.log(`Sandbox notification email sent to ${SANDBOX_NOTIFICATION_EMAILS.join(', ')}.`);
  } catch (error) {
    console.error('Error sending sandbox notification email:', error);
  }
}
