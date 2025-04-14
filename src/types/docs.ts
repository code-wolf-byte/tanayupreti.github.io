export interface DocItem {
  title: string;
  description: string;
  path: string;
  lastUpdated?: string;
  tags?: string[];
}

export interface ProjectDoc {
  name: string;
  description: string;
  overview: string;
  features: {
    title: string;
    description: string;
  }[];
  docs: DocItem[];
  techStack: string[];
  githubUrl: string;
  lastUpdated: string;
}

export const PROJECTS_DATA: Record<string, ProjectDoc> = {
  'discord-lms': {
    name: 'Discord-LMS',
    description: 'A Learning Management System built within the Discord ecosystem',
    overview: 'Discord-LMS is a Learning Management System that leverages Discord\'s rich features to create an interactive learning environment. It allows educators to manage courses, assignments, and student progress directly through Discord commands.',
    features: [
      {
        title: 'Course Management',
        description: 'Create and manage courses with Discord commands'
      },
      {
        title: 'Assignment Handling',
        description: 'Submit and grade assignments through Discord'
      },
      {
        title: 'Progress Tracking',
        description: 'Monitor student progress and generate reports'
      }
    ],
    docs: [
      {
        title: 'Installation Guide',
        description: 'How to set up Discord-LMS in your server',
        path: '/devdocs/discord-lms/installation',
        lastUpdated: '2024-03-20',
        tags: ['setup', 'configuration']
      },
      {
        title: 'Bot Commands',
        description: 'Complete list of available commands',
        path: '/devdocs/discord-lms/commands',
        lastUpdated: '2024-03-19',
        tags: ['usage', 'reference']
      },
      {
        title: 'Course Setup',
        description: 'Guide to creating and managing courses',
        path: '/devdocs/discord-lms/courses',
        lastUpdated: '2024-03-18',
        tags: ['usage', 'courses']
      }
    ],
    techStack: ['TypeScript', 'Discord.js', 'MongoDB'],
    githubUrl: 'https://github.com/code-wolf-byte/discord-lms',
    lastUpdated: '2 days ago'
  },
  'email-bot': {
    name: 'Email-Bot',
    description: 'A Discord bot that turns your server into an email client',
    overview: 'Email-Bot is a Discord bot that enables users to send and manage emails directly through Discord. It provides a seamless interface for handling email communications while leveraging Discord\'s familiar environment and rich features.',
    features: [
      {
        title: 'Email Management',
        description: 'Send and receive emails through Discord commands'
      },
      {
        title: 'Attachment Support',
        description: 'Handle email attachments seamlessly'
      },
      {
        title: 'Template System',
        description: 'Create and use email templates for quick responses'
      }
    ],
    docs: [
      {
        title: 'Getting Started',
        description: 'Initial setup and configuration',
        path: '/devdocs/email-bot/getting-started',
        lastUpdated: '2024-03-20',
        tags: ['setup']
      },
      {
        title: 'Email Configuration',
        description: 'Setting up email providers and accounts',
        path: '/devdocs/email-bot/email-config',
        lastUpdated: '2024-03-19',
        tags: ['configuration', 'email']
      },
      {
        title: 'Template Management',
        description: 'Creating and using email templates',
        path: '/devdocs/email-bot/templates',
        lastUpdated: '2024-03-18',
        tags: ['templates', 'usage']
      }
    ],
    techStack: ['Python', 'Discord.py', 'SMTP'],
    githubUrl: 'https://github.com/code-wolf-byte/email-bot',
    lastUpdated: '1 week ago'
  },
  'web-server': {
    name: 'Web Server',
    description: 'A high-performance web server built with Rust',
    overview: 'This web server is built in Rust, focusing on high performance and modern features. It leverages Rust\'s safety guarantees and zero-cost abstractions to provide a robust and efficient HTTP/2 server implementation.',
    features: [
      {
        title: 'HTTP/2 Support',
        description: 'Full HTTP/2 protocol implementation'
      },
      {
        title: 'Async I/O',
        description: 'Non-blocking I/O operations using Tokio'
      },
      {
        title: 'Middleware Support',
        description: 'Extensible middleware system for custom handlers'
      }
    ],
    docs: [
      {
        title: 'Architecture Overview',
        description: 'High-level system design and components',
        path: '/devdocs/web-server/architecture',
        lastUpdated: '2024-03-20',
        tags: ['architecture', 'design']
      },
      {
        title: 'Performance Tuning',
        description: 'Optimization guides and benchmarks',
        path: '/devdocs/web-server/performance',
        lastUpdated: '2024-03-19',
        tags: ['performance', 'optimization']
      },
      {
        title: 'Middleware Development',
        description: 'Creating custom middleware components',
        path: '/devdocs/web-server/middleware',
        lastUpdated: '2024-03-18',
        tags: ['development', 'middleware']
      }
    ],
    techStack: ['Rust', 'Tokio', 'HTTP/2'],
    githubUrl: 'https://github.com/code-wolf-byte/web-server',
    lastUpdated: '2 weeks ago'
  }
}; 