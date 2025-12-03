'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  ChevronDown,
  Crown
} from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push('/');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const getRoleBadge = () => {
    switch (user.role) {
      case 'OWNER':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
            <Crown className="h-3 w-3" />
            Owner
          </span>
        );
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        );
      case 'MODERATOR':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
            <Shield className="h-3 w-3" />
            Mod
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
      >
        {user.avatar ? (
          <img 
            src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
            alt={user.username}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user.username?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">#{user.discriminator || '0'}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 border-b bg-secondary/30">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img 
                  src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                  alt={user.username}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-medium text-primary">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground">ID: {user.discordId}</p>
                <div className="mt-1">
                  {getRoleBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profile</span>
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/settings');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </button>

            {(user.role === 'OWNER' || user.role === 'ADMIN') && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/admin');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Crown className="h-4 w-4 text-amber-500" />
                <span>Admin Panel</span>
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="p-2 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
