"use client"

import { useContext } from 'react'
import { ViewModeContext } from '@/components/theme-provider'
import { Terminal } from '@/components/terminal'
import Link from 'next/link'

export default function Projects() {
  const { viewMode } = useContext(ViewModeContext)

  if (viewMode === 'terminal') {
    return <Terminal />
  }

  const projects = [
    {
      name: 'Discord-LMS',
      description: 'Learning Management System built within the Discord ecosystem',
      path: '/devdocs/discord-lms',
      lastUpdated: '2 days ago',
      techStack: ['TypeScript', 'Discord.js', 'MongoDB'],
      features: [
        'Course management through Discord commands',
        'Assignment submission and grading',
        'Automated notifications',
        'Progress tracking'
      ],
      githubUrl: 'https://github.com/code-wolf-byte/discord-lms',
      docs: [
        { title: 'Getting Started', path: '/devdocs/discord-lms/getting-started' },
        { title: 'Architecture', path: '/devdocs/discord-lms/architecture' },
        { title: 'API Reference', path: '/devdocs/discord-lms/api' }
      ]
    },
    {
      name: 'Email-Bot',
      description: 'Fun project to use Discord as an email client',
      path: '/devdocs/email-bot',
      lastUpdated: '1 week ago',
      techStack: ['Python', 'Discord.py', 'SMTP'],
      features: [
        'Email sending through Discord',
        'Attachment support',
        'Email templates',
        'Multiple account management'
      ],
      githubUrl: 'https://github.com/code-wolf-byte/email-bot',
      docs: [
        { title: 'Installation', path: '/devdocs/email-bot/installation' },
        { title: 'Configuration', path: '/devdocs/email-bot/configuration' },
        { title: 'Usage', path: '/devdocs/email-bot/usage' }
      ]
    },
    {
      name: 'Web Server',
      description: 'A high-performance web server built in Rust',
      path: '/devdocs/web-server',
      lastUpdated: '2 weeks ago',
      techStack: ['Rust', 'Tokio', 'HTTP/2'],
      features: [
        'HTTP/2 support',
        'Async I/O',
        'Static file serving',
        'Custom middleware support'
      ],
      githubUrl: 'https://github.com/code-wolf-byte/web-server',
      docs: [
        { title: 'Building', path: '/devdocs/web-server/building' },
        { title: 'Configuration', path: '/devdocs/web-server/configuration' },
        { title: 'Performance', path: '/devdocs/web-server/performance' }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Navigation */}
      <div className="border-b border-[#21262d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            <a href="/" className="px-4 py-4 text-[#8b949e] hover:text-white">Overview</a>
            <a href="/repositories" className="px-4 py-4 text-[#8b949e] hover:text-white">Repositories</a>
            <a href="/projects" className="px-4 py-4 text-white border-b-2 border-[#f78166] font-semibold">Projects</a>
            <a href="/experience" className="px-4 py-4 text-[#8b949e] hover:text-white">Experience</a>
            <a href="/contact" className="px-4 py-4 text-[#8b949e] hover:text-white">Contact</a>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-[#8b949e]">Detailed documentation and features of my major projects</p>
        </div>

        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.name} className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 hover:border-[#8b949e] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#58a6ff]">
                    <Link href={project.path} className="hover:underline">
                      {project.name}
                    </Link>
                  </h2>
                  <p className="text-[#8b949e] mt-1">{project.description}</p>
                  <p className="text-xs text-[#8b949e] mt-2">Last updated {project.lastUpdated}</p>
                </div>
                <a 
                  href={project.githubUrl}
                  className="text-[#8b949e] hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Features */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">✨ Features</h3>
                  <ul className="space-y-2">
                    {project.features.map((feature) => (
                      <li key={feature} className="flex items-center text-[#8b949e]">
                        <svg className="w-4 h-4 mr-2 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Documentation */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">📚 Documentation</h3>
                  <ul className="space-y-2">
                    {project.docs.map((doc) => (
                      <li key={doc.title}>
                        <Link 
                          href={doc.path}
                          className="text-[#58a6ff] hover:underline flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0 1 13.25 15H3.75A1.75 1.75 0 0 1 2 13.25V1.75z"/>
                          </svg>
                          {doc.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span 
                    key={tech}
                    className="px-3 py-1 text-xs rounded-full bg-[#21262d] text-[#8b949e]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
} 