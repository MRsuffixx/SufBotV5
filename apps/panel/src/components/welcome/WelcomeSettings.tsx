'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  Hash,
  Type,
  AlignLeft,
  Image,
  Palette,
  Link,
  Clock,
  User,
  AtSign,
} from 'lucide-react';

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  enabled: boolean;
  color: string;
  title: string;
  description: string;
  thumbnail: string;
  image: string;
  footer: string;
  footerIcon: string;
  author: string;
  authorIcon: string;
  authorUrl: string;
  timestamp: boolean;
  fields: EmbedField[];
}

interface WelcomeConfig {
  // Welcome Channel Message
  welcomeEnabled: boolean;
  welcomeChannelId: string;
  welcomeMessageType: 'text' | 'embed';
  welcomeMessage: string;
  welcomeEmbed: EmbedData;

  // DM Message
  dmEnabled: boolean;
  dmMessageType: 'text' | 'embed';
  dmMessage: string;
  dmEmbed: EmbedData;

  // Auto Roles
  autoRolesEnabled: boolean;
  autoRoles: string[];

  // Leave Message
  leaveEnabled: boolean;
  leaveChannelId: string;
  leaveMessageType: 'text' | 'embed';
  leaveMessage: string;
  leaveEmbed: EmbedData;
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface WelcomeSettingsProps {
  guildId: string;
  accessToken: string;
  onSave: (config: WelcomeConfig) => void;
  initialConfig?: Partial<WelcomeConfig>;
  channels: Channel[];
  roles: Role[];
}

const defaultEmbed: EmbedData = {
  enabled: true,
  color: '#5865F2',
  title: 'Welcome to {server}!',
  description: 'Hey {user}, welcome to **{server}**! You are member #{memberCount}.',
  thumbnail: '{user.avatar}',
  image: '',
  footer: 'Enjoy your stay!',
  footerIcon: '{server.icon}',
  author: '',
  authorIcon: '',
  authorUrl: '',
  timestamp: true,
  fields: [],
};

const defaultConfig: WelcomeConfig = {
  welcomeEnabled: false,
  welcomeChannelId: '',
  welcomeMessageType: 'embed',
  welcomeMessage: 'Welcome {user} to {server}! 🎉',
  welcomeEmbed: { ...defaultEmbed },

  dmEnabled: false,
  dmMessageType: 'text',
  dmMessage: 'Welcome to {server}! Please read the rules and enjoy your stay.',
  dmEmbed: { ...defaultEmbed, title: 'Welcome!', description: 'Thanks for joining {server}!' },

  autoRolesEnabled: false,
  autoRoles: [],

  leaveEnabled: false,
  leaveChannelId: '',
  leaveMessageType: 'embed',
  leaveMessage: '{user.tag} has left the server. 👋',
  leaveEmbed: { 
    ...defaultEmbed, 
    title: 'Goodbye!', 
    description: '{user.tag} has left **{server}**.',
    color: '#ED4245',
  },
};

const PLACEHOLDERS = [
  { key: '{user}', description: 'Mentions the user' },
  { key: '{user.tag}', description: 'Username#0000' },
  { key: '{user.name}', description: 'Username' },
  { key: '{user.id}', description: 'User ID' },
  { key: '{user.avatar}', description: 'User avatar URL' },
  { key: '{server}', description: 'Server name' },
  { key: '{server.id}', description: 'Server ID' },
  { key: '{server.icon}', description: 'Server icon URL' },
  { key: '{memberCount}', description: 'Total member count' },
];

export default function WelcomeSettings({
  guildId,
  accessToken,
  onSave,
  initialConfig,
  channels,
  roles,
}: WelcomeSettingsProps) {
  const [config, setConfig] = useState<WelcomeConfig>({ ...defaultConfig, ...initialConfig });
  const [expandedSections, setExpandedSections] = useState({
    welcome: true,
    dm: false,
    autoRoles: false,
    leave: false,
  });
  const [showPreview, setShowPreview] = useState<'welcome' | 'dm' | 'leave' | null>(null);

  const textChannels = channels.filter(c => c.type === 0);
  const assignableRoles = roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);

