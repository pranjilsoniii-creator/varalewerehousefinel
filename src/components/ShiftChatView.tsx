import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Archive,
  Phone,
  Video,
  Maximize2,
  Minimize2,
  Search,
  Users,
  Hash,
  Trash2,
  User,
  Table,
  Battery,
  MapPin,
  ExternalLink,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
} from 'lucide-react';
import {
  ShiftChatMessage,
  ShiftChatAttachment,
  ShiftChatPackShare,
  ShiftChatTableData,
  UserRole,
  BatteryPack,
  UserAccount,
} from '../types';
import { useAuth, DEFAULT_USERS } from '../context/AuthContext';
import {
  fetchActiveShiftMessages,
  sendShiftMessage,
  deleteShiftMessage,
  subscribeToShiftChat,
  markShiftChatAsRead,
  initLocalChat,
  parseExcelPaste,
  MESSAGE_TTL_MS,
  FILE_TTL_MS,
} from '../lib/shiftChatService';
import { ShiftChatCallOverlay } from './ShiftChatCallOverlay';
import { SharePackModal } from './SharePackModal';

interface ShiftChatViewProps {
  packs?: BatteryPack[];
  onUnreadChange?: (count: number) => void;
  onOpenJanamkundli?: (packNumber: string) => void;
  onToggleMenuVisibility?: (hidden: boolean) => void;
}

type ConversationType = 'CHANNEL' | 'DIRECT';

interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  restrictedRoles?: UserRole[];
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'general',
    name: 'General Operations',
    description: 'Plant-wide warehouse operational updates & alerts',
    icon: '#',
  },
  {
    id: 'inward',
    name: 'Inward Dock & Inspection',
    description: 'Scanning, unloading, serial mismatch & QC remarks',
    icon: '#',
  },
  {
    id: 'dispatch',
    name: 'Outward Dispatch Staging',
    description: 'Lots, transporter coordination, LR & challans',
    icon: '#',
  },
  {
    id: 'supervisors',
    name: 'Supervisors & Management',
    description: 'Confidential coordination between managers & supervisors',
    icon: '🔒',
    restrictedRoles: ['superadmin', 'manager', 'supervisor'],
  },
];

