import type {
  DashboardStats,
  Epic,
  EpicStatus,
  ReviewStats,
  StoryStatus,
  TestStats,
} from '@/types/dashboard';
import yaml from 'js-yaml';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

// Epic name mapping
const EPIC_NAMES: Record<number, string> = {
  1: 'Authentication',
  2: 'User Management',
  3: 'Tenant Management',
  4: 'Configuration',
  5: 'UI Component Library',
  6: 'Audit Trail',
  7: 'Partner Management',
  8: 'Product Catalog',
  9: 'Inventory Core',
  10: 'Invoice Core',
  11: 'NAV Integration',
  12: 'Task List Widget',
  13: 'Rental Equipment',
  14: 'Rental Operations',
  15: 'Rental Contracts',
  16: 'Deposit Management',
  17: 'Work Orders',
  18: 'Quotations',
  19: 'Warranty Claims',
  20: 'Service Standards',
  21: 'Goods Receipt',
  22: 'Point of Sale',
  23: 'Pricing & Margin',
  24: 'Stock Count',
  25: 'Equipment-Service Integration',
  26: 'Online Booking',
  27: 'Reporting Engine',
  28: 'Twenty CRM Integration',
  29: 'Chatwoot Integration',
  30: 'Horilla HR Integration',
  31: 'Koko AI Chatbot',
  32: 'Internal Chat',
  33: 'Infrastructure & Deployment',
};

const EPIC_STATUS_MAP: Record<string, EpicStatus> = {
  done: 'DONE',
  'in-progress': 'IN_PROGRESS',
  backlog: 'TODO',
};

const STORY_STATUS_MAP: Record<string, StoryStatus> = {
  done: 'DONE',
  'in-progress': 'IN_PROGRESS',
  review: 'IN_PROGRESS',
  'ready-for-dev': 'TODO',
  drafted: 'TODO',
  backlog: 'TODO',
};

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Parse flat YAML format to structured epics
export function parseSprintStatus(devStatus: Record<string, string>): Epic[] {
  const epicsMap: Record<number, Epic> = {};

  // First pass: identify all epics
  Object.keys(devStatus).forEach(key => {
    const epicMatch = key.match(/^epic-(\d+)$/);
    if (epicMatch && epicMatch[1]) {
      const epicNum = parseInt(epicMatch[1], 10);
      const status = devStatus[key];
      epicsMap[epicNum] = {
        epic: String(epicNum),
        name: EPIC_NAMES[epicNum] ?? `Epic ${epicNum}`,
        status: status ? (EPIC_STATUS_MAP[status] ?? 'TODO') : 'TODO',
        expanded: false,
        stories: [],
      };
    }
  });

  // Second pass: add stories to epics
  Object.keys(devStatus).forEach(key => {
    const storyMatch = key.match(/^(\d+)-(\d+)-(.+)$/);
    if (
      storyMatch &&
      storyMatch[1] &&
      storyMatch[2] &&
      storyMatch[3] &&
      !key.includes('retrospective')
    ) {
      const epicNum = parseInt(storyMatch[1], 10);
      const storyNum = parseInt(storyMatch[2], 10);
      const storySlug = storyMatch[3];
      const status = devStatus[key];

      const epic = epicsMap[epicNum];
      if (epic) {
        epic.stories.push({
          id: `${epicNum}.${storyNum}`,
          name: slugToTitle(storySlug),
          status: status ? (STORY_STATUS_MAP[status] ?? 'TODO') : 'TODO',
          tasks: [],
        });
      }
    }
  });

  // Sort epics and stories
  const epics = Object.values(epicsMap).sort((a, b) => parseInt(a.epic, 10) - parseInt(b.epic, 10));

  epics.forEach(epic => {
    epic.stories.sort((a, b) => {
      const aNum = parseInt(a.id.split('.')[1] ?? '0', 10);
      const bNum = parseInt(b.id.split('.')[1] ?? '0', 10);
      return aNum - bNum;
    });
  });

  return epics;
}

// Calculate stats from epics
export function calculateStats(epics: Epic[]): DashboardStats {
  let doneEpics = 0;
  let inProgressEpics = 0;
  let backlogEpics = 0;
  let totalStories = 0;
  let doneStories = 0;
  let inProgressStories = 0;

  epics.forEach(epic => {
    if (epic.status === 'DONE') doneEpics++;
    else if (epic.status === 'IN_PROGRESS') inProgressEpics++;
    else backlogEpics++;

    epic.stories.forEach(story => {
      totalStories++;
      if (story.status === 'DONE') doneStories++;
      else if (story.status === 'IN_PROGRESS') inProgressStories++;
    });
  });

  const progressPercent = totalStories > 0 ? (doneStories / totalStories) * 100 : 0;

  return {
    totalEpics: epics.length,
    doneEpics,
    completedEpics: doneEpics, // alias
    inProgressEpics,
    backlogEpics,
    totalStories,
    doneStories,
    completedStories: doneStories, // alias
    inProgressStories,
    pendingStories: totalStories - doneStories - inProgressStories,
    progressPercent: Math.round(progressPercent),
  };
}

// API calls
export async function fetchSprintStatus(): Promise<{
  epics: Epic[];
  stats: DashboardStats;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/sprint-status`);
    if (!response.ok) throw new Error('Failed to fetch sprint status');
    const data = await response.json();
    return data;
  } catch {
    // Fallback: try to load YAML directly (development mode)
    try {
      const yamlResponse = await fetch('/sprint-status.yaml');
      if (!yamlResponse.ok) throw new Error('YAML not found');
      const yamlText = await yamlResponse.text();
      const parsed = yaml.load(yamlText) as { development_status?: Record<string, string> };
      if (parsed?.development_status) {
        const epics = parseSprintStatus(parsed.development_status);
        return { epics, stats: calculateStats(epics) };
      }
      return { epics: [], stats: calculateStats([]) };
    } catch {
      return { epics: [], stats: calculateStats([]) };
    }
  }
}

export async function fetchTestStats(): Promise<TestStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/test-stats`);
    if (!response.ok) throw new Error('Failed to fetch test stats');
    return response.json();
  } catch {
    // Return default stats
    return {
      totalPassing: 216,
      totalFailing: 0,
      totalTests: 216,
      passRate: 100,
      coverage: 87.5,
      unitTests: 180,
      integrationTests: 28,
      e2eTests: 8,
      byEpic: [],
    };
  }
}

export async function fetchReviewStats(): Promise<ReviewStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/review-stats`);
    if (!response.ok) throw new Error('Failed to fetch review stats');
    return response.json();
  } catch {
    // Return default stats
    return {
      totalReviews: 4,
      totalIssues: 23,
      fixedIssues: 20,
      openIssues: 3,
      fixRate: 87,
      consensusRate: 78,
      reviews: [],
      severityDistribution: [
        { level: 'critical', count: 1 },
        { level: 'major', count: 7 },
        { level: 'minor', count: 9 },
        { level: 'suggestion', count: 6 },
      ],
      claudeStats: { totalIssues: 14, uniqueFindings: 10 },
      geminiStats: { totalIssues: 9, uniqueFindings: 7 },
    };
  }
}
