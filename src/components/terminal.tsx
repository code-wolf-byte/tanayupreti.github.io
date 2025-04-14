"use client"

import React, { useState, useEffect, useRef } from 'react'

interface Command {
  command: string
  output: string
}

export function Terminal() {
  const [history, setHistory] = useState<Command[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [currentPath, setCurrentPath] = useState('~')
  const terminalRef = useRef<HTMLDivElement>(null)

  const commands = {
    help: () => `Available commands:
  help - Show this help message
  clear - Clear the terminal
  ls - List directory contents
  cd <dir> - Change directory
  about - About me
  contact - Contact information
  projects - View my projects`,
    clear: () => {
      setHistory([])
      return ''
    },
    ls: () => `Documents  Projects  Downloads`,
    cd: (args: string) => {
      if (args) {
        setCurrentPath(args)
        return `Changed directory to ${args}`
      }
      return 'Please specify a directory'
    },
    about: () => `Hello there, I'm Tanay Upreti. I'm a student at Arizona State University, pursuing a degree in Computer Science.

When I'm not buried in code or tinkering with the latest tech, you can find me exploring new ways to merge innovation with everyday life. I thrive on challenges and love pushing the boundaries of what's possible.

My journey in the tech world has been anything but conventional – from developing secure applications for top social platforms to creating custom solutions for diverse clients. Every project I tackle is a new adventure, a chance to learn something new and make a real impact.

If you have a fun project to work upon or just want to say hi, feel free to reach out to me. I'm always up for a good chat!`,
    contact: () => `Email: contact@tanayupreti.dev
GitHub: github.com/code-wolf-byte
LinkedIn: linkedin.com/in/tanay-upreti`,
    projects: () => `1. Discord-LMS - Learning Management System built within the Discord ecosystem
2. Email-Bot - Fun project to use Discord as an email client
3. web-server - A web server built in Rust

Type 'project <number>' to view details about a specific project.`,
    project: (args: string) => {
      const projectNumber = parseInt(args)
      if (isNaN(projectNumber) || projectNumber < 1 || projectNumber > 3) {
        return 'Please specify a valid project number (1-3)'
      }
      
      const projects = [
        `Discord-LMS
Description: Learning Management System built within the Discord ecosystem
GitHub: https://github.com/code-wolf-byte/Discord-LMS`,
        `Email-Bot
Description: Fun project to use Discord as an email client
GitHub: https://github.com/code-wolf-byte/Email-Bot`,
        `web-server
Description: A web server built in Rust
GitHub: https://github.com/code-wolf-byte/reverse-proxy-server/`
      ]
      
      return projects[projectNumber - 1]
    }
  }

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    const [command, ...args] = trimmedCmd.split(' ')
    
    let output = ''
    if (command in commands) {
      output = commands[command as keyof typeof commands](args.join(' '))
    } else if (command) {
      output = `Command not found: ${command}. Type 'help' for available commands.`
    }

    setHistory([...history, { command: trimmedCmd, output }])
    setCurrentCommand('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(currentCommand)
    }
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4">
      <div 
        ref={terminalRef}
        className="container mx-auto overflow-auto"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="mb-4">
          Welcome to my terminal! Type 'help' for available commands.
        </div>
        
        {history.map((entry, i) => (
          <div key={i} className="mb-2">
            <div className="flex">
              <span className="text-blue-400">{currentPath}</span>
              <span className="text-yellow-400">$ </span>
              <span className="ml-1">{entry.command}</span>
            </div>
            {entry.output && (
              <div className="whitespace-pre-wrap">{entry.output}</div>
            )}
          </div>
        ))}

        <div className="flex">
          <span className="text-blue-400">{currentPath}</span>
          <span className="text-yellow-400">$ </span>
          <input
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyPress}
            className="ml-1 bg-transparent outline-none flex-1"
            autoFocus
          />
        </div>
      </div>
    </div>
  )
} 