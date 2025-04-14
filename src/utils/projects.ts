import config from '@/config/config.json';

export interface ProjectConfig {
  name: string;
  description: string;
  github_url: string;
  is_pinned: boolean;
  tech_stack: string[];
  tech_color: {
    [key: string]: string;
  };
}

export interface ProjectsConfig {
  projects: {
    [key: string]: ProjectConfig;
  };
}

const projectsConfig = config as ProjectsConfig;

export const getProjects = (): ProjectConfig[] => {
  return Object.values(projectsConfig.projects);
};

export const getPinnedProjects = (): ProjectConfig[] => {
  return Object.values(projectsConfig.projects).filter(project => project.is_pinned);
};

export const getProjectBySlug = (slug: string): ProjectConfig | undefined => {
  return projectsConfig.projects[slug];
}; 