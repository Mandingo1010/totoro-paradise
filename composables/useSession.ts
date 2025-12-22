interface Session {
  status: string;
  msg: null;
  data: null;
  obj: null;
  body: null;
  obj1: null;
  resultMap: null;
  total: number;
  wxLoginStatus: number;
  msgList: unknown[];
  message: null | string;
  studentId: string;
  stuNumber: string;
  stuName: string;
  phoneNumber: string;
  schoolName: string;
  schoolId: string;
  campusName: string;
  campusId: string;
  collegeName: string;
  collegeId: null;
  naturalId: string;
  naturalName: string;
  className: null;
  gender: null;
  headPortrait: string;
  sex: string;
  token: string;
  code: string;

  // Free run related data
  freeRunPreferences?: {
    defaultTemplate?: string;
    preferredDistance?: number;
    preferredSpeed?: number;
    autoSubmit?: boolean;
    notificationsEnabled?: boolean;
  };
  freeRunStats?: {
    totalRuns: number;
    totalDistance: number;
    totalDuration: number;
    averageSpeed: number;
    lastRunDate?: string;
    bestTime?: string;
    longestDistance?: number;
  };
}

export const useSession = () => useState<Session>('totoroSession');

export default useSession;
