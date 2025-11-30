'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import Image from 'next/image';
import { 
  Bot,
  Settings,
  Shield,
  MessageSquare,
  Users,
  Coins,
  Bell,
  Filter,
  ArrowLeft,
  Save,
  Check
} from 'lucide-react';

interface GuildSettings {
  prefix: string;
  language: string;
  timezone: string;
  enabledModules: string[];
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  settings: GuildSettings;
}

const MODULES = [
  { id: 'moderation', name: 'Moderation', icon: Shield, description: 'Ban, kick, mute, warn commands' },
  { id: 'economy', name: 'Economy', icon: Coins, description: 'Currency, daily rewards, shop' },
  { id: 'welcome', name: 'Welcome', icon: Bell, description: 'Welcome & goodbye messages' },
  { id: 'automod', name: 'Auto Moderation', icon: Filter, description: 'Spam, links, bad words filter' },
  { id: 'leveling', name: 'Leveling', icon: Users, description: 'XP and level system' },
  { id: 'logging', name: 'Logging', icon: MessageSquare, description: 'Server activity logs' },
];

export default function ServerManagePage() {
  const router = useRouter();
  const params = useParams();
  const guildId = params.id as string;
  const { isAuthenticated, isLoading, accessToken } = useAuthStore();
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [guildLoading, setGuildLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Settings state
  const [prefix, setPrefix] = useState('!');
  const [language, setLanguage] = useState('en');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (accessToken && guildId) {
      fetchGuild();
    }
  }, [accessToken, guildId]);

  const fetchGuild = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guilds/${guildId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGuild(data);
        setPrefix(data.settings?.prefix || '!');
        setLanguage(data.settings?.language || 'en');
        setEnabledModules(data.settings?.enabledModules || ['moderation']);
      } else if (response.status === 404) {
        router.push('/dashboard/servers');
      }
    } catch (error) {
      console.error('Failed to fetch guild:', error);
    } finally {
      setGuildLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guilds/${guildId}/settings`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix,
          language,
          enabledModules,
        }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setEnabledModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getGuildIcon = () => {
    if (guild?.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }
    return null;
  };

  if (isLoading || guildLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Server not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/servers')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              {getGuildIcon() ? (
                <Image
                  src={getGuildIcon()!}
                  alt={guild.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {guild.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-semibold">{guild.name}</h1>
                <p className="text-sm text-muted-foreground">Server Settings</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {[
                { id: 'general', name: 'General', icon: Settings },
                { id: 'modules', name: 'Modules', icon: Bot },
                { id: 'moderation', name: 'Moderation', icon: Shield },
                { id: 'welcome', name: 'Welcome', icon: Bell },
                { id: 'economy', name: 'Economy', icon: Coins },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-6">
                  <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Command Prefix
                      </label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="!"
                        maxLength={5}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        The prefix used for text commands (slash commands always work)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="en">English</option>
                        <option value="tr">Türkçe</option>
                        <option value="de">Deutsch</option>
                        <option value="fr">Français</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-6">
                  <h2 className="text-xl font-semibold mb-4">Bot Modules</h2>
                  <p className="text-muted-foreground mb-6">
                    Enable or disable bot features for this server.
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {MODULES.map((module) => (
                      <div 
                        key={module.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          enabledModules.includes(module.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              enabledModules.includes(module.id)
                                ? 'bg-primary/20 text-primary'
                                : 'bg-secondary'
                            }`}>
                              <module.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{module.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {module.description}
                              </p>
                            </div>
                          </div>
                          <div className={`w-10 h-6 rounded-full transition-colors ${
                            enabledModules.includes(module.id)
                              ? 'bg-primary'
                              : 'bg-secondary'
                          }`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                              enabledModules.includes(module.id)
                                ? 'translate-x-4 ml-0.5'
                                : 'translate-x-0.5'
                            }`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Moderation Settings</h2>
                <p className="text-muted-foreground">
                  Configure moderation features like auto-mod, logging channels, and punishment settings.
                </p>
                <div className="mt-6 p-8 border border-dashed rounded-lg text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Moderation settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'welcome' && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Welcome Messages</h2>
                <p className="text-muted-foreground">
                  Configure welcome and goodbye messages for new members.
                </p>
                <div className="mt-6 p-8 border border-dashed rounded-lg text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Welcome settings coming soon...
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'economy' && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Economy Settings</h2>
                <p className="text-muted-foreground">
                  Configure the economy system, currency name, and rewards.
                </p>
                <div className="mt-6 p-8 border border-dashed rounded-lg text-center">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Economy settings coming soon...
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
