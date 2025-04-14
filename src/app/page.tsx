"use client"

import { useContext } from 'react'
import { ViewModeContext } from '@/components/theme-provider'
import { Terminal } from '@/components/terminal'
import Link from 'next/link'
import { getPinnedProjects, type ProjectConfig } from '@/utils/projects'

export default function Home() {
  const { viewMode } = useContext(ViewModeContext)

  if (viewMode === 'terminal') {
    return <Terminal />
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#161b22] to-[#0d1117] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-5xl font-bold mb-2 text-white">
                Tanay Upreti <span className="text-[#8b949e]">—</span>
              </h1>
              <h2 className="text-3xl text-[#8b949e] mb-6">Software Developer</h2>
              <p className="text-lg text-[#c9d1d9] max-w-2xl mb-8">
                Software developer experienced in C++, Go, and Python with a focus on backend development, 
                adaptive learning systems, and API integration. Entrepreneurship @ RightAIr Data-driven projects
              </p>
            </div>
            <div className="w-64">
              <img 
                src="https://github.com/code-wolf-byte.png" 
                alt="Profile" 
                className="w-64 h-64 rounded-full border-4 border-[#30363d]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-[#21262d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            <a href="#overview" className="px-4 py-4 text-white border-b-2 border-[#f78166] font-semibold">Overview</a>
            <a href="/repositories" className="px-4 py-4 text-[#8b949e] hover:text-white">Repositories</a>
            <a href="/projects" className="px-4 py-4 text-[#8b949e] hover:text-white">Projects</a>
            <a href="/experience" className="px-4 py-4 text-[#8b949e] hover:text-white">Experience</a>
            <a href="/contact" className="px-4 py-4 text-[#8b949e] hover:text-white">Contact</a>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-1/3">
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-2">
                <a href="https://github.com/code-wolf-byte" className="flex items-center text-[#8b949e] hover:text-[#58a6ff]">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  tanayupreti
                </a>
                <a href="https://linkedin.com/in/tanayupreti" className="flex items-center text-[#8b949e] hover:text-[#58a6ff]">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zM4.943 13.5H2.555V6.2h2.388v7.3zM3.8 5.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8zm9.7 8.3h-2.388V9.85c0-.9-.016-2.05-1.25-2.05-1.25 0-1.44.975-1.44 1.985V13.5H6.2V6.2h2.29v1.05h.032c.318-.6 1.092-1.233 2.248-1.233 2.4 0 2.85 1.58 2.85 3.637V13.5z"/>
                  </svg>
                  tanayupreti
                </a>
                <a href="mailto:email.upreti@gmail.com" className="flex items-center text-[#8b949e] hover:text-[#58a6ff]">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555ZM0 4.697v7.104l5.803-3.558L0 4.697ZM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757Zm3.436-.586L16 11.801V4.697l-5.803 3.546Z"/>
                  </svg>
                  email.upreti@gmail.com
                </a>
                <a href="https://rightair.com" className="flex items-center text-[#8b949e] hover:text-[#58a6ff]">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
                    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  </svg>
                  RightAIr
                </a>
              </div>

              {/* Tech Stack */}
              <div>
                <h3 className="text-lg font-semibold mb-3">💻 Tech Stack</h3>
                <div className="relative overflow-hidden">
                  <div className="flex animate-marquee whitespace-nowrap">
                    <div className="flex gap-4 items-center py-2">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" className="h-6" alt="JavaScript" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" className="h-6" alt="TypeScript" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" className="h-6" alt="Python" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" className="h-6" alt="Go" />
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" className="h-6" alt="C++" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-2/3">
            {/* Pinned Projects */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">📌 Pinned</h2>
              <div className="grid grid-cols-2 gap-4">
                {getPinnedProjects().map((project: ProjectConfig) => (
                  <div key={project.name} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#8b949e] transition-colors">
                    <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                    <p className="text-[#8b949e] text-sm mb-4">{project.description}</p>
                    <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                      {project.tech_stack.map((tech) => (
                        <span key={tech} className="flex items-center">
                          <span 
                            className="w-2 h-2 rounded-full mr-1" 
                            style={{ backgroundColor: project.tech_color[tech] }}
                          ></span>
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub Stats */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">📊 GitHub Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>Total Contributions</span>
                    <span className="text-[#58a6ff]">693</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Current Streak</span>
                    <span className="text-[#58a6ff]">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Longest Streak</span>
                    <span className="text-[#58a6ff]">6</span>
                  </div>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>Total Stars</span>
                    <span className="text-[#58a6ff]">7</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Total PRs</span>
                    <span className="text-[#58a6ff]">37</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Issues</span>
                    <span className="text-[#58a6ff]">2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    </main>
  )
}
