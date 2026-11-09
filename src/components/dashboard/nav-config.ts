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
    { label: 'Resume', href: '/student/resume', icon: 'FileText' },
    { label: 'Career Discovery', href: '/student/career-discovery', icon: 'Compass' },
    { label: 'Opportunities', href: '/opportunities', icon: 'Briefcase' },
    { label: 'Applications', href: '/student/applications', icon: 'Send' },
    { label: 'Saved', href: '/student/saved', icon: 'BookMarked' },
  ],
  faculty: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: 'LayoutDashboard' },
    { label: 'Profile', href: '/faculty/profile', icon: 'User' },
    { label: 'Opportunities', href: '/opportunities', icon: 'Briefcase' },
    { label: 'Research', href: '/faculty/profile', icon: 'Microscope' },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter/dashboard', icon: 'LayoutDashboard' },
    { label: 'Profile', href: '/recruiter/profile', icon: 'User' },
    { label: 'Manage Opportunities', href: '/recruiter/opportunities', icon: 'Briefcase' },
    { label: 'Create Opportunity', href: '/recruiter/opportunities/create', icon: 'PlusCircle' },
  ],
  institution: [
    { label: 'Dashboard', href: '/institution/dashboard', icon: 'LayoutDashboard' },
    { label: 'Programs', href: '/institution/programs', icon: 'BookMarked' },
    { label: 'Faculty', href: '/institution/faculty', icon: 'Users' },
    { label: 'Analytics', href: '/institution/analytics', icon: 'BarChart3' },
    { label: 'Events', href: '/institution/events', icon: 'Calendar' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Users', href: '/admin/users', icon: 'Users' },
    { label: 'Roles', href: '/admin/roles', icon: 'Shield' },
    { label: 'Analytics', href: '/admin/analytics', icon: 'BarChart3' },
    { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    { label: 'Content', href: '/admin/content', icon: 'FileEdit' },
  ],
};
