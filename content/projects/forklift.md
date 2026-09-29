[project]
name = "Forklift"
tagline = "Backend for Devil2Devil, ASU's Discord community."
link = "https://github.com/code-wolf-byte/forklift"
status = "active"
year = "2025"
stack = ["Python", "Flask", "py-cord", "React", "AWS Bedrock"]

[content]
A Flask application paired with a Discord bot that verifies students, manages
Discord roles, tracks server activity, runs support tickets and answers
student questions, all behind a React admin dashboard. The second iteration
of Forkman, rebuilt around single sign-on.

- Student verification: ASU CAS sign-in linked to Discord through OAuth, with roles granted automatically
- Salesforce sync to keep role assignments matched to enrollment data
- A Discord ticketing system with categories, transcripts and attachments
- Server analytics: messages, voice sessions, forum activity and event attendance
- A Q&A bot that answers questions from an AWS Bedrock (Claude) knowledge base
- Scheduled jobs for SFTP uploads and Google Sheets sync