  // Call onSave whenever config changes
  useEffect(() => {
    onSave(config);
  }, [config]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = <K extends keyof WelcomeConfig>(key: K, value: WelcomeConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateEmbed = (
    type: 'welcomeEmbed' | 'dmEmbed' | 'leaveEmbed',
    key: keyof EmbedData,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: value },
    }));
  };

  const addField = (type: 'welcomeEmbed' | 'dmEmbed' | 'leaveEmbed') => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        fields: [...prev[type].fields, { name: 'Field Name', value: 'Field Value', inline: false }],
      },
    }));
  };

  const updateField = (
    type: 'welcomeEmbed' | 'dmEmbed' | 'leaveEmbed',
    index: number,
    key: keyof EmbedField,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        fields: prev[type].fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
      },
    }));
  };

  const removeField = (type: 'welcomeEmbed' | 'dmEmbed' | 'leaveEmbed', index: number) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        fields: prev[type].fields.filter((_, i) => i !== index),
      },
    }));
  };

  const toggleAutoRole = (roleId: string) => {
    setConfig(prev => ({
      ...prev,
      autoRoles: prev.autoRoles.includes(roleId)
        ? prev.autoRoles.filter(r => r !== roleId)
        : [...prev.autoRoles, roleId],
    }));
  };

  // Preview component for embeds
  const EmbedPreview = ({ embed, type }: { embed: EmbedData; type: string }) => {
    const previewText = (text: string) => {
      return text
        .replace(/{user}/g, '@ExampleUser')
        .replace(/{user\.tag}/g, 'ExampleUser#0000')
        .replace(/{user\.name}/g, 'ExampleUser')
        .replace(/{user\.id}/g, '123456789012345678')
        .replace(/{user\.avatar}/g, 'https://cdn.discordapp.com/embed/avatars/0.png')
        .replace(/{server}/g, 'Example Server')
        .replace(/{server\.id}/g, '987654321098765432')
        .replace(/{server\.icon}/g, 'https://cdn.discordapp.com/embed/avatars/1.png')
        .replace(/{memberCount}/g, '1,234');
    };

    return (
      <div className="bg-[#2f3136] rounded-lg p-4 max-w-lg">
        <div 
          className="border-l-4 rounded bg-[#36393f] p-4"
          style={{ borderColor: embed.color }}
        >
          {/* Author */}
          {embed.author && (
            <div className="flex items-center gap-2 mb-2">
              {embed.authorIcon && (
                <img 
                  src={previewText(embed.authorIcon)} 
                  alt="" 
                  className="w-6 h-6 rounded-full"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span className="text-sm font-medium text-white">
                {previewText(embed.author)}
              </span>
            </div>
          )}

          {/* Title */}
          {embed.title && (
            <h3 className="text-white font-semibold mb-2">
              {previewText(embed.title)}
            </h3>
          )}

          {/* Description */}
          {embed.description && (
            <p className="text-gray-300 text-sm mb-3 whitespace-pre-wrap">
              {previewText(embed.description)}
            </p>
          )}

          {/* Fields */}
          {embed.fields.length > 0 && (
            <div className="grid gap-2 mb-3" style={{ 
              gridTemplateColumns: embed.fields.some(f => f.inline) 
                ? 'repeat(auto-fill, minmax(150px, 1fr))' 
                : '1fr' 
            }}>
              {embed.fields.map((field, i) => (
                <div key={i} className={field.inline ? '' : 'col-span-full'}>
                  <div className="text-white text-sm font-semibold">{previewText(field.name)}</div>
                  <div className="text-gray-300 text-sm">{previewText(field.value)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Image */}
          {embed.image && (
            <img 
              src={previewText(embed.image)} 
              alt="" 
              className="rounded max-w-full mb-3"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}

          {/* Thumbnail */}
          {embed.thumbnail && (
            <img 
              src={previewText(embed.thumbnail)} 
              alt="" 
              className="absolute top-4 right-4 w-20 h-20 rounded"
              style={{ position: 'relative', float: 'right', marginLeft: '16px' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}

          {/* Footer */}
          {(embed.footer || embed.timestamp) && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              {embed.footerIcon && (
                <img 
                  src={previewText(embed.footerIcon)} 
                  alt="" 
                  className="w-5 h-5 rounded-full"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span>{previewText(embed.footer)}</span>
              {embed.footer && embed.timestamp && <span>•</span>}
              {embed.timestamp && <span>Today at 12:00 PM</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Embed Editor Component
  const EmbedEditor = ({ 
    embed, 
    type,
    onUpdate,
  }: { 
    embed: EmbedData; 
    type: 'welcomeEmbed' | 'dmEmbed' | 'leaveEmbed';
    onUpdate: (key: keyof EmbedData, value: any) => void;
  }) => (
    <div className="space-y-4 mt-4">
      {/* Color Picker */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium w-32">
          <Palette className="h-4 w-4" />
          Embed Color
        </label>
        <input
          type="color"
          value={embed.color}
          onChange={(e) => onUpdate('color', e.target.value)}
          className="w-12 h-8 rounded cursor-pointer"
        />
        <input
          type="text"
          value={embed.color}
          onChange={(e) => onUpdate('color', e.target.value)}
          className="w-28 px-3 py-1.5 rounded border bg-background text-sm"
          placeholder="#5865F2"
        />
      </div>

      {/* Author */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4" />
          Author
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={embed.author}
            onChange={(e) => onUpdate('author', e.target.value)}
            className="px-3 py-2 rounded border bg-background text-sm"
            placeholder="Author name"
          />
          <input
            type="text"
            value={embed.authorIcon}
            onChange={(e) => onUpdate('authorIcon', e.target.value)}
            className="px-3 py-2 rounded border bg-background text-sm"
            placeholder="Author icon URL"
          />
          <input
            type="text"
            value={embed.authorUrl}
            onChange={(e) => onUpdate('authorUrl', e.target.value)}
            className="px-3 py-2 rounded border bg-background text-sm"
            placeholder="Author URL"
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Type className="h-4 w-4" />
          Title
        </label>
        <input
          type="text"
          value={embed.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          className="w-full px-3 py-2 rounded border bg-background text-sm"
          placeholder="Embed title"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <AlignLeft className="h-4 w-4" />
          Description
        </label>
        <textarea
          value={embed.description}
          onChange={(e) => onUpdate('description', e.target.value)}
          className="w-full px-3 py-2 rounded border bg-background text-sm min-h-[100px] resize-y"
          placeholder="Embed description (supports markdown)"
        />
      </div>

      {/* Thumbnail & Image */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Image className="h-4 w-4" />
            Thumbnail URL
          </label>
          <input
            type="text"
            value={embed.thumbnail}
            onChange={(e) => onUpdate('thumbnail', e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background text-sm"
            placeholder="{user.avatar}"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Image className="h-4 w-4" />
            Image URL
          </label>
          <input
            type="text"
            value={embed.image}
            onChange={(e) => onUpdate('image', e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background text-sm"
            placeholder="https://example.com/image.png"
          />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <AlignLeft className="h-4 w-4" />
            Fields
          </label>
          <button
            onClick={() => addField(type)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>
        {embed.fields.map((field, index) => (
          <div key={index} className="flex gap-2 items-start p-3 rounded border bg-secondary/30">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(type, index, 'name', e.target.value)}
                className="px-3 py-2 rounded border bg-background text-sm"
                placeholder="Field name"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateField(type, index, 'value', e.target.value)}
                className="px-3 py-2 rounded border bg-background text-sm"
                placeholder="Field value"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.inline}
                onChange={(e) => updateField(type, index, 'inline', e.target.checked)}
                className="rounded"
              />
              Inline
            </label>
            <button
              onClick={() => removeField(type, index)}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <AlignLeft className="h-4 w-4" />
          Footer
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={embed.footer}
            onChange={(e) => onUpdate('footer', e.target.value)}
            className="px-3 py-2 rounded border bg-background text-sm"
            placeholder="Footer text"
          />
          <input
            type="text"
            value={embed.footerIcon}
            onChange={(e) => onUpdate('footerIcon', e.target.value)}
            className="px-3 py-2 rounded border bg-background text-sm"
            placeholder="Footer icon URL"
          />
        </div>
      </div>

      {/* Timestamp */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={embed.timestamp}
          onChange={(e) => onUpdate('timestamp', e.target.checked)}
          className="rounded"
        />
        <Clock className="h-4 w-4" />
        Show Timestamp
      </label>

      {/* Preview Button */}
      <button
        onClick={() => setShowPreview(showPreview === type.replace('Embed', '') as any ? null : type.replace('Embed', '') as any)}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Eye className="h-4 w-4" />
        {showPreview === type.replace('Embed', '') ? 'Hide Preview' : 'Show Preview'}
      </button>

      {showPreview === type.replace('Embed', '') && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
          <EmbedPreview embed={embed} type={type} />
        </div>
      )}
    </div>
  );

  // Placeholders Info
  const PlaceholdersInfo = () => (
    <div className="p-4 rounded-lg bg-secondary/30 border">
      <h4 className="font-medium mb-2 flex items-center gap-2">
        <AtSign className="h-4 w-4" />
        Available Placeholders
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {PLACEHOLDERS.map((p) => (
          <div key={p.key} className="flex flex-col">
            <code className="text-primary">{p.key}</code>
            <span className="text-muted-foreground text-xs">{p.description}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Placeholders Reference */}
      <PlaceholdersInfo />

      {/* Welcome Channel Message Section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => toggleSection('welcome')}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.welcomeEnabled ? 'bg-green-500/20 text-green-500' : 'bg-secondary'}`}>
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Welcome Channel Message</h3>
              <p className="text-sm text-muted-foreground">Send a message when a user joins</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              onClick={(e) => {
                e.stopPropagation();
                updateConfig('welcomeEnabled', !config.welcomeEnabled);
              }}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                config.welcomeEnabled ? 'bg-green-500' : 'bg-secondary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                config.welcomeEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
            {expandedSections.welcome ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {expandedSections.welcome && (
          <div className="p-4 border-t space-y-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4" />
                Welcome Channel
              </label>
              <select
                value={config.welcomeChannelId}
                onChange={(e) => updateConfig('welcomeChannelId', e.target.value)}
                className="w-full max-w-md px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Select a channel...</option>
                {textChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="welcomeMessageType"
                    checked={config.welcomeMessageType === 'text'}
                    onChange={() => updateConfig('welcomeMessageType', 'text')}
                    className="text-primary"
                  />
                  <span>Text Message</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="welcomeMessageType"
                    checked={config.welcomeMessageType === 'embed'}
                    onChange={() => updateConfig('welcomeMessageType', 'embed')}
                    className="text-primary"
                  />
                  <span>Embed Message</span>
                </label>
              </div>
            </div>

            {/* Text Message */}
            {config.welcomeMessageType === 'text' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background min-h-[100px] resize-y"
                  placeholder="Welcome {user} to {server}!"
                />
              </div>
            ) : (
              <EmbedEditor
                embed={config.welcomeEmbed}
                type="welcomeEmbed"
                onUpdate={(key, value) => updateEmbed('welcomeEmbed', key, value)}
              />
            )}
          </div>
        )}
      </div>

      {/* DM Message Section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => toggleSection('dm')}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.dmEnabled ? 'bg-blue-500/20 text-blue-500' : 'bg-secondary'}`}>
              <Mail className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">DM Welcome Message</h3>
              <p className="text-sm text-muted-foreground">Send a private message to new members</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              onClick={(e) => {
                e.stopPropagation();
                updateConfig('dmEnabled', !config.dmEnabled);
              }}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                config.dmEnabled ? 'bg-blue-500' : 'bg-secondary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                config.dmEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
            {expandedSections.dm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {expandedSections.dm && (
          <div className="p-4 border-t space-y-4">
            {/* Message Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dmMessageType"
                    checked={config.dmMessageType === 'text'}
                    onChange={() => updateConfig('dmMessageType', 'text')}
                    className="text-primary"
                  />
                  <span>Text Message</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dmMessageType"
                    checked={config.dmMessageType === 'embed'}
                    onChange={() => updateConfig('dmMessageType', 'embed')}
                    className="text-primary"
                  />
                  <span>Embed Message</span>
                </label>
              </div>
            </div>

            {/* Text Message */}
            {config.dmMessageType === 'text' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  value={config.dmMessage}
                  onChange={(e) => updateConfig('dmMessage', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background min-h-[100px] resize-y"
                  placeholder="Welcome to {server}! Please read the rules."
                />
              </div>
            ) : (
              <EmbedEditor
                embed={config.dmEmbed}
                type="dmEmbed"
                onUpdate={(key, value) => updateEmbed('dmEmbed', key, value)}
              />
            )}
          </div>
        )}
      </div>

      {/* Auto Roles Section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => toggleSection('autoRoles')}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.autoRolesEnabled ? 'bg-purple-500/20 text-purple-500' : 'bg-secondary'}`}>
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Auto Roles</h3>
              <p className="text-sm text-muted-foreground">Automatically assign roles to new members</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              onClick={(e) => {
                e.stopPropagation();
                updateConfig('autoRolesEnabled', !config.autoRolesEnabled);
              }}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                config.autoRolesEnabled ? 'bg-purple-500' : 'bg-secondary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                config.autoRolesEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
            {expandedSections.autoRoles ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {expandedSections.autoRoles && (
          <div className="p-4 border-t space-y-4">
            <p className="text-sm text-muted-foreground">
              Select roles to automatically assign when a member joins. Make sure the bot's role is higher than these roles.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {assignableRoles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    config.autoRoles.includes(role.id)
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-muted-foreground/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={config.autoRoles.includes(role.id)}
                    onChange={() => toggleAutoRole(role.id)}
                    className="rounded"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                  />
                  <span className="text-sm truncate">{role.name}</span>
                </label>
              ))}
            </div>
            {config.autoRoles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {config.autoRoles.length} role(s) selected
              </p>
            )}
          </div>
        )}
      </div>

      {/* Leave Message Section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => toggleSection('leave')}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.leaveEnabled ? 'bg-red-500/20 text-red-500' : 'bg-secondary'}`}>
              <UserMinus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Leave Message</h3>
              <p className="text-sm text-muted-foreground">Send a message when a member leaves</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              onClick={(e) => {
                e.stopPropagation();
                updateConfig('leaveEnabled', !config.leaveEnabled);
              }}
              className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                config.leaveEnabled ? 'bg-red-500' : 'bg-secondary'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                config.leaveEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
            {expandedSections.leave ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {expandedSections.leave && (
          <div className="p-4 border-t space-y-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4" />
                Leave Channel
              </label>
              <select
                value={config.leaveChannelId}
                onChange={(e) => updateConfig('leaveChannelId', e.target.value)}
                className="w-full max-w-md px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Select a channel...</option>
                {textChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaveMessageType"
                    checked={config.leaveMessageType === 'text'}
                    onChange={() => updateConfig('leaveMessageType', 'text')}
                    className="text-primary"
                  />
                  <span>Text Message</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaveMessageType"
                    checked={config.leaveMessageType === 'embed'}
                    onChange={() => updateConfig('leaveMessageType', 'embed')}
                    className="text-primary"
                  />
                  <span>Embed Message</span>
                </label>
              </div>
            </div>

            {/* Text Message */}
            {config.leaveMessageType === 'text' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  value={config.leaveMessage}
                  onChange={(e) => updateConfig('leaveMessage', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background min-h-[100px] resize-y"
                  placeholder="{user.tag} has left the server."
                />
              </div>
            ) : (
              <EmbedEditor
                embed={config.leaveEmbed}
                type="leaveEmbed"
                onUpdate={(key, value) => updateEmbed('leaveEmbed', key, value)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