export const ShiftChatView: React.FC<ShiftChatViewProps> = ({
  packs = [],
  onUnreadChange,
  onOpenJanamkundli,
  onToggleMenuVisibility,
}) => {
  const { currentUser, users: authUsers } = useAuth();

  // All registered warehouse staff
  const staffList = useMemo(() => {
    const list = authUsers && authUsers.length > 0 ? authUsers : DEFAULT_USERS;
    return list.filter(
      (u) => u.username.toLowerCase() !== (currentUser?.username || '').toLowerCase()
    );
  }, [authUsers, currentUser]);

  // Active Conversation State (Teams style)
  const [activeType, setActiveType] = useState<ConversationType>('CHANNEL');
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [activeDirectUser, setActiveDirectUser] = useState<UserAccount | null>(null);

  // Chat Data & Feed
  const [messages, setMessages] = useState<ShiftChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Attachments & Rich Payloads
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [pastedTable, setPastedTable] = useState<ShiftChatTableData | null>(null);
  const [isSharePackModalOpen, setIsSharePackModalOpen] = useState(false);
  const [copiedTableIdx, setCopiedTableIdx] = useState<number | null>(null);

  // UI Modes
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'SHIFT_ACTIVE' | 'LOCAL_HISTORY'>('SHIFT_ACTIVE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // WebRTC Calling Request
  const [outgoingCallRequest, setOutgoingCallRequest] = useState<{
    recipientUsername: string;
    recipientName: string;
    isVideo: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial Load & Realtime subscription
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    initLocalChat()
      .then((local) => {
        if (isMounted && Array.isArray(local) && local.length > 0) {
          setMessages(local);
        }
      })
      .catch(() => {});

    fetchActiveShiftMessages()
      .then((active) => {
        if (isMounted && Array.isArray(active)) {
          setMessages(active);
          setIsLoading(false);
          markShiftChatAsRead();
          if (onUnreadChange) onUnreadChange(0);
          setTimeout(scrollToBottom, 150);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // Realtime message listener
    const unsubscribe = subscribeToShiftChat((newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m && m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      markShiftChatAsRead();
      if (onUnreadChange) onUnreadChange(0);
      setTimeout(scrollToBottom, 100);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle Fullscreen Toggle (Hides Razorpay menu and headers)
  const handleToggleFullScreen = () => {
    const next = !isFullScreen;
    setIsFullScreen(next);
    if (onToggleMenuVisibility) {
      onToggleMenuVisibility(next);
    }
  };

  // Intercept Excel Paste into Message Input
  const handleInputPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardText = e.clipboardData.getData('text');
    if (clipboardText && (clipboardText.includes('\t') || clipboardText.includes('\n'))) {
      const parsed = parseExcelPaste(clipboardText);
      if (parsed && parsed.rows.length > 0) {
        e.preventDefault();
        setPastedTable(parsed);
      }
    }
  };

  // Filter messages for current active conversation
  const displayedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    const eightHoursAgo = Date.now() - MESSAGE_TTL_MS;

    return messages.filter((m) => {
      if (!m || !m.createdAt) return false;

      // TTL filter if SHIFT_ACTIVE mode
      if (viewMode === 'SHIFT_ACTIVE') {
        const time = new Date(m.createdAt).getTime();
        if (isNaN(time) || time < eightHoursAgo) return false;
      }

      // 1. Direct Conversation Filter (Secret between 2 users)
      if (activeType === 'DIRECT') {
        if (!activeDirectUser || !currentUser) return false;
        if (m.scope !== 'DIRECT') return false;

        const sender = (m.senderUsername || '').toLowerCase();
        const recip = (m.recipientUsername || '').toLowerCase();
        const myU = currentUser.username.toLowerCase();
        const otherU = activeDirectUser.username.toLowerCase();

        return (sender === myU && recip === otherU) || (sender === otherU && recip === myU);
      }

      // 2. Channel Conversation Filter
      if (activeType === 'CHANNEL') {
        if (m.scope === 'DIRECT') return false;
        const msgChannel = m.channelId || 'general';
        return msgChannel === activeChannelId;
      }

      return false;
    });
  }, [messages, activeType, activeChannelId, activeDirectUser, currentUser, viewMode]);

  // Handle File Selection (up to 10 MB)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the 10MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        file,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if (!inputText.trim() && !selectedFile && !pastedTable) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      const scope: ConversationType = activeType;
      const channelId = activeType === 'CHANNEL' ? activeChannelId : undefined;
      const recipientUsername = activeType === 'DIRECT' ? activeDirectUser?.username : undefined;
      const recipientName = activeType === 'DIRECT' ? activeDirectUser?.name : undefined;

      let filePayload = undefined;
      if (selectedFile) {
        filePayload = {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileDataUrl: selectedFile.dataUrl,
        };
      }

      const sentMsg = await sendShiftMessage({
        senderUsername: currentUser.username,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        message: inputText.trim(),
        fileAttachment: filePayload,
        scope,
        channelId,
        recipientUsername,
        recipientName,
        tableData: pastedTable || undefined,
      });

      setMessages((prev) => [...prev, sentMsg]);
      setInputText('');
      setSelectedFile(null);
      setPastedTable(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  // Send Pack Details Card
  const handleSharePackCard = async (packShare: ShiftChatPackShare) => {
    if (!currentUser) return;

    try {
      const scope: ConversationType = activeType;
      const channelId = activeType === 'CHANNEL' ? activeChannelId : undefined;
      const recipientUsername = activeType === 'DIRECT' ? activeDirectUser?.username : undefined;
      const recipientName = activeType === 'DIRECT' ? activeDirectUser?.name : undefined;

      const sentMsg = await sendShiftMessage({
        senderUsername: currentUser.username,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        message: `Shared Battery Pack: ${packShare.packNumber} (${packShare.packType})`,
        scope,
        channelId,
        recipientUsername,
        recipientName,
        packShare,
      });

      setMessages((prev) => [...prev, sentMsg]);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to share pack card.');
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msgId: string) => {
    if (confirm('Delete this message for everyone?')) {
      await deleteShiftMessage(msgId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isDeleted: true,
                message: 'This message was deleted',
                fileAttachment: undefined,
                packShare: undefined,
                tableData: undefined,
              }
            : m
        )
      );
    }
  };

  // Copy table to clipboard
  const handleCopyTable = (table: ShiftChatTableData, idx: number) => {
    const tsv = [table.headers.join('\t'), ...table.rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedTableIdx(idx);
      setTimeout(() => setCopiedTableIdx(null), 2000);
    });
  };

  // Start Call
  const handleInitiateCall = (isVideo: boolean) => {
    if (!activeDirectUser) {
      alert('Calls can be initiated in 1-on-1 Direct Messaging.');
      return;
    }
    setOutgoingCallRequest({
      recipientUsername: activeDirectUser.username,
      recipientName: activeDirectUser.name,
      isVideo,
    });
  };

  return (
    <div
      className={`bg-slate-100 flex flex-col font-sans transition-all duration-200 ${
        isFullScreen ? 'fixed inset-0 z-50 bg-white h-screen w-screen' : 'h-[calc(100vh-4rem)] p-2 sm:p-4'
      }`}
    >
      {/* WebRTC Video / Audio Call Overlay */}
      {currentUser && (
        <ShiftChatCallOverlay
          currentUser={currentUser}
          activeDirectUser={activeDirectUser}
          outgoingCallRequest={outgoingCallRequest}
          onClearOutgoingCallRequest={() => setOutgoingCallRequest(null)}
        />
      )}

      {/* Share Pack Modal */}
      <SharePackModal
        isOpen={isSharePackModalOpen}
        onClose={() => setIsSharePackModalOpen(false)}
        packs={packs}
        recipientName={activeDirectUser?.name}
        onSharePack={handleSharePackCard}
      />

      {/* MAIN TEAMS WORKSPACE CONTAINER */}
      <div className="flex-1 flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
        
        {/* ======================================================== */}
        {/* 1. LEFT CONVERSATIONS LIST (TEAMS CHANNELS & DIRECT CHATS) */}
        {/* ======================================================== */}
        <div
          className={`${
            isSidebarOpen ? 'w-64 sm:w-72 flex' : 'hidden'
          } flex-col bg-slate-50 border-r border-slate-200 shrink-0 select-none transition-all duration-200`}
        >
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-slate-900 font-display uppercase">
                  Shift Teams Hub
                </h3>
                <p className="text-[10px] text-emerald-600 font-mono-code font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  8h Auto-TTL Active
                </p>
              </div>
            </div>

            {/* Sidebar Collapse Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer lg:hidden"
              title="Close conversations pane"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-200 bg-white/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find channel or colleague..."
                className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            
            {/* GROUP A: CHANNELS */}
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Channels</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono-code font-bold">
                  {CHANNELS.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {CHANNELS.map((ch) => {
                  const isActive = activeType === 'CHANNEL' && activeChannelId === ch.id;
                  const isRestricted = ch.restrictedRoles && (!currentUser || !ch.restrictedRoles.includes(currentUser.role));
                  if (isRestricted) return null;

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setActiveType('CHANNEL');
                        setActiveChannelId(ch.id);
                        setActiveDirectUser(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          {ch.icon}
                        </span>
                        <span className="truncate">{ch.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GROUP B: DIRECT MESSAGES (1-on-1 Teams DMs) */}
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Direct Messages</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono-code font-bold">
                  {staffList.length} staff
                </span>
              </div>
              <div className="space-y-0.5">
                {staffList
                  .filter((u) => !searchTerm.trim() || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((user) => {
                    const isActive = activeType === 'DIRECT' && activeDirectUser?.username.toLowerCase() === user.username.toLowerCase();

                    return (
                      <button
                        key={user.username}
                        type="button"
                        onClick={() => {
                          setActiveType('DIRECT');
                          setActiveDirectUser(user);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                                isActive ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                          </div>
                          <div className="truncate">
                            <p className="truncate leading-tight">{user.name}</p>
                            <p
                              className={`text-[10px] font-mono-code uppercase font-semibold ${
                                isActive ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              {user.role}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

          </div>

          {/* Bottom Shift Storage Switcher */}
          <div className="p-2 border-t border-slate-200 bg-white">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('SHIFT_ACTIVE')}
                className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                  viewMode === 'SHIFT_ACTIVE' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500'
                }`}
              >
                8h Active
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LOCAL_HISTORY')}
                className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                  viewMode === 'LOCAL_HISTORY' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500'
                }`}
              >
                Local Backup
              </button>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 2. MAIN TEAMS CHAT PANE */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* TOP BAR OF CONVERSATION */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              {/* Sidebar reopen toggle if collapsed */}
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  title="Open conversations list"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}

              {/* Title & Status */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 font-display truncate">
                    {activeType === 'CHANNEL'
                      ? CHANNELS.find((c) => c.id === activeChannelId)?.name || 'General Operations'
                      : activeDirectUser?.name || 'Direct Conversation'}
                  </h2>
                  {activeType === 'DIRECT' && activeDirectUser && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono-code font-bold border border-blue-200">
                      @{activeDirectUser.username}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-mono-code truncate">
                  {activeType === 'CHANNEL'
                    ? CHANNELS.find((c) => c.id === activeChannelId)?.description
                    : `Private confidential 1-on-1 shift messaging with ${activeDirectUser?.name}`}
                </p>
              </div>
            </div>

            {/* Top Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Teams Voice Call (1-on-1 DMs) */}
              {activeType === 'DIRECT' && activeDirectUser && (
                <button
                  type="button"
                  onClick={() => handleInitiateCall(false)}
                  className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Start Audio Call (Teams WebRTC)"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                </button>
              )}

              {/* Teams Video Call (1-on-1 DMs) */}
              {activeType === 'DIRECT' && activeDirectUser && (
                <button
                  type="button"
                  onClick={() => handleInitiateCall(true)}
                  className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Start Video Call (Teams WebRTC)"
                >
                  <Video className="w-4 h-4 text-blue-600" />
                </button>
              )}

              {/* Share Battery Pack details button */}
              <button
                type="button"
                onClick={() => setIsSharePackModalOpen(true)}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Send Battery Pack Details Card to this Chat"
              >
                <Battery className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Share Pack</span>
              </button>

              {/* Full-Screen Chat Toggle (Hides Left Menu & Top Nav) */}
              <button
                type="button"
                onClick={handleToggleFullScreen}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isFullScreen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200'
                }`}
                title={isFullScreen ? 'Exit Full Screen (Show Navigation)' : 'Full Screen Chat (Hide Menu)'}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

            </div>
          </div>

          {/* MESSAGE FEED AREA */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading active shift messages...</span>
              </div>
            ) : displayedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700 font-display">
                    {activeType === 'CHANNEL'
                      ? `Welcome to #${CHANNELS.find((c) => c.id === activeChannelId)?.name}`
                      : `No previous messages with @${activeDirectUser?.name}`}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono-code max-w-sm mt-1">
                    Send an operational update, paste an Excel spreadsheet, share a battery pack card, or attach a document.
                  </p>
                </div>
              </div>
            ) : (
              displayedMessages.map((msg, idx) => {
                const isMe = msg.senderUsername.toLowerCase() === (currentUser?.username || '').toLowerCase();

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fadeIn group`}
                  >
                    {/* Sender Header */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-slate-800">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-2xl rounded-2xl p-3.5 shadow-2xs space-y-2.5 ${
                        msg.isDeleted
                          ? 'bg-slate-100 border border-slate-200 text-slate-500 italic text-xs'
                          : isMe
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                      }`}
                    >
                      {/* Deleted placeholder */}
                      {msg.isDeleted ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>This message was deleted.</span>
                        </div>
                      ) : (
                        <>
                          {/* 1. Main Text Content */}
                          {msg.message && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text font-normal">
                              {msg.message}
                            </p>
                          )}

                          {/* 2. Rich Pasted Excel Table (Microsoft Teams Style Table Card) */}
                          {msg.tableData && msg.tableData.headers && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-2xs mt-1">
                              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span className="flex items-center gap-1">
                                  <Table className="w-3.5 h-3.5 text-blue-600" />
                                  Excel Data Table ({msg.tableData.rows.length} rows)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyTable(msg.tableData!, idx)}
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedTableIdx === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedTableIdx === idx ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <div className="overflow-x-auto max-h-60">
                                <table className="w-full text-left text-[11px] font-mono-code border-collapse">
                                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                    <tr>
                                      {msg.tableData.headers.map((h, hIdx) => (
                                        <th key={hIdx} className="px-2.5 py-1.5 font-bold text-slate-700 border-r border-slate-200 last:border-r-0">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {msg.tableData.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        {row.map((cell, cIdx) => (
                                          <td key={cIdx} className="px-2.5 py-1.5 border-r border-slate-100 last:border-r-0">
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 3. Rich Battery Pack Specification Card */}
                          {msg.packShare && (
                            <div className="p-3 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xs space-y-2 mt-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                    <Battery className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-mono-code font-black text-xs text-slate-900">
                                      {msg.packShare.packNumber}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-bold">{msg.packShare.packType}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                  {msg.packShare.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {msg.packShare.location && (
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Location</span>
                                    <strong className="text-slate-800">{msg.packShare.location}</strong>
                                  </div>
                                )}
                                {msg.packShare.inwardDate && (
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Inward Date</span>
                                    <strong className="text-slate-800">{msg.packShare.inwardDate}</strong>
                                  </div>
                                )}
                                {msg.packShare.voltage && (
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">Voltage</span>
                                    <strong className="text-slate-800">{msg.packShare.voltage}V</strong>
                                  </div>
                                )}
                                {msg.packShare.remark && (
                                  <div className="col-span-2">
                                    <span className="text-slate-400 block text-[9px]">Remark</span>
                                    <span className="text-slate-700 text-[10px]">{msg.packShare.remark}</span>
                                  </div>
                                )}
                              </div>

                              {onOpenJanamkundli && (
                                <button
                                  type="button"
                                  onClick={() => onOpenJanamkundli(msg.packShare!.packNumber)}
                                  className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View Pack Janamkundli & Movement</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* 4. File / Image / PDF Attachment */}
                          {msg.fileAttachment && (
                            <div className="mt-1">
                              {msg.fileAttachment.fileType.startsWith('image/') && msg.fileAttachment.fileDataUrl ? (
                                <div className="rounded-xl overflow-hidden border border-black/10 max-w-sm">
                                  <img
                                    src={msg.fileAttachment.fileDataUrl}
                                    alt={msg.fileAttachment.fileName}
                                    className="w-full h-auto max-h-60 object-cover"
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                    isMe
                                      ? 'bg-blue-700/60 border-blue-500 text-white'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {msg.fileAttachment.fileName.endsWith('.xlsx') || msg.fileAttachment.fileName.endsWith('.csv') ? (
                                      <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                                    )}
                                    <div className="truncate">
                                      <p className="text-xs font-bold truncate">{msg.fileAttachment.fileName}</p>
                                      <p className="text-[10px] opacity-70 font-mono-code">
                                        {(msg.fileAttachment.fileSize / 1024).toFixed(0)} KB
                                      </p>
                                    </div>
                                  </div>

                                  {msg.fileAttachment.fileDataUrl && (
                                    <a
                                      href={msg.fileAttachment.fileDataUrl}
                                      download={msg.fileAttachment.fileName}
                                      className={`p-1.5 rounded-lg transition ${
                                        isMe ? 'hover:bg-blue-800 text-white' : 'hover:bg-slate-200 text-slate-700'
                                      }`}
                                      title="Download attachment"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT FORM CONTAINER */}
          <div className="p-3 border-t border-slate-200 bg-white space-y-2">
            
            {/* Active Attachment / Pasted Table Pill */}
            {(selectedFile || pastedTable) && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-0.5 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {pastedTable && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <Table className="w-3.5 h-3.5" />
                    <span>Excel Table Attached ({pastedTable.rows.length} rows, {pastedTable.headers.length} cols)</span>
                    <button
                      type="button"
                      onClick={() => setPastedTable(null)}
                      className="p-0.5 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              {/* Attachment File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Attach Document / Excel / Image (up to 10MB)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSharePackModalOpen(true)}
                  className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Share Battery Pack Details Card"
                >
                  <Battery className="w-4 h-4" />
                </button>
              </div>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handleInputPaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    activeType === 'CHANNEL'
                      ? `Message #${CHANNELS.find((c) => c.id === activeChannelId)?.name}... (Paste Excel table supported)`
                      : `Secret direct message to @${activeDirectUser?.name}... (Paste Excel table supported)`
                  }
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium resize-none transition"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedFile && !pastedTable)}
                className={`p-3 rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs ${
                  inputText.trim() || selectedFile || pastedTable
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};
