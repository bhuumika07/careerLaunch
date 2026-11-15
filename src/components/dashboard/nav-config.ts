export type Role = 'student' | 'job_seeker' | 'admin';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const userNavItems: NavItem[] = [
  { label: 'Overview', href: '/student/dashboard', icon: 'LayoutDashboard' },
  { label: 'Explore Opportunities', href: '/opportunities', icon: 'Search' },
  { label: 'Recommended for Me', href: '/student/recommended', icon: 'Sparkles' },
  { label: 'Saved Opportunities', href: '/student/saved', icon: 'BookMarked' },
  { label: 'Application Tracker', href: '/student/applications', icon: 'Send' },
  { label: 'Career Intelligence', href: '/student/career-discovery', icon: 'Compass' },
  { label: 'Skill Gap Analysis', href: '/student/skill-gap', icon: 'Target' },
  { label: 'Learning Roadmap', href: '/student/roadmap', icon: 'Map' },
  { label: 'My Profile', href: '/student/profile', icon: 'User' },
];

export const navConfig: Record<Role, NavItem[]> = {
  student: userNavItems,
  job_seeker: userNavItems,
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Source Catalogue', href: '/admin/sources', icon: 'Layers' },
    { label: 'User Accounts', href: '/admin/users', icon: 'Users' },
    { label: 'Quality & Verification', href: '/admin/verifications', icon: 'Shield' },
    { label: 'Moderation', href: '/admin/moderation', icon: 'FileEdit' },
    { label: 'System Settings', href: '/admin/settings', icon: 'Settings' },
  ],
};
