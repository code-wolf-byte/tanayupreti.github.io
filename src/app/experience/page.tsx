"use client"

import { useContext } from 'react'
import { ViewModeContext } from '@/components/theme-provider'
import { Terminal } from '@/components/terminal'

export default function Experience() {
  const { viewMode } = useContext(ViewModeContext)

  if (viewMode === 'terminal') {
    return <Terminal />
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Navigation */}
      <div className="border-b border-[#21262d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            <a href="/" className="px-4 py-4 text-[#8b949e] hover:text-white">Overview</a>
            <a href="/repositories" className="px-4 py-4 text-[#8b949e] hover:text-white">Repositories</a>
            <a href="/projects" className="px-4 py-4 text-[#8b949e] hover:text-white">Projects</a>
            <a href="/experience" className="px-4 py-4 text-white border-b-2 border-[#f78166] font-semibold">Experience</a>
            <a href="/contact" className="px-4 py-4 text-[#8b949e] hover:text-white">Contact</a>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Work Experience</h1>
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 hover:border-[#8b949e] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Software Developer @ RightAIr</h3>
                <p className="text-[#8b949e] text-sm mt-1">Jan 2023 - Present</p>
              </div>
              <img src="https://rightair.com/favicon.ico" alt="RightAIr" className="w-12 h-12 rounded" />
            </div>
            <ul className="text-[#c9d1d9] space-y-3 list-disc list-inside mb-4">
              <li>Developed and maintained backend services for adaptive learning systems</li>
              <li>Implemented real-time data processing pipelines using Go and Python</li>
              <li>Integrated multiple third-party APIs for enhanced functionality</li>
              <li>Led the development of microservices architecture</li>
              <li>Optimized system performance and reduced latency by 40%</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Go</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Python</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Docker</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">AWS</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Kubernetes</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 hover:border-[#8b949e] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Software Engineering Intern @ Tech Corp</h3>
                <p className="text-[#8b949e] text-sm mt-1">May 2022 - Aug 2022</p>
              </div>
              <div className="w-12 h-12 bg-[#21262d] rounded flex items-center justify-center text-xl">TC</div>
            </div>
            <ul className="text-[#c9d1d9] space-y-3 list-disc list-inside mb-4">
              <li>Built and optimized RESTful APIs using C++ and gRPC</li>
              <li>Contributed to the development of high-performance data processing systems</li>
              <li>Collaborated with cross-functional teams to improve system architecture</li>
              <li>Implemented caching strategies reducing response time by 60%</li>
              <li>Wrote comprehensive documentation and unit tests</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">C++</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">gRPC</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">PostgreSQL</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Redis</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 hover:border-[#8b949e] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Research Assistant @ ASU</h3>
                <p className="text-[#8b949e] text-sm mt-1">Sep 2021 - May 2022</p>
              </div>
              <img src="https://www.asu.edu/favicon.ico" alt="ASU" className="w-12 h-12 rounded" />
            </div>
            <ul className="text-[#c9d1d9] space-y-3 list-disc list-inside mb-4">
              <li>Conducted research on machine learning algorithms for adaptive learning systems</li>
              <li>Developed data analysis tools for educational technology research</li>
              <li>Published findings in academic conferences and journals</li>
              <li>Created visualization tools for complex datasets</li>
              <li>Mentored undergraduate students in research methodologies</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Python</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">TensorFlow</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Data Analysis</span>
              <span className="text-xs bg-[#21262d] px-3 py-1 rounded-full text-[#8b949e]">Machine Learning</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 