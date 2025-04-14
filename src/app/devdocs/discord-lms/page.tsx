"use client"

import { useContext } from 'react'
import { ViewModeContext } from '@/components/theme-provider'
import { Terminal } from '@/components/terminal'
import Link from 'next/link'
import { PROJECTS_DATA } from '@/types/docs'

export default function DiscordLMSDocs() {
  const { viewMode } = useContext(ViewModeContext)
  const projectData = PROJECTS_DATA['discord-lms']

  if (viewMode === 'terminal') {
    return <Terminal />
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/projects" className="text-[#58a6ff] hover:underline flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"/>
              </svg>
              Back to Projects
            </Link>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{projectData.name} Documentation</h1>
              <p className="text-[#8b949e]">{projectData.description}</p>
            </div>
            <a 
              href={projectData.githubUrl}
              className="text-[#8b949e] hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Documentation</h2>
            <div className="grid grid-cols-1 gap-4">
              {projectData.docs.map((doc) => (
                <Link 
                  key={doc.path}
                  href={doc.path}
                  className="block p-4 bg-[#161b22] border border-[#30363d] rounded-lg hover:border-[#8b949e] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-[#58a6ff]">{doc.title}</h3>
                      <p className="text-[#8b949e] text-sm mt-1">{doc.description}</p>
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      Updated: {doc.lastUpdated}
                    </div>
                  </div>
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {doc.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 text-xs rounded-full bg-[#21262d] text-[#8b949e]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-[#c9d1d9]">{projectData.overview}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            <ul className="space-y-3">
              {projectData.features.map((feature) => (
                <li key={feature.title} className="flex items-start">
                  <svg className="w-6 h-6 mr-2 text-[#58a6ff] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-[#8b949e]">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {projectData.techStack.map((tech) => (
                <span 
                  key={tech}
                  className="px-3 py-1 text-xs rounded-full bg-[#21262d] text-[#8b949e]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
} 