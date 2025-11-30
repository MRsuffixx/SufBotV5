'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  MessageSquare,
  Search,
  Reply,
  Users,
  Hash,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AutoResponder {
  id: string;
  trigger: string;
  wildcard: boolean;
  sendAsReply: boolean;
  replies: string[];
  allowedRoles: string[];
  disabledRoles: string[];
  allowedChannels: string[];
  disabledChannels: string[];
  enabled: boolean;
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
}

interface AutoResponderSettingsProps {
  guildId: string;
  accessToken: string;
  channels: Channel[];
  roles: Role[];
}

const VARIABLES = [
  { name: '{user}', description: 'Mentions the user' },
  { name: '{user.name}', description: 'Username' },
  { name: '{user.id}', description: 'User ID' },
  { name: '{server}', description: 'Server name' },
  { name: '{channel}', description: 'Channel name' },
  { name: '{membercount}', description: 'Member count' },
];

export default function AutoResponderSettings({
  guildId,
  accessToken,
  channels,
  roles,
}: AutoResponderSettingsProps) {
  const [responders, setResponders] = useState<AutoResponder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResponder, setEditingResponder] = useState<AutoResponder | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [trigger, setTrigger] = useState('');
  const [wildcard, setWildcard] = useState(false);
  const [sendAsReply, setSendAsReply] = useState(true);
  const [replies, setReplies] = useState<string[]>(['']);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [disabledRoles, setDisabledRoles] = useState<string[]>([]);
  const [allowedChannels, setAllowedChannels] = useState<string[]>([]);
  const [disabledChannels, setDisabledChannels] = useState<string[]>([]);

  useEffect(() => {
    fetchResponders();
  }, [guildId]);

  const fetchResponders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/auto-responders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResponders(data);
      }
    } catch (error) {
      console.error('Failed to fetch auto responders:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTrigger('');
    setWildcard(false);
    setSendAsReply(true);
    setReplies(['']);
    setAllowedRoles([]);
    setDisabledRoles([]);
    setAllowedChannels([]);
    setDisabledChannels([]);
    setEditingResponder(null);
  };

  const openModal = (responder?: AutoResponder) => {
    if (responder) {
      setEditingResponder(responder);
      setTrigger(responder.trigger);
      setWildcard(responder.wildcard);
      setSendAsReply(responder.sendAsReply);
      setReplies(responder.replies.length > 0 ? responder.replies : ['']);
      setAllowedRoles(responder.allowedRoles);
      setDisabledRoles(responder.disabledRoles);
      setAllowedChannels(responder.allowedChannels);
      setDisabledChannels(responder.disabledChannels);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const addReply = () => {
    if (replies.length < 10) {
      setReplies([...replies, '']);
    }
  };

  const removeReply = (index: number) => {
    if (replies.length > 1) {
      setReplies(replies.filter((_, i) => i !== index));
    }
  };

  const updateReply = (index: number, value: string) => {
    const newReplies = [...replies];
    newReplies[index] = value;
    setReplies(newReplies);
  };

  const handleSave = async () => {
    // Validate
    if (!trigger.trim()) {
      alert('Trigger is required');
      return;
    }
    const validReplies = replies.filter(r => r.trim());
    if (validReplies.length === 0) {
      alert('At least one reply is required');
      return;
    }

    setSaving(true);
    try {
      const body = {
        trigger: trigger.trim(),
        wildcard,
        sendAsReply,
        replies: validReplies,
        allowedRoles,
        disabledRoles,
        allowedChannels,
        disabledChannels,
      };

      const url = editingResponder
        ? `${API_URL}/api/guilds/${guildId}/auto-responders/${editingResponder.id}`
        : `${API_URL}/api/guilds/${guildId}/auto-responders`;

      const response = await fetch(url, {
        method: editingResponder ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchResponders();
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save auto responder:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auto responder?')) return;

    try {
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/auto-responders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        setResponders(responders.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete auto responder:', error);
    }
  };

  const toggleEnabled = async (responder: AutoResponder) => {
    try {
      const response = await fetch(`${API_URL}/api/guilds/${guildId}/auto-responders/${responder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ enabled: !responder.enabled }),
      });

      if (response.ok) {
        setResponders(responders.map(r => 
          r.id === responder.id ? { ...r, enabled: !r.enabled } : r
        ));
      }
    } catch (error) {
      console.error('Failed to toggle auto responder:', error);
    }
  };

  const textChannels = channels.filter(c => c.type === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Auto Responder</h2>
          <p className="text-sm text-muted-foreground">
            Automatically respond to messages containing specific triggers
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Responder
        </button>
      </div>

      {/* Responders List */}
      {responders.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Auto Responders</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first auto responder to automatically reply to messages
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Responder
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {responders.map((responder) => (
            <div
              key={responder.id}
              className={`rounded-xl border bg-card overflow-hidden transition-colors ${
                !responder.enabled ? 'opacity-60' : ''
              }`}
            >
              {/* Header Row */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleEnabled(responder)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {responder.enabled ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-secondary text-sm font-mono">
                        {responder.trigger}
                      </code>
                      {responder.wildcard && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                          Wildcard
                        </span>
                      )}
                      {responder.sendAsReply && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                          Reply
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {responder.replies.length} {responder.replies.length === 1 ? 'reply' : 'replies'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedId(expandedId === responder.id ? null : responder.id)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    {expandedId === responder.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openModal(responder)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(responder.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === responder.id && (
                <div className="border-t p-4 bg-secondary/30 space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Replies:</p>
                    <div className="space-y-1">
                      {responder.replies.map((reply, i) => (
                        <p key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">
                          {reply}
                        </p>
                      ))}
                    </div>
                  </div>
                  {(responder.allowedRoles.length > 0 || responder.disabledRoles.length > 0) && (
                    <div className="flex gap-4 text-sm">
                      {responder.allowedRoles.length > 0 && (
                        <span className="text-green-500">
                          Allowed: {responder.allowedRoles.length} roles
                        </span>
                      )}
                      {responder.disabledRoles.length > 0 && (
                        <span className="text-red-500">
                          Disabled: {responder.disabledRoles.length} roles
                        </span>
                      )}
                    </div>
                  )}
                  {(responder.allowedChannels.length > 0 || responder.disabledChannels.length > 0) && (
                    <div className="flex gap-4 text-sm">
                      {responder.allowedChannels.length > 0 && (
                        <span className="text-green-500">
                          Allowed: {responder.allowedChannels.length} channels
                        </span>
                      )}
                      {responder.disabledChannels.length > 0 && (
                        <span className="text-red-500">
                          Disabled: {responder.disabledChannels.length} channels
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingResponder ? 'Edit Auto Responder' : 'Add Auto Responder'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-6">
              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Trigger
                </label>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="Enter trigger word or phrase..."
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wildcard}
                    onChange={(e) => setWildcard(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex items-center gap-1">
                    <Search className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Wildcard</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    (Search within message)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendAsReply}
                    onChange={(e) => setSendAsReply(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex items-center gap-1">
                    <Reply className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Send as Reply</span>
                  </div>
                </label>
              </div>

              {/* Replies */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Replies ({replies.length}/10)
                  </label>
                  {replies.length < 10 && (
                    <button
                      onClick={addReply}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Reply
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {replies.map((reply, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={reply}
                        onChange={(e) => updateReply(index, e.target.value)}
                        placeholder={`Reply ${index + 1}...`}
                        className="flex-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {replies.length > 1 && (
                        <button
                          onClick={() => removeReply(index)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {replies.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Multiple replies will be selected randomly
                  </p>
                )}
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Available Variables
                </label>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => {
                        const lastIndex = replies.length - 1;
                        updateReply(lastIndex, replies[lastIndex] + v.name);
                      }}
                      className="px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 transition-colors"
                      title={v.description}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Users className="h-4 w-4 inline mr-1 text-green-500" />
                    Allowed Roles (Optional)
                  </label>
                  <select
                    multiple
                    value={allowedRoles}
                    onChange={(e) => setAllowedRoles(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full h-24 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {roles.filter(r => r.name !== '@everyone').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only these roles can trigger (empty = all)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Users className="h-4 w-4 inline mr-1 text-red-500" />
                    Disabled Roles (Optional)
                  </label>
                  <select
                    multiple
                    value={disabledRoles}
                    onChange={(e) => setDisabledRoles(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full h-24 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {roles.filter(r => r.name !== '@everyone').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    These roles cannot trigger
                  </p>
                </div>
              </div>

              {/* Channel Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Hash className="h-4 w-4 inline mr-1 text-green-500" />
                    Allowed Channels (Optional)
                  </label>
                  <select
                    multiple
                    value={allowedChannels}
                    onChange={(e) => setAllowedChannels(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full h-24 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {textChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only works in these channels (empty = all)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Hash className="h-4 w-4 inline mr-1 text-red-500" />
                    Disabled Channels (Optional)
                  </label>
                  <select
                    multiple
                    value={disabledChannels}
                    onChange={(e) => setDisabledChannels(Array.from(e.target.selectedOptions, o => o.value))}
                    className="w-full h-24 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {textChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Does not work in these channels
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card border-t p-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingResponder ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
