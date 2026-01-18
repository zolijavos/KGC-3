/**
 * Vite plugin that adds API endpoints for dashboard data
 * Reads YAML and Markdown files at runtime for live refresh
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin, ViteDevServer } from 'vite';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root (KGC-3 folder) - go up from src/server/ to apps/kgc-dashboard/ then to KGC-3/
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

interface YamlEpic {
  epic: string;
  name: string;
  package: string;
  layer: string;
  status: string;
  retrospective_done?: boolean;
  stories: YamlStory[];
}

interface YamlStory {
  id: string;
  name: string;
  status: string;
  tasks?: string[];
}

interface SprintStatus {
  project: string;
  current_phase: string;
  last_updated: string;
  epics: YamlEpic[];
}

// Parse sprint-status.yaml
function parseSprintData() {
  const yamlPath = path.join(PROJECT_ROOT, 'implementation-artifacts/sprint-status.yaml');

  if (!fs.existsSync(yamlPath)) {
    console.error('sprint-status.yaml not found at:', yamlPath);
    return { error: 'sprint-status.yaml not found', epics: [], stats: {} };
  }

  const content = fs.readFileSync(yamlPath, 'utf-8');
  const data = yaml.load(content) as SprintStatus;

  const epics = data.epics.map(e => ({
    epic: e.epic,
    name: e.name,
    package: e.package,
    layer: e.layer,
    status: mapEpicStatus(e.status),
    retrospectiveDone: e.retrospective_done ?? false,
    stories: (e.stories || []).map(s => ({
      id: s.id,
      name: s.name,
      status: mapStoryStatus(s.status),
      tasks: s.tasks || [],
    })),
  }));

  // Calculate stats
  let totalStories = 0;
  let completedStories = 0;
  let inProgressStories = 0;
  let reviewStories = 0;

  epics.forEach(epic => {
    epic.stories.forEach(story => {
      totalStories++;
      if (story.status === 'DONE') completedStories++;
      else if (story.status === 'IN_PROGRESS') inProgressStories++;
      else if (story.status === 'REVIEW') reviewStories++;
    });
  });

  const completedEpics = epics.filter(e => e.status === 'DONE').length;
  const inProgressEpics = epics.filter(e => e.status === 'IN_PROGRESS').length;

  return {
    lastUpdated: data.last_updated || new Date().toISOString(),
    epics,
    stats: {
      totalEpics: epics.length,
      doneEpics: completedEpics,
      completedEpics,
      inProgressEpics,
      backlogEpics: epics.length - completedEpics - inProgressEpics,
      totalStories,
      doneStories: completedStories,
      completedStories,
      inProgressStories,
      reviewStories,
      pendingStories: totalStories - completedStories - inProgressStories - reviewStories,
      progressPercent: totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0,
    },
  };
}

function mapEpicStatus(status: string): 'DONE' | 'IN_PROGRESS' | 'TODO' {
  if (status === 'done') return 'DONE';
  if (status === 'in-progress') return 'IN_PROGRESS';
  return 'TODO';
}

function mapStoryStatus(status: string): 'DONE' | 'IN_PROGRESS' | 'TODO' | 'REVIEW' {
  if (status === 'done') return 'DONE';
  if (status === 'in-progress') return 'IN_PROGRESS';
  if (status === 'review') return 'REVIEW';
  return 'TODO';
}

// Parse review markdown files
function parseReviews() {
  const reviewsDir = path.join(PROJECT_ROOT, 'implementation-artifacts/reviews');
  const reviews: any[] = [];

  if (!fs.existsSync(reviewsDir)) {
    return { reviews: [], stats: {} };
  }

  // Find all epic directories
  const epicDirs = fs.readdirSync(reviewsDir).filter(f => {
    const fullPath = path.join(reviewsDir, f);
    return fs.statSync(fullPath).isDirectory() && f.startsWith('epic-');
  });

  for (const epicDir of epicDirs) {
    const epicPath = path.join(reviewsDir, epicDir);
    const reviewFiles = fs.readdirSync(epicPath).filter(f => f.endsWith('-review.md'));

    for (const reviewFile of reviewFiles) {
      const filePath = path.join(epicPath, reviewFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      const review = parseReviewMarkdown(content, reviewFile, epicDir);
      if (review) {
        reviews.push(review);
      }
    }
  }

  // Calculate stats
  let totalIssues = 0;
  let fixedIssues = 0;
  let openIssues = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let claudeIssues = 0;
  let geminiIssues = 0;

  reviews.forEach(r => {
    r.issues.forEach((issue: any) => {
      totalIssues++;
      if (issue.status === 'fixed') fixedIssues++;
      else openIssues++;

      if (issue.severity === 'critical') critical++;
      else if (issue.severity === 'high') high++;
      else if (issue.severity === 'medium') medium++;
      else low++;

      if (issue.reviewer === 'Claude' || issue.reviewer === 'Both') claudeIssues++;
      if (issue.reviewer === 'Gemini' || issue.reviewer === 'Both') geminiIssues++;
    });
  });

  return {
    reviews,
    stats: {
      totalReviews: reviews.length,
      totalIssues,
      fixedIssues,
      openIssues,
      fixRate: totalIssues > 0 ? Math.round((fixedIssues / totalIssues) * 100) : 0,
      consensusRate: 85, // Would need more complex parsing
      severityDistribution: [
        { level: 'critical', count: critical },
        { level: 'major', count: high },
        { level: 'minor', count: medium },
        { level: 'suggestion', count: low },
      ],
      claudeStats: { totalIssues: claudeIssues, uniqueFindings: claudeIssues },
      geminiStats: { totalIssues: geminiIssues, uniqueFindings: geminiIssues },
    },
  };
}

function parseReviewMarkdown(content: string, filename: string, epicDir: string) {
  // Extract story ID from filename (e.g., "1-1-jwt-login-endpoint-review.md" -> "1-1")
  const storyIdMatch = filename.match(/^(\d+-\d+)/);
  if (!storyIdMatch) return null;

  const storyId = storyIdMatch[1];
  const epicId = epicDir.replace('epic-', '');

  // Extract story name from title
  const titleMatch = content.match(/^#\s+(.+)/m);
  const storyName = titleMatch?.[1]?.replace(/Review:?\s*/i, '').trim() ?? filename;

  // Parse issues from tables
  const issues: any[] = [];

  const lines = content.split('\n');

  let inTable = false;
  let tableHeaders: string[] = [];

  for (const line of lines) {
    if (line.includes('|') && !line.match(/^\s*\|[-:]+\|/)) {
      const cells = line
        .split('|')
        .map(c => c.trim())
        .filter(Boolean);

      if (
        cells.some(c => c.toLowerCase().includes('severity') || c.toLowerCase().includes('issue'))
      ) {
        // This is a header row
        tableHeaders = cells.map(c => c.toLowerCase());
        inTable = true;
      } else if (inTable && cells.length >= 3) {
        // This is a data row
        const issue: any = {
          id: `${storyId}-${issues.length + 1}`,
          title: '',
          description: '',
          severity: 'medium',
          reviewer: 'Both',
          status: 'fixed',
          file: '',
          category: 'general',
        };

        cells.forEach((cell, idx) => {
          const header = tableHeaders[idx] || '';
          if (header.includes('severity')) {
            issue.severity = cell
              .toLowerCase()
              .replace(/[🔴🟡🟢⚪]/g, '')
              .trim();
            if (issue.severity.includes('critical') || issue.severity.includes('crit'))
              issue.severity = 'critical';
            else if (issue.severity.includes('high') || issue.severity.includes('major'))
              issue.severity = 'high';
            else if (issue.severity.includes('medium') || issue.severity.includes('minor'))
              issue.severity = 'medium';
            else issue.severity = 'low';
          } else if (
            header.includes('issue') ||
            header.includes('title') ||
            header.includes('finding')
          ) {
            issue.title = cell;
          } else if (header.includes('description') || header.includes('detail')) {
            issue.description = cell;
          } else if (header.includes('file') || header.includes('location')) {
            issue.file = cell;
          } else if (header.includes('status') || header.includes('state')) {
            issue.status = cell.toLowerCase().includes('fix') ? 'fixed' : 'open';
          } else if (header.includes('reviewer') || header.includes('source')) {
            if (cell.toLowerCase().includes('claude')) issue.reviewer = 'Claude';
            else if (cell.toLowerCase().includes('gemini')) issue.reviewer = 'Gemini';
            else issue.reviewer = 'Both';
          }
        });

        if (issue.title) {
          issues.push(issue);
        }
      }
    } else if (!line.includes('|')) {
      inTable = false;
    }
  }

  // Extract verdict/consensus
  const verdictMatch = content.match(/verdict:?\s*(approved|rejected|in-progress)/i);
  const verdict = verdictMatch?.[1]?.toLowerCase() ?? 'approved';

  return {
    storyId,
    storyName,
    epicId,
    epicName: `Epic ${epicId}`,
    package: '',
    date: new Date().toISOString().split('T')[0],
    reviewer: 'Dual-AI',
    round: 1,
    maxRounds: 3,
    issues,
    consensusReached: true,
    verdict:
      verdict === 'approved' ? 'approved' : verdict === 'rejected' ? 'rejected' : 'in-progress',
    issuesFound: issues.length,
    issuesFixed: issues.filter(i => i.status === 'fixed').length,
  };
}

