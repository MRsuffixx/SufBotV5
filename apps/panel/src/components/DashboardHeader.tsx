'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { UserMenu } from './UserMenu';
import { Bot, Crown } from 'lucide-react';

interface DashboardHeaderProps {
  activeTab?: 'dashboard' | 'servers' | 'admin';
}

export function DashboardHeader({ activeTab = 'dashboard' }: DashboardHeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <header className="border-b bg-card sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">SufBot</span>
        </div>
        
        <nav className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className={`transition-colors ${
              activeTab === 'dashboard' 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => router.push('/dashboard/servers')}
            className={`transition-colors ${
              activeTab === 'servers' 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Servers
          </button>
          {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
            <button 
              onClick={() => router.push('/dashboard/admin')}
              className={`flex items-center gap-1 transition-colors ${
                activeTab === 'admin' 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Crown className="h-4 w-4 text-amber-500" />
              Admin
            </button>
          )}
        </nav>
        
        <UserMenu />
      </div>
    </header>
  );
}
