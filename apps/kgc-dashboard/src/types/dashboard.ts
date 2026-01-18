// Epic and Story types
export type EpicStatus = 'DONE' | 'IN_PROGRESS' | 'TODO';
export type StoryStatus = 'DONE' | 'IN_PROGRESS' | 'TODO' | 'REVIEW';
export type TaskStatus = 'DONE' | 'IN_PROGRESS' | 'TODO';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  description?: string | undefined;
  subtasks?: Subtask[] | undefined;
}

export interface Subtask {
  name: string;
  status: TaskStatus;
}

export interface Story {
  id: string;
  name: string;
  status: StoryStatus;
  description?: string | undefined;
  acceptanceCriteria?: AcceptanceCriteria[] | undefined;
  tasks: string[]; // simplified to string array for compatibility
}

export interface AcceptanceCriteria {
  text: string;
  done: boolean;
}

export interface Epic {
  epic: string;
  name: string;
  status: EpicStatus;
  expanded?: boolean | undefined;
  stories: Story[];
}

// Stats types
export interface DashboardStats {
  totalEpics: number;
  doneEpics: number;
  completedEpics: number; // alias for doneEpics
  inProgressEpics: number;
  backlogEpics: number;
  totalStories: number;
  doneStories: number;
  completedStories: number; // alias for doneStories
  inProgressStories: number;
  pendingStories: number;
  progressPercent: number;
}

export interface TestStats {
  totalPassing: number;
  totalFailing: number;
  totalTests: number;
  passRate: number;
  coverage: number;
  unitTests: number;
  integrationTests: number;
  e2eTests: number;
  byEpic: EpicTestStats[];
}

export interface EpicTestStats {
  epic: string;
  name: string;
  passing: number;
  total: number;
  expanded?: boolean | undefined;
  files?: TestFile[] | undefined;
  tests?: TestResult[] | undefined;
}

export interface TestFile {
  name: string;
  tests: number;
  duration?: number | undefined;
}

export interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
}

// Review types
export type Severity = 'critical' | 'major' | 'minor' | 'suggestion';
export type Reviewer = 'Claude' | 'Gemini' | 'Both';

export interface ReviewIssue {
  id: number | string;
  severity: string; // widened for compatibility
  title: string;
  description: string;
  file: string;
  line?: number | undefined;
  reviewer: string; // widened for compatibility
  fixed: boolean;
  status?: string | undefined;
}

export interface Review {
  id: string;
  storyId: string;
  story: string;
  epic: string;
  issuesFound: number;
  issuesFixed: number;
  claudeIssues: number;
  geminiIssues: number;
  severityCounts: SeverityCounts;
  issues: ReviewIssue[];
}

export interface SeverityCounts {
  critical?: number | undefined;
  major?: number | undefined;
  minor?: number | undefined;
  suggestion?: number | undefined;
}

export interface ReviewStats {
  totalReviews: number;
  totalIssues: number;
  fixedIssues: number;
  openIssues: number;
  fixRate: number;
  consensusRate: number;
  reviews: Review[];
  severityDistribution: { level: string; count: number }[];
  claudeStats: { totalIssues: number; uniqueFindings: number };
  geminiStats: { totalIssues: number; uniqueFindings: number };
}

// View types
export type ViewId =
  | 'executive'
  | 'developer'
  | 'qa'
  | 'statistics'
  | 'knowledge'
  | 'downloads'
  | 'changelog';
export type DeveloperTab = 'summary' | 'epics' | 'stories' | 'reviews' | 'tests';
export type QATab = 'summary' | 'tests' | 'reviews';

export interface ViewConfig {
  id: ViewId;
  name: string;
  icon: string;
  description: string;
}

// Filter types
export interface EpicFilter {
  search: string;
  status: EpicStatus | '';
}

export interface StoryFilter {
  search: string;
  status: StoryStatus | '';
  epic: string;
}

export interface ReviewFilter {
  search: string;
  reviewer: Reviewer | '';
  severity: Severity | '';
}
