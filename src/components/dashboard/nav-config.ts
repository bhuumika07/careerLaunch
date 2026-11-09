export type Role = 'student' | 'faculty' | 'recruiter' | 'institution' | 'admin';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navConfig: Record<Role, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: 'LayoutDashboard' },
    { label: 'Profile', href: '/student/profile', icon: 'User' },
    { label: 'Resume Files', href: '/student/resume', icon: 'FileText' },
    { label: 'Resume Builder', href: '/student/resume/builder', icon: 'FileEdit' },
    { label: 'Assessments', href: '/student/assessments', icon: 'Award' },
    { label: 'Skill Gap', href: '/student/skill-gap', icon: 'BarChart3' },
    { label: 'Career Roadmap', href: '/student/roadmap', icon: 'Compass' },
    { label: 'Career Discovery', href: '/student/career-discovery', icon: 'Compass' },
    { label: 'Opportunities', href: '/opportunities', icon: 'Briefcase' },
    { label: 'Applications', href: '/student/applications', icon: 'Send' },
    { label: 'Saved', href: '/student/saved', icon: 'BookMarked' },
  ],
  faculty: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: 'LayoutDashboard' },
    { label: 'Profile & Research', href: '/faculty/profile', icon: 'User' },
    { label: 'Browse Opportunities', href: '/opportunities', icon: 'Briefcase' },
    { label: 'Publish FDP / Project', href: '/faculty/opportunities/create', icon: 'PlusCircle' },
    { label: 'Participants', href: '/faculty/participants', icon: 'Users' },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter/dashboard', icon: 'LayoutDashboard' },
    { label: 'Profile', href: '/recruiter/profile', icon: 'User' },
    { label: 'Manage Opportunities', href: '/recruiter/opportunities', icon: 'Briefcase' },
    { label: 'Post Opportunity', href: '/recruiter/opportunities/create', icon: 'PlusCircle' },
    { label: 'Faculty Discovery', href: '/recruiter/faculty-discovery', icon: 'Search' },
  ],
  institution: [
    { label: 'Dashboard', href: '/institution/dashboard', icon: 'LayoutDashboard' },
    { label: 'Placement & Skills', href: '/institution/analytics', icon: 'BarChart3' },
    { label: 'Faculty & Programs', href: '/institution/faculty', icon: 'Users' },
    { label: 'Events & FDPs', href: '/opportunities', icon: 'Calendar' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Users Management', href: '/admin/users', icon: 'Users' },
    { label: 'Verification Queue', href: '/admin/verifications', icon: 'Shield' },
    { label: 'Moderation & Reports', href: '/admin/moderation', icon: 'FileEdit' },
    { label: 'System Settings', href: '/admin/settings', icon: 'Settings' },
  ],
};
