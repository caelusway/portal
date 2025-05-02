import { z } from 'zod';

export const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  referralSource: z.string().optional(),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  projectDescription: z.string().min(10, 'Please provide a more detailed project description'),
  projectLinks: z.string().optional(),
  projectVision: z.string().min(10, 'Please provide a more detailed project vision'),
  scientificReferences: z.string().min(5, 'Please provide at least one scientific reference'),
  credentialLinks: z.string().min(5, 'Please provide at least one credential link'),
  teamMembers: z.string().min(5, 'Please provide information about your team members'),
  motivation: z.string().min(10, 'Please provide more details about your motivation'),
  progress: z.string().min(10, 'Please provide more details about your progress'),
});

export type WelcomeFormValues = z.infer<typeof formSchema>;

export interface FormField {
  id: keyof WelcomeFormValues;
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'textarea';
  description?: string;
}

export interface FormPage {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}

export const formPages: FormPage[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tell us about yourself and your project',
    fields: [
      {
        id: 'fullName',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        type: 'text',
      },
      {
        id: 'email',
        label: 'Email Address',
        placeholder: 'your.email@example.com',
        type: 'email',
      },
      {
        id: 'referralSource',
        label: 'Did anyone refer you?',
        placeholder: 'Name of person, organization, or where you heard about us',
        type: 'text',
        description: 'Optional - Let us know if someone referred you to the BioDAO portal',
      },
      {
        id: 'projectName',
        label: 'Project Name',
        placeholder: 'Enter your project name',
        type: 'text',
      },
      {
        id: 'projectDescription',
        label: 'Project Description',
        placeholder: 'Describe what you are building in plain language...',
        type: 'textarea',
        description: 'Explain your project in simple terms that anyone can understand.',
      },
    ],
  },
  {
    id: 'project-details',
    title: 'Project Details',
    description: 'Share more about your project vision and references',
    fields: [
      {
        id: 'projectVision',
        label: 'Project Vision',
        placeholder: 'What could the world look like if your project is successful?',
        type: 'textarea',
        description: 'Describe your long-term vision and the impact you hope to achieve.',
      },
      {
        id: 'projectLinks',
        label: 'Project Links',
        placeholder: 'Any relevant links describing your project (linktree, website, deck, etc.)',
        type: 'textarea',
        description: 'Optional - Share links to any existing project materials (one per line)',
      },
      {
        id: 'scientificReferences',
        label: 'Scientific References',
        placeholder: 'Link to 3 papers or blogs that support your scientific idea (one per line)',
        type: 'textarea',
        description: 'Share academic papers, research, or credible sources that support your work.',
      },
      {
        id: 'credentialLinks',
        label: 'Credential Links',
        placeholder:
          'Share links to validate your credentials like CV, Google Scholar, Twitter, etc. (one per line)',
        type: 'textarea',
        description: 'Help us understand your background and expertise.',
      },
    ],
  },
  {
    id: 'team-progress',
    title: 'Team & Progress',
    description: 'Tell us about your team and progress',
    fields: [
      {
        id: 'teamMembers',
        label: 'Team Members',
        placeholder:
          'Who else is working with you on this? Include LinkedIn profiles & weekly hours',
        type: 'textarea',
        description: 'List your team members, their roles, and time commitment.',
      },
      {
        id: 'motivation',
        label: 'Motivation & Qualifications',
        placeholder:
          'What motivated you to pursue this? What makes you uniquely suited to build this?',
        type: 'textarea',
        description: 'Share your personal journey and what sets you apart.',
      },
      {
        id: 'progress',
        label: 'Current Progress',
        placeholder: 'How much progress have you made on this science already? Please be detailed.',
        type: 'textarea',
        description: 'Describe your current research, experiments, or findings.',
      },
    ],
  },
];
