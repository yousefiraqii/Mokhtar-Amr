import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch counts
  const [{ count: projectCount }, { count: certCount }] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      label: 'Projects',
      value: projectCount ?? 0,
      href: '/admin/projects',
      color: 'from-indigo-600 to-indigo-800',
      icon: (
        <svg className="w-8 h-8 text-indigo-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
    },
    {
      label: 'Certificates',
      value: certCount ?? 0,
      href: '/admin/certificates',
      color: 'from-emerald-600 to-emerald-800',
      icon: (
        <svg className="w-8 h-8 text-emerald-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back to your portfolio admin panel.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 flex items-center justify-between hover:opacity-90 transition-opacity`}
          >
            <div>
              <p className="text-sm font-medium text-white/70">{stat.label}</p>
              <p className="text-4xl font-bold text-white mt-1">{stat.value}</p>
            </div>
            {stat.icon}
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/projects', label: 'Manage Projects', desc: 'Add, edit or remove projects' },
          { href: '/admin/certificates', label: 'Manage Certificates', desc: 'Update your credentials' },
          { href: '/admin/profile', label: 'Edit Profile', desc: 'Update bio, skills & social links' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-gray-900 border border-gray-800 hover:border-indigo-600/50 rounded-xl p-5 transition-colors group"
          >
            <p className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{action.label}</p>
            <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
