import { notFound } from 'next/navigation';
import Link from 'next/link';

interface DocPageProps {
  params: {
    project: string;
    doc: string;
  };
}

interface DocContent {
  title: string;
  content: string;
}

interface ProjectDocs {
  [key: string]: DocContent;
}

interface Project {
  name: string;
  description: string;
  docs: ProjectDocs;
}

interface Projects {
  [key: string]: Project;
}

const projects: Projects = {
  'discord-lms': {
    name: 'Discord-LMS',
    description: 'Learning Management System built within the Discord ecosystem',
    docs: {
      'getting-started': {
        title: 'Getting Started',
        content: `# Getting Started with Discord-LMS

## Prerequisites
- Node.js 16.x or later
- Discord Bot Token
- MongoDB Database

## Installation
1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Start the server

## Basic Usage
1. Invite the bot to your server
2. Set up courses
3. Add students
4. Create assignments

For more detailed information, check out the [Architecture](/devdocs/discord-lms/architecture) documentation.`
      },
      'architecture': {
        title: 'Architecture',
        content: `# Discord-LMS Architecture

## System Overview
The Discord-LMS is built using a microservices architecture with the following components:

- Discord Bot Service
- Database Service
- API Gateway
- Authentication Service

## Technology Stack
- TypeScript
- Node.js
- MongoDB
- Discord.js`
      },
      'api': {
        title: 'API Reference',
        content: `# API Reference

## Endpoints
- /api/courses
- /api/assignments
- /api/users
- /api/auth`
      }
    }
  },
  'email-bot': {
    name: 'Email-Bot',
    description: 'Fun project to use Discord as an email client',
    docs: {
      'installation': {
        title: 'Installation',
        content: `# Installation Guide

## Requirements
- Python 3.8+
- Discord Bot Token
- Email Account

## Setup Steps
1. Clone the repository
2. Install dependencies
3. Configure settings
4. Run the bot`
      },
      'configuration': {
        title: 'Configuration',
        content: `# Configuration

## Environment Variables
- DISCORD_TOKEN
- EMAIL_USERNAME
- EMAIL_PASSWORD
- SMTP_SERVER`
      },
      'usage': {
        title: 'Usage',
        content: `# Usage Guide

## Commands
- !email send
- !email check
- !email config`
      }
    }
  },
  'web-server': {
    name: 'web-server',
    description: 'A web server built in Rust',
    docs: {
      'building': {
        title: 'Building',
        content: `# Building the Web Server

## Prerequisites
- Rust 1.60+
- Cargo

## Build Steps
1. Clone the repository
2. Run cargo build
3. Run cargo test`
      },
      'configuration': {
        title: 'Configuration',
        content: `# Configuration

## Server Settings
- Port
- Threads
- SSL
- Logging`
      },
      'performance': {
        title: 'Performance',
        content: `# Performance Guide

## Optimization Tips
- Connection pooling
- Caching
- Compression
- Load balancing`
      }
    }
  }
};

export default function DocPage({ params }: DocPageProps) {
  const project = projects[params.project];
  if (!project) notFound();

  const doc = project.docs[params.doc];
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/devdocs"
            className="text-[#58a6ff] hover:underline inline-flex items-center mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
              <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/>
            </svg>
            Back to DevDocs
          </Link>
          <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
          <p className="text-[#8b949e]">{project.description}</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <div 
            className="markdown-body"
            dangerouslySetInnerHTML={{ 
              __html: doc.content
                .split('\n')
                .map((line: string) => {
                  if (line.startsWith('# ')) {
                    return `<h1>${line.substring(2)}</h1>`;
                  } else if (line.startsWith('## ')) {
                    return `<h2>${line.substring(3)}</h2>`;
                  } else if (line.startsWith('### ')) {
                    return `<h3>${line.substring(4)}</h3>`;
                  } else if (line.startsWith('- ')) {
                    return `<li>${line.substring(2)}</li>`;
                  } else if (line.trim() === '') {
                    return '<br>';
                  } else {
                    return `<p>${line}</p>`;
                  }
                })
                .join('')
            }} 
          />
        </div>
      </div>
    </main>
  );
} 