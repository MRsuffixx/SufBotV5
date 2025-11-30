'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import Image from 'next/image';
import { 
  Server, 
  Settings, 
  Plus,
  Crown,
  Shield,
  Bot
} from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  hasBot: boolean;
}

export default function ServersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, accessToken } = useAuthStore();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (accessToken) {
      fetchGuilds();
    }
  }, [accessToken]);

  const fetchGuilds = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGuilds(data);
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    } finally {
      setGuildsLoading(false);
    }
  };

  const getGuildIcon = (guild: Guild) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }
    return null;
  };

  const handleManage = (guildId: string) => {
    router.push(`/dashboard/servers/${guildId}`);
  };

  const handleInvite = (guildId: string) => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1444623911290671114';
    const permissions = '8'; // Administrator
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands&guild_id=${guildId}`;
    window.open(inviteUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SufBot Dashboard</span>
          </div>
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/dashboard/servers')}
              className="text-foreground font-medium"
            >
              Servers
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Servers</h1>
          <p className="text-muted-foreground">
            Select a server to manage or invite the bot to a new server.
          </p>
        </div>

        {guildsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-secondary rounded mb-2" />
                    <div className="h-4 w-20 bg-secondary rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <div className="text-center py-12">
            <Server className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No servers found</h3>
            <p className="text-muted-foreground">
              You need to have admin permissions in a server to manage it.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guilds.map((guild) => (
              <div 
                key={guild.id} 
                className="rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  {getGuildIcon(guild) ? (
                    <Image
                      src={getGuildIcon(guild)!}
                      alt={guild.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {guild.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{guild.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {guild.owner && (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          Owner
                        </span>
                      )}
                      {!guild.owner && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {guild.hasBot ? (
                  <button
                    onClick={() => handleManage(guild.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => handleInvite(guild.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2 font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Invite Bot
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
