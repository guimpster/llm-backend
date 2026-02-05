export interface TriageUsage {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  model: string;
}

export interface TriageFlags {
  requires_human: boolean;
  is_abusive: boolean;
  missing_info: boolean;
  is_vip_customer: boolean;
  [key: string]: boolean;
}

export interface TriageResponse {
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  flags: TriageFlags;
  usage: TriageUsage;
}

export interface ILLMProvider {
  name: string;
  triage(subject: string, body: string): Promise<TriageResponse>;
}
