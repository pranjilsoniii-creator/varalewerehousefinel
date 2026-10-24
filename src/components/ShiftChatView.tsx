import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { ShiftChatMessage, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchActiveShiftMessages,
  sendShiftMessage,
  subscribeToShiftChat,
  markShiftChatAsRead,
  initLocalChat,
  MESSAGE_TTL_MS,
  FILE_TTL_MS,
} from '../lib/shiftChatService';

interface ShiftChatViewProps {
  onUnreadChange?: (count: number) => void;
}

export const ShiftChatView: React.FC<ShiftChatViewProps> = ({ onUnreadChange }) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor, isEmployee } = useAuth();

  const [messages, setMessages] = useState<ShiftChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);

  const [viewMode, setViewMode] = useState<'SHIFT_ACTIVE' | 'LOCAL_HISTORY'>('SHIFT_ACTIVE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    initLocalChat().then((local) => {
      if (isMounted && local.length > 0) {
        setMessages(local);
      }
    });

    fetchActiveShiftMessages().then((active) => {
      if (isMounted) {
        setMessages(active);
        setIsLoading(false);
        markShiftChatAsRead();
        if (onUnreadChange) onUnreadChange(0);
        setTimeout(scrollToBottom, 150);
      }
    });

    // Realtime listener
    const unsubscribe = subscribeToShiftChat((newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
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

  // Filter messages based on active shift vs full history
  const displayedMessages = React.useMemo(() => {
    if (!Array.isArray(messages)) return [];
    if (viewMode === 'LOCAL_HISTORY') return messages;
    const eightHoursAgo = Date.now() - MESSAGE_TTL_MS;
    return messages.filter((m) => m && m.createdAt && new Date(m.createdAt).getTime() > eightHoursAgo);
  }, [messages, viewMode]);

  // Handle file select (up to 10 MB)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    if (file.size > maxSizeBytes) {
      setErrorMsg(`File size exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB). Please select a smaller file.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;
    if (!currentUser) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      let attachmentPayload;
      if (selectedFile) {
        attachmentPayload = {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          fileDataUrl: selectedFile.dataUrl,
        };
      }

      const newMsg = await sendShiftMessage({
        senderUsername: currentUser.username,
        senderName: currentUser.name || currentUser.username,
        senderRole: currentUser.role,
        message: inputText.trim(),
        fileAttachment: attachmentPayload,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setInputText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setErrorMsg('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Quick preset shortcuts
  const handleQuickPreset = (text: string) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
  };

  // Download attachment helper
  const handleDownloadAttachment = (fileName: string, dataUrl?: string) => {
    if (!dataUrl) {
      alert('This file attachment has expired in the cloud (after 4 hours) and is no longer available.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Role Badge Helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-extrabold uppercase">Super Admin</span>;
      case 'manager':
        return <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-extrabold uppercase">Manager</span>;
      case 'supervisor':
        return <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold uppercase">Supervisor</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold uppercase">Staff</span>;
    }
  };

  // File Icon Helper
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-600" />;
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate remaining time for a message in cloud
  const getRemainingTime = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const remainingMs = MESSAGE_TTL_MS - elapsed;
    if (remainingMs <= 0) return 'Cloud Expired';
    const hrs = Math.floor(remainingMs / (60 * 60 * 1000));
    const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return `${hrs}h ${mins}m left in cloud`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden animate-fadeIn">
      {/* Top Header Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold font-display">
                Shift Operations Team Chat
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Realtime
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-code">
              8-Hour Shift Window • Messages expire from Cloud in 8h • Files in 4h • Saved locally
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('SHIFT_ACTIVE')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'SHIFT_ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Active Shift (8h)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LOCAL_HISTORY')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'LOCAL_HISTORY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View all locally archived shift messages on this device"
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Local Archive</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetchActiveShiftMessages().then((active) => {
                setMessages(active);
                setIsLoading(false);
              });
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Refresh shift messages"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="px-4 py-1.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Cloud Auto-TTL Guard Active:</strong> To protect Supabase free quota, cloud messages delete automatically after 8 hours. Local device history stays intact.
          </span>
        </div>
        <span className="font-mono-code font-bold text-slate-500 hidden md:inline">
          {displayedMessages.length} message{displayedMessages.length !== 1 ? 's' : ''} in view
        </span>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Connecting to live shift channel...</p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Shift Feed is Ready</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              No messages sent in this 8-hour shift yet. Send instructions, alerts, or upload inward/dispatch files below.
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isMe = msg.senderUsername === currentUser?.username;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-fadeIn`}
              >
                {/* Sender Info Line */}
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-800">{isMe ? 'You' : msg.senderName}</span>
                  {getRoleBadge(msg.senderRole)}
                  <span className="text-[10px] text-slate-400 font-mono-code">{timeStr}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-2xs space-y-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                  }`}
                >
                  {/* Text Content */}
                  {msg.message && (
                    <p className="whitespace-pre-wrap break-words font-medium">{msg.message}</p>
                  )}

                  {/* File Attachment Card */}
                  {msg.fileAttachment && (
                    <div
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-3 border ${
                        isMe
                          ? 'bg-blue-700/60 border-blue-500/50 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-1.5 rounded-lg bg-white shadow-2xs flex-shrink-0">
                          {getFileIcon(msg.fileAttachment.fileType)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold truncate text-xs">{msg.fileAttachment.fileName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                            <span>{formatSize(msg.fileAttachment.fileSize)}</span>
                            <span>•</span>
                            <span>{msg.fileAttachment.fileType.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                          </div>
                        </div>
                      </div>

                      {msg.fileAttachment.fileDataUrl ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(msg.fileAttachment!.fileName, msg.fileAttachment!.fileDataUrl)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                            isMe
                              ? 'bg-white text-blue-700 hover:bg-blue-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                          }`}
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                          Cloud Expired
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Expiry Countdown footer */}
                  <div
                    className={`text-[9px] font-mono-code pt-0.5 flex items-center gap-1 opacity-70 ${
                      isMe ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{getRemainingTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Warehouse Alert Chips */}
      <div className="px-3.5 py-1.5 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-400 font-bold flex-shrink-0 text-[10px] uppercase tracking-wider">Quick:</span>
        <button
          type="button"
          onClick={() => handleQuickPreset('🚨 Priority Inward Verification Required')}
          className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition shadow-2xs"
        >
          🚨 Priority Inward
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('✅ Outward Dispatch Cleared & Loaded')}
          className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition shadow-2xs"
        >
          ✅ Dispatch Cleared
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('⚠️ Line Rack Space Full - Need Allocation')}
          className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition shadow-2xs"
        >
          ⚠️ Line Space Full
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('📋 Attached Daily Summary Sheet')}
          className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition shadow-2xs"
        >
          📋 Daily Sheet
        </button>
      </div>

      {/* Selected File Preview Chip before sending */}
      {selectedFile && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-semibold truncate">
            {getFileIcon(selectedFile.type)}
            <span className="truncate">{selectedFile.name}</span>
            <span className="text-[10px] text-blue-600 font-mono-code font-bold">({formatSize(selectedFile.size)})</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition cursor-pointer shadow-2xs"
          title="Attach PDF, Excel or Image (up to 10 MB)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type shift message, update, or question for team..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs font-medium"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSending || (!inputText.trim() && !selectedFile)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
