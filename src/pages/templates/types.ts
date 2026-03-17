/* eslint-disable @typescript-eslint/no-explicit-any */
export interface UserInfo {
  id: number;
  firstName: string;
  surname: string;
}

export interface EmailTemplate {
  systemGenerated?: boolean;
  content: string;
  id: number;
  name: string;
  type?: any;
  createdBy: UserInfo;
  createdAt: string;
  lastModifiedBy?: UserInfo;
  EmailTemplate?: string;
  lastModifiedAt?: string;
  actual: boolean;
  templateType?: { id: number; type: string; name: string };
}
