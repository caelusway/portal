import { Service, IAgentRuntime, elizaLogger } from '@elizaos/core';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export class EmailService extends Service {
  static serviceType = 'EMAIL_SERVICE';
  capabilityDescription =
    'Provides email sending capabilities for BioDAO notifications and level-up messages';

  private mailgun: any;
  private mg: any;
  private mailgunDomain: string;
  private fromEmail: string;
  private sandboxNotificationEmails: string[];

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Configure Mailgun
    this.mailgun = new Mailgun(FormData);

    const mailgunApiKey = runtime.getSetting('MAILGUN_API_KEY');
    const mailgunRegion = runtime.getSetting('MAILGUN_REGION') || 'us';

    if (!mailgunApiKey) {
      elizaLogger.warn('⚠️ MAILGUN_API_KEY not found - Email service will not function');
      return;
    }

    this.mg = this.mailgun.client({
      username: 'api',
      key: mailgunApiKey,
      url: mailgunRegion === 'us' ? 'https://api.mailgun.net' : undefined,
    });

    this.mailgunDomain =
      runtime.getSetting('MAILGUN_DOMAIN') || 'sandboxaebe4f00726647d187dcb0f5e2dc1c4c.mailgun.org';
    this.fromEmail =
      runtime.getSetting('FROM_EMAIL') || `BioDAO <postmaster@${this.mailgunDomain}>`;

    const sandboxEmails = runtime.getSetting('SANDBOX_NOTIFICATION_EMAIL') || 'james@bio.xyz';
    this.sandboxNotificationEmails = sandboxEmails
      .split(',')
      .map((email: string) => email.trim())
      .filter(Boolean);

    elizaLogger.info('📧 Email Service initialized with Mailgun');
  }

  static async start(runtime: IAgentRuntime): Promise<EmailService> {
    const service = new EmailService(runtime);
    elizaLogger.info('📧 Email Service started');
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('📧 Email Service stopped');
  }

  async stop(): Promise<void> {
    elizaLogger.info('📧 Email Service stopped');
  }

  /**
   * Send an email to the user when they level up
   */
  async sendLevelUpEmail(userEmail: string, level: number): Promise<boolean> {
    if (!userEmail) {
      elizaLogger.warn('Cannot send level up email: No user email provided');
      return false;
    }

    if (!this.mg) {
      elizaLogger.warn('Cannot send email: Mailgun not configured');
      return false;
    }

    try {
      const subject = `🚀 Congratulations! You've reached Level ${level} in your BioDAO`;

      let message = '';
      let html = '';

      switch (level) {
        case 2:
          message = `Congratulations on reaching Level 2 of your BioDAO journey!\n\nYou've successfully minted your Science NFTs, establishing the foundation of your research DAO. Now, it's time to build your community.\n\nYour next goals:\n- Create a Discord server\n- Add our verification bot\n- Grow your community to at least 4 members\n\nLog in to continue your progress and receive guidance from our AI assistant.`;
          html = `
                        <h2>Congratulations on reaching Level 2 of your BioDAO journey!</h2>
                        <p>You've successfully minted your Science NFTs, establishing the foundation of your research DAO. Now, it's time to build your community.</p>
                        <strong>Your next goals:</strong>
                        <ul>
                            <li>Create a <strong>Discord server</strong></li>
                            <li>Add our <strong>verification bot</strong></li>
                            <li>Grow your community to at least <strong>4 members</strong></li>
                        </ul>
                        <p><em>Log in to continue your progress and receive guidance from our AI assistant.</em></p>
                    `;
          break;
        case 3:
          message = `Impressive work! You've reached Level 3 of your BioDAO journey.\n\nYour Discord community is now established with at least 4 members. This is a significant milestone in building your decentralized research organization.\n\nYour next goals:\n- Grow your Discord to at least 10 members\n- Share at least 25 scientific papers\n- Achieve 100+ quality messages in your server\n\nLog in to continue your progress and receive guidance from our AI assistant.`;
          html = `
                        <h2>Impressive work! You've reached Level 3 of your BioDAO journey.</h2>
                        <p>Your Discord community is now established with at least <strong>4 members</strong>. This is a significant milestone in building your decentralized research organization.</p>
                        <strong>Your next goals:</strong>
                        <ul>
                            <li>Grow your Discord to at least <strong>10 members</strong></li>
                            <li>Share at least <strong>25 scientific papers</strong></li>
                            <li>Achieve <strong>100+ quality messages</strong> in your server</li>
                        </ul>
                        <p><em>Log in to continue your progress and receive guidance from our AI assistant.</em></p>
                    `;
          break;
        case 4:
          message = `Outstanding achievement! You've reached Level 4 – the highest level in your BioDAO journey!\n\nYou've built a thriving scientific community with:\n- 10+ active members\n- 25+ scientific papers shared\n- 100+ quality discussions\n\nThe Bio team will contact you shortly to discuss your next steps and sandbox access. In the meantime, continue growing your community and engaging with your members.\n\nThank you for your dedication to decentralized science!`;
          html = `
                        <h2>Outstanding achievement! You've reached Level 4 – the highest level in your BioDAO journey!</h2>
                        <p>You've built a thriving scientific community with:</p>
                        <ul>
                            <li><strong>10+ active members</strong></li>
                            <li><strong>25+ scientific papers shared</strong></li>
                            <li><strong>100+ quality discussions</strong></li>
                        </ul>
                        <p>The Bio team will contact you shortly to discuss your next steps and sandbox access. In the meantime, continue growing your community and engaging with your members.</p>
                        <p><em>Thank you for your dedication to decentralized science!</em></p>
                    `;
          break;
        default:
          message = `Congratulations on reaching Level ${level} of your BioDAO journey!\n\nLog in to continue your progress and receive guidance from our AI assistant.`;
          html = `<h2>Congratulations on reaching Level ${level} of your BioDAO journey!</h2><p><em>Log in to continue your progress and receive guidance from our AI assistant.</em></p>`;
      }

      const data = await this.mg.messages.create(this.mailgunDomain, {
        from: this.fromEmail,
        to: userEmail,
        subject: subject,
        text: message,
        html: html,
      });

      elizaLogger.info(`📧 Level up email sent to ${userEmail} for level ${level}`);
      return true;
    } catch (error) {
      elizaLogger.error(`❌ Error sending level up email to ${userEmail}:`, error);
      return false;
    }
  }

  /**
   * Send an email to the Bio team when a user reaches the sandbox level
   */
  async sendSandboxEmail(project: any): Promise<boolean> {
    if (!project) {
      elizaLogger.warn('Cannot send sandbox email: No project data provided');
      return false;
    }

    if (!this.mg) {
      elizaLogger.warn('Cannot send email: Mailgun not configured');
      return false;
    }

    try {
      const subject = `🎉 New Sandbox User: ${project.projectName || 'Unknown Project'}`;

      // Plain text version
      const message = `New Sandbox User: ${project.projectName || 'Unknown Project'}\n\nA new user has reached the sandbox level (Level 4) in BioDAO!\n\nProject Details:\n- Project Name: ${project.projectName || 'Not specified'}\n- Project Description: ${project.projectDescription || 'Not specified'}\n- Vision: ${project.projectVision || 'Not specified'}\n- Scientific References: ${project.scientificReferences || 'Not specified'}\n- Credential Links: ${project.credentialLinks || 'Not specified'}\n- Team Members: ${project.teamMembers || 'Not specified'}\n- Motivation: ${project.motivation || 'Not specified'}\n- Progress: ${project.progress || 'Not specified'}\n- Full Name: ${project.fullName || 'Not specified'}\n- Email: ${project.email || 'Not specified'}\n- Wallet: ${project.wallet || 'Not specified'}\n- Referral Code: ${project.referralCode || 'Not specified'}\n- Referred By: ${project.referredById || 'Not specified'}\n- Project ID: ${project.id || 'Not specified'}\n\nCommunity Stats:\n- Discord Members: ${project.Discord?.memberCount || 0}\n- Papers Shared: ${project.Discord?.papersShared || 0}\n- Messages Count: ${project.Discord?.messagesCount || 0}\n- Discord Server Name: ${project.Discord?.serverName || 'Not specified'}\n- Discord Server ID: ${project.Discord?.serverId || 'Not specified'}\n- Discord Verified: ${project.Discord?.verified ? 'Yes' : 'No'}\n- Discord Bot Added: ${project.Discord?.botAdded ? 'Yes' : 'No'}\n\nDiscord Invite Link: ${project.Discord?.inviteLink || 'Not provided'}\n\nPlease reach out to this user to discuss next steps and provide sandbox access.`;

      // HTML version
      const html = `
                <h1>🎉 New Sandbox User: ${project.projectName || 'Unknown Project'}</h1>
                <p>A new user has reached the <strong>sandbox level (Level 4)</strong> in BioDAO!</p>
                <h2>🧬 Project Details</h2>
                <ul>
                    <li><strong>Project Name:</strong> ${project.projectName || 'Not specified'}</li>
                    <li><strong>Project Description:</strong> ${project.projectDescription || 'Not specified'}</li>
                    <li><strong>Vision:</strong> ${project.projectVision || 'Not specified'}</li>
                    <li><strong>Scientific References:</strong> ${project.scientificReferences || 'Not specified'}</li>
                    <li><strong>Credential Links:</strong> ${project.credentialLinks || 'Not specified'}</li>
                    <li><strong>Team Members:</strong> ${project.teamMembers || 'Not specified'}</li>
                    <li><strong>Motivation:</strong> ${project.motivation || 'Not specified'}</li>
                    <li><strong>Progress:</strong> ${project.progress || 'Not specified'}</li>
                    <li><strong>Full Name:</strong> ${project.fullName || 'Not specified'}</li>
                    <li><strong>Email:</strong> ${project.email || 'Not specified'}</li>
                    <li><strong>Wallet:</strong> ${project.wallet || 'Not specified'}</li>
                    <li><strong>Referral Code:</strong> ${project.referralCode || 'Not specified'}</li>
                    <li><strong>Referred By:</strong> ${project.referredById || 'Not specified'}</li>
                    <li><strong>Project ID:</strong> ${project.id || 'Not specified'}</li>
                </ul>
                <h2>🌐 Community Stats</h2>
                <ul>
                    <li><strong>Discord Members:</strong> ${project.Discord?.memberCount || 0}</li>
                    <li><strong>Papers Shared:</strong> ${project.Discord?.papersShared || 0}</li>
                    <li><strong>Messages Count:</strong> ${project.Discord?.messagesCount || 0}</li>
                    <li><strong>Discord Server Name:</strong> ${project.Discord?.serverName || 'Not specified'}</li>
                    <li><strong>Discord Server ID:</strong> ${project.Discord?.serverId || 'Not specified'}</li>
                    <li><strong>Discord Verified:</strong> ${project.Discord?.verified ? 'Yes' : 'No'}</li>
                    <li><strong>Discord Bot Added:</strong> ${project.Discord?.botAdded ? 'Yes' : 'No'}</li>
                </ul>
                <h2>🔗 Discord Invite Link</h2>
                <p>${project.Discord?.inviteLink || 'Not provided'}</p>
                <p>Please reach out to this user to discuss next steps and provide sandbox access.</p>
            `;

      const data = await Promise.all(
        this.sandboxNotificationEmails.map((email) =>
          this.mg.messages.create(this.mailgunDomain, {
            from: this.fromEmail,
            to: email,
            subject: subject,
            text: message,
            html: html,
          })
        )
      );

      elizaLogger.info(
        `📧 Sandbox notification email sent to ${this.sandboxNotificationEmails.join(', ')}`
      );
      return true;
    } catch (error) {
      elizaLogger.error('❌ Error sending sandbox notification email:', error);
      return false;
    }
  }

  /**
   * Send co-founder invitation email
   */
  async sendCoFounderInvite(
    recipientEmail: string,
    inviteToken: string,
    inviterName: string,
    projectName: string
  ): Promise<boolean> {
    if (!this.mg) {
      elizaLogger.warn('Cannot send email: Mailgun not configured');
      return false;
    }

    try {
      // Build the invitation URL with correct path format
      const frontendUrl = this.runtime.getSetting('FRONTEND_URL') || 'http://localhost:3000';
      const inviteUrl = `${frontendUrl}/accept-invite?token=${inviteToken}`;

      // Prepare email content
      const subject = `${inviterName} has invited you to collaborate on ${projectName}`;

      // Plain text version
      const message = `
Hello,

${inviterName} has invited you to collaborate on the BioDAO project "${projectName}".

To accept this invitation, please follow this link:
${inviteUrl}

This invitation will expire in 7 days.

Best,
The BioDAO Team
            `;

      // HTML version
      const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background: #fff; border-radius: 0 0 5px 5px; }
        .button { 
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #3B82F6; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
        }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Join ${projectName} on BioDAO</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to collaborate on the BioDAO project "<strong>${projectName}</strong>".</p>
            <p>BioDAO is a platform for scientific collaboration and community building.</p>
            <p>
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </p>
            <p>This invitation will expire in 7 days.</p>
            <p>Best,<br>The BioDAO Team</p>
        </div>
        <div class="footer">
            <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
            <p>${inviteUrl}</p>
        </div>
    </div>
</body>
</html>
            `;

      // Send the email using Mailgun
      const data = await this.mg.messages.create(this.mailgunDomain, {
        from: this.fromEmail,
        to: recipientEmail,
        subject: subject,
        text: message,
        html: html,
      });

      elizaLogger.info(`📧 Co-founder invitation email sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      elizaLogger.error('❌ Failed to send co-founder invitation email:', error);
      return false;
    }
  }

  /**
   * Resend level up email (for agent capability)
   */
  async resendLevelUpEmail(userEmail: string, level: number): Promise<boolean> {
    elizaLogger.info(`📧 Resending level up email to ${userEmail} for level ${level}`);
    return await this.sendLevelUpEmail(userEmail, level);
  }

  /**
   * Resend sandbox notification email (for agent capability)
   */
  async resendSandboxEmail(project: any): Promise<boolean> {
    elizaLogger.info(`📧 Resending sandbox notification email for project ${project.id}`);
    return await this.sendSandboxEmail(project);
  }
}

// Export singleton instance for easy access
export let emailService: EmailService;

export function initializeEmailService(runtime: IAgentRuntime): EmailService {
  emailService = new EmailService(runtime);
  return emailService;
}
