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
    { label: 'Assessments', href: '/student/assessments', icon: 'ClipboardCheck' },
    { label: 'Opportunities', href: '/student/opportunities', icon: 'Briefcase' },
    { label: 'Applications', href: '/student/applications', icon: 'Send' },
    { label: 'Roadmap', href: '/student/roadmap', icon: 'Map' },
  ],
  faculty: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: 'LayoutDashboard' },
    { label: 'My Courses', href: '/faculty/courses', icon: 'BookOpen' },
    { label: 'Students', href: '/faculty/students', icon: 'Users' },
    { label: 'Assessments', href: '/faculty/assessments', icon: 'ClipboardCheck' },
    { label: 'Research', href: '/faculty/research', icon: 'Microscope' },
    { label: 'FDPs', href: '/faculty/fdps', icon: 'GraduationCap' },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter/dashboard', icon: 'LayoutDashboard' },
    { label: 'Post Jobs', href: '/recruiter/jobs', icon: 'PlusCircle' },
    { label: 'Applications', href: '/recruiter/applications', icon: 'Inbox' },
    { label: 'Talent Search', href: '/recruiter/talent', icon: 'Search' },
    { label: 'Events', href: '/recruiter/events', icon: 'Calendar' },
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
