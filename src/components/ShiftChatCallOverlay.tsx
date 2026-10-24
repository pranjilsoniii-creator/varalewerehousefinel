import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Maximize2,
  Minimize2,
  User,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ShiftCallSignal, UserRole } from '../types';
import { sendCallSignal, subscribeToCallSignals } from '../lib/shiftChatService';

interface ShiftChatCallOverlayProps {
  currentUser: {
    username: string;
    name: string;
    role: UserRole;
  };
  activeDirectUser?: {
    username: string;
    name: string;
    role: UserRole;
  } | null;
  outgoingCallRequest?: {
    recipientUsername: string;
    recipientName: string;
    isVideo: boolean;
  } | null;
  onClearOutgoingCallRequest: () => void;
}

export const ShiftChatCallOverlay: React.FC<ShiftChatCallOverlayProps> = ({
  currentUser,
  activeDirectUser,
  outgoingCallRequest,
  onClearOutgoingCallRequest,
}) => {
  const [incomingCall, setIncomingCall] = useState<ShiftCallSignal | null>(null);
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTED'>('IDLE');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [activeCallPartner, setActiveCallPartner] = useState<{
    username: string;
    name: string;
    isVideo: boolean;
  } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneOscillatorRef = useRef<any>(null);

  // Play Synthetic Ringtone using Web Audio API (Zero external MP3 dependencies)
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // 440Hz standard ring tone
      gain.gain.setValueAtTime(0.1, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringtoneOscillatorRef.current = osc;
    } catch {}
  };

  const stopRingtone = () => {
    try {
      if (ringtoneOscillatorRef.current) {
        ringtoneOscillatorRef.current.stop();
        ringtoneOscillatorRef.current.disconnect();
        ringtoneOscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {}
  };

  // Setup WebRTC Peer Connection
  const createPeerConnection = (partnerUsername: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal({
          id: `cand-${Date.now()}`,
          type: 'CANDIDATE',
          callerUsername: currentUser.username,
          callerName: currentUser.name,
          recipientUsername: partnerUsername,
          isVideo: isVideoEnabled,
          candidate: event.candidate,
          timestamp: new Date().toISOString(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start Outgoing Call
  const startOutgoingCall = async (recipientUsername: string, recipientName: string, isVideo: boolean) => {
    try {
      setCallState('CALLING');
      setActiveCallPartner({ username: recipientUsername, name: recipientName, isVideo });
      setIsVideoEnabled(isVideo);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(recipientUsername);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendCallSignal({
        id: `call-${Date.now()}`,
        type: 'OFFER',
        callerUsername: currentUser.username,
        callerName: currentUser.name,
        recipientUsername,
        isVideo,
        sdp: offer,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[WebRTC] Error initiating call:', err);
      endCall();
    }
  };

  // Accept Incoming Call
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    stopRingtone();
    try {
      const isVideo = incomingCall.isVideo;
      setCallState('CONNECTED');
      setActiveCallPartner({
        username: incomingCall.callerUsername,
        name: incomingCall.callerName,
        isVideo,
      });
      setIsVideoEnabled(isVideo);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(incomingCall.callerUsername);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (incomingCall.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendCallSignal({
          id: `ans-${Date.now()}`,
          type: 'ANSWER',
          callerUsername: currentUser.username,
          callerName: currentUser.name,
          recipientUsername: incomingCall.callerUsername,
          isVideo,
          sdp: answer,
          timestamp: new Date().toISOString(),
        });
      }

      startCallTimer();
      setIncomingCall(null);
    } catch (err) {
      console.warn('[WebRTC] Error accepting call:', err);
      rejectIncomingCall();
    }
  };

  // Reject Incoming Call
  const rejectIncomingCall = async () => {
    stopRingtone();
    if (incomingCall) {
      await sendCallSignal({
        id: `rej-${Date.now()}`,
        type: 'REJECT',
        callerUsername: currentUser.username,
        callerName: currentUser.name,
        recipientUsername: incomingCall.callerUsername,
        isVideo: incomingCall.isVideo,
        timestamp: new Date().toISOString(),
      });
    }
    setIncomingCall(null);
    setCallState('IDLE');
  };

  // End Active Call
  const endCall = async () => {
    stopRingtone();
    clearInterval(timerRef.current);
    setCallDuration(0);

    if (activeCallPartner) {
      sendCallSignal({
        id: `end-${Date.now()}`,
        type: 'END',
        callerUsername: currentUser.username,
        callerName: currentUser.name,
        recipientUsername: activeCallPartner.username,
        isVideo: isVideoEnabled,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState('IDLE');
    setActiveCallPartner(null);
    onClearOutgoingCallRequest();
  };

  const startCallTimer = () => {
    clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Listen to Call Signals
  useEffect(() => {
    const unsubscribe = subscribeToCallSignals(async (signal) => {
      // 1. Incoming Call Offer
      if (
        signal.type === 'OFFER' &&
        signal.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        if (callState === 'CONNECTED' || callState === 'CALLING') {
          // Send busy
          sendCallSignal({
            id: `busy-${Date.now()}`,
            type: 'BUSY',
            callerUsername: currentUser.username,
            callerName: currentUser.name,
            recipientUsername: signal.callerUsername,
            isVideo: signal.isVideo,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        setIncomingCall(signal);
        setCallState('RINGING');
        startRingtone();
      }

      // 2. Incoming Answer
      if (
        signal.type === 'ANSWER' &&
        signal.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        if (peerConnectionRef.current && signal.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          setCallState('CONNECTED');
          startCallTimer();
        }
      }

      // 3. ICE Candidate
      if (
        signal.type === 'CANDIDATE' &&
        signal.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        if (peerConnectionRef.current && signal.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {}
        }
      }

      // 4. Call Rejected or Busy
      if (
        (signal.type === 'REJECT' || signal.type === 'BUSY') &&
        signal.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        alert(`${signal.callerName} is currently unavailable or declined the call.`);
        endCall();
      }

      // 5. Call Ended
      if (
        signal.type === 'END' &&
        signal.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        endCall();
      }
    });

    return () => {
      unsubscribe();
      stopRingtone();
      clearInterval(timerRef.current);
    };
  }, [currentUser.username, callState]);

  // Handle Outgoing Call Trigger
  useEffect(() => {
    if (outgoingCallRequest && callState === 'IDLE') {
      startOutgoingCall(
        outgoingCallRequest.recipientUsername,
        outgoingCallRequest.recipientName,
        outgoingCallRequest.isVideo
      );
    }
  }, [outgoingCallRequest]);

  // Format Duration seconds to MM:SS
  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. INCOMING CALL MODAL (Ringing)
  if (callState === 'RINGING' && incomingCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl text-white">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-blue-600/30 animate-ping absolute inset-0"></div>
            <div className="w-20 h-20 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center relative shadow-lg">
              {incomingCall.isVideo ? (
                <Video className="w-9 h-9 text-white" />
              ) : (
                <Phone className="w-9 h-9 text-white animate-bounce" />
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400 font-mono-code bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              Teams {incomingCall.isVideo ? 'Video Call' : 'Voice Call'}
            </span>
            <h3 className="text-xl font-bold font-display mt-2">{incomingCall.callerName}</h3>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">Incoming call from warehouse staff...</p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              type="button"
              onClick={rejectIncomingCall}
              className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <PhoneOff className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold">Decline</span>
            </button>

            <button
              type="button"
              onClick={acceptIncomingCall}
              className="flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE OR CALLING FULL MODAL / OVERLAY
  if (callState === 'CONNECTED' || callState === 'CALLING') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg animate-fadeIn text-white p-3 sm:p-6">
        <div className="w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
          
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                {activeCallPartner?.name.slice(0, 2).toUpperCase() || 'TA'}
              </div>
              <div>
                <h4 className="text-sm font-bold font-display">{activeCallPartner?.name || 'Warehouse Staff'}</h4>
                <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{callState === 'CALLING' ? 'Calling...' : formatDuration(callDuration)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono-code">
                Varale Plant P2P
              </span>
            </div>
          </div>

          {/* Main Video / Audio Area */}
          <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
            {isVideoEnabled ? (
              <>
                {/* Remote Partner Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local User Picture-in-Picture Video */}
                <div className="absolute bottom-4 right-4 w-36 sm:w-48 h-24 sm:h-32 bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white/80 bg-black/50 px-1.5 py-0.2 rounded font-mono-code">
                    You
                  </div>
                </div>
              </>
            ) : (
              /* Audio Voice Call Visualizer */
              <div className="text-center space-y-4">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="w-28 h-28 rounded-full bg-blue-600/20 animate-ping absolute inset-0"></div>
                  <div className="w-28 h-28 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-black shadow-xl">
                    {activeCallPartner?.name.slice(0, 2).toUpperCase() || 'TA'}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display">{activeCallPartner?.name}</h3>
                  <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                    {callState === 'CALLING' ? 'Ringing partner phone...' : 'Secure Shift Voice Call Active'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls Footer */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-center gap-4 sm:gap-6 z-10">
            {/* Toggle Mic */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-3.5 rounded-full transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Toggle Camera */}
            <button
              type="button"
              onClick={toggleVideo}
              className={`p-3.5 rounded-full transition cursor-pointer ${
                !isVideoEnabled
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg cursor-pointer flex items-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
};