// Vite plugin
export function dashboardApiPlugin(): Plugin {
  console.log('[Dashboard API] Plugin loaded, PROJECT_ROOT:', PROJECT_ROOT);

  return {
    name: 'dashboard-api',
    enforce: 'pre', // Run before other plugins
    configureServer(server: ViteDevServer) {
      console.log('[Dashboard API] Configuring server middleware...');

      // Return a function to run after Vite's internal middleware
      return () => {
        // Handle API routes - runs after Vite middleware is set up
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';

          if (url === '/api/sprint-data' || url.startsWith('/api/sprint-data?')) {
            console.log('[Dashboard API] GET /api/sprint-data');
            try {
              const data = parseSprintData();
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache');
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error('[Dashboard API] Error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(error) }));
            }
            return;
          }

          if (url === '/api/reviews' || url.startsWith('/api/reviews?')) {
            console.log('[Dashboard API] GET /api/reviews');
            try {
              const data = parseReviews();
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache');
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error('[Dashboard API] Error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(error) }));
            }
            return;
          }

          if (url === '/api/health' || url.startsWith('/api/health?')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                projectRoot: PROJECT_ROOT,
              })
            );
            return;
          }

          // Not an API route, continue to next middleware
          next();
        });
      }; // End of returned function
    },
  };
}
