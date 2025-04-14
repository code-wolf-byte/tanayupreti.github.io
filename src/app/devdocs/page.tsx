import Link from 'next/link';

export default function DevDocs() {
  const projects = [
    {
      name: 'Discord-LMS',
      description: 'Learning Management System built within the Discord ecosystem',
      path: '/devdocs/discord-lms',
      lastUpdated: '2 days ago',
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
      docs: [
        { title: 'Installation', path: '/devdocs/email-bot/installation' },
        { title: 'Configuration', path: '/devdocs/email-bot/configuration' },
        { title: 'Usage', path: '/devdocs/email-bot/usage' }
      ]
    },
    {
      name: 'web-server',
      description: 'A web server built in Rust',
      path: '/devdocs/web-server',
      lastUpdated: '2 weeks ago',
      docs: [
        { title: 'Building', path: '/devdocs/web-server/building' },
        { title: 'Configuration', path: '/devdocs/web-server/configuration' },
        { title: 'Performance', path: '/devdocs/web-server/performance' }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DevDocs</h1>
          <p className="text-[#8b949e]">Technical documentation for my projects</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.name} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[#58a6ff]">
                  <Link href={project.path} className="hover:underline">
                    {project.name}
                  </Link>
                </h2>
                <p className="text-sm text-[#8b949e]">{project.description}</p>
                <p className="text-xs text-[#8b949e] mt-2">Last updated {project.lastUpdated}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Documentation</h3>
                <ul className="space-y-1">
                  {project.docs.map((doc) => (
                    <li key={doc.title}>
                      <Link 
                        href={doc.path}
                        className="text-sm text-[#58a6ff] hover:underline flex items-center"
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
          ))}
        </div>
      </div>
    </main>
  );
} 