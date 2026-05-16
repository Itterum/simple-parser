export interface Task {
  id: number;
  task_key: string;
  url: string;
  extractor_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: any;
  updated_at: string;
}

export interface Metrics {
  total_tasks: number;
  pending_tasks: number;
  processing_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
}

export interface DashboardData {
  username: string;
  tasks: Task[];
  metrics: Metrics;
}
