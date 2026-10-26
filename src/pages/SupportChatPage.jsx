import { useState, useEffect, useRef } from 'react';
import adminApi from '../services/api';
import { showSuccessAlert, showErrorAlert, showToast as swalToast } from '../utils/swal';
import { Bot, Crown, User, Pause, RotateCcw, Check } from 'lucide-react';

export default function SupportChatPage({ showToast, searchQuery = '' }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Default demo conversations if database is empty initially
  const defaultInitialChats = [
    {
      _id: 'chat_demo_1',
      userUid: 'UID-849201',
      userName: 'Rahul Sharma',
      userEmail: 'rahul.s@gmail.com',
      userPhone: '+91 98765 12340',
      status: 'Active',
      aiEnabled: true,
      lastMessage: 'Ji Rahul, aapka ₹15,000 withdrawal 15-30 minute ke andar bank account me credit ho jayega.',
      lastSender: 'ai',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
      unreadAdmin: 0,
      messages: [
        {
          _id: 'm1',
          sender: 'user',
          senderName: 'Rahul Sharma',
          text: 'Bhai maine ₹15,000 ka withdrawal lagaya tha, kab tak aayega?',
          createdAt: new Date(Date.now() - 1000 * 60 * 6),
        },
        {
          _id: 'm2',
          sender: 'ai',
          senderName: 'PAYNEX AI Agent',
          text: 'Namaste Rahul Sharma! Withdrawal amount aamtaur par 15 se 30 minute ke andar direct aapke bank account me IMPS ke dwara bhej diya jata hai. Maine aapki request check kar li hai, process chal raha hai.',
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
        },
      ],
    },
    {
      _id: 'chat_demo_2',
      userUid: 'UID-712390',
      userName: 'Priya Patel',
      userEmail: 'priya.patel@yahoo.com',
      userPhone: '+91 98112 44556',
      status: 'Active',
      aiEnabled: true,
      lastMessage: 'How to deposit via UPI QR?',
      lastSender: 'user',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 18),
      unreadAdmin: 1,
      messages: [
        {
          _id: 'm3',
          sender: 'user',
          senderName: 'Priya Patel',
          text: 'How to deposit via UPI QR? Minimum kitna hai?',
          createdAt: new Date(Date.now() - 1000 * 60 * 18),
        },
        {
          _id: 'm4',
          sender: 'ai',
          senderName: 'PAYNEX AI Agent',
          text: 'Hello Priya! The minimum deposit on PAYNEX is ₹500. Navigate to Wallet > Deposit, scan the official UPI QR code, and enter your 12-digit UTR ref number. Balance will reflect in 2-15 minutes.',
          createdAt: new Date(Date.now() - 1000 * 60 * 17),
        },
      ],
    },
    {
      _id: 'chat_demo_3',
      userUid: 'UID-902184',
      userName: 'Vikram Joshi',
      userEmail: 'vikram.j@gmail.com',
      userPhone: '+91 97766 55443',
      status: 'Resolved',
      aiEnabled: true,
      lastMessage: 'Password reset link successfully verified.',
      lastSender: 'ai',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 120),
      unreadAdmin: 0,
      messages: [
        {
          _id: 'm5',
          sender: 'user',
          senderName: 'Vikram Joshi',
          text: 'I forgot my password, how to recover?',
          createdAt: new Date(Date.now() - 1000 * 60 * 122),
        },
        {
          _id: 'm6',
          sender: 'ai',
          senderName: 'PAYNEX AI Agent',
          text: 'To reset your password, click "Forgot Password?" under the Sign In form. Enter your registered email to receive a 6-digit OTP code, then set a new password instantly.',
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        },
      ],
    },
  ];

  // Fetch all chat threads from backend
  const fetchChats = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getChatThreads();
      if (res && res.success && Array.isArray(res.chats) && res.chats.length > 0) {
        setChats(res.chats);
        if (!selectedChat) {
          setSelectedChat(res.chats[0]);
        } else {
          const updated = res.chats.find((c) => c._id === selectedChat._id);
          if (updated) setSelectedChat(updated);
        }
      } else {
        // Use default seeded chats
        setChats(defaultInitialChats);
        if (!selectedChat) setSelectedChat(defaultInitialChats[0]);
      }
    } catch (err) {
      console.warn('Backend chat fetch notice:', err.message);
      setChats(defaultInitialChats);
      if (!selectedChat) setSelectedChat(defaultInitialChats[0]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 8000); // Polling for live user messages
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat box to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  // Handle selecting a chat thread
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    try {
      await adminApi.getChatById(chat._id);
      // Mark local unread as 0
      setChats((prev) =>
        prev.map((c) => (c._id === chat._id ? { ...c, unreadAdmin: 0 } : c))
      );
    } catch {}
  };

  // Handle Admin sending manual message
  const handleSendAdminReply = async (e) => {
    if (e) e.preventDefault();
    const cleanText = adminReplyText.trim();
    if (!cleanText || !selectedChat) return;

    setIsSending(true);
    const newMsg = {
      _id: 'adm_' + Date.now(),
      sender: 'admin',
      senderName: 'Super Admin',
      text: cleanText,
      createdAt: new Date(),
    };

    // Optimistic UI update
    const updatedSelected = {
      ...selectedChat,
      messages: [...selectedChat.messages, newMsg],
      lastMessage: cleanText,
      lastSender: 'admin',
      lastMessageAt: new Date(),
    };
    setSelectedChat(updatedSelected);
    setChats((prev) =>
      prev.map((c) => (c._id === selectedChat._id ? updatedSelected : c))
    );
    setAdminReplyText('');

    try {
      await adminApi.sendAdminChatReply(selectedChat._id, cleanText, 'Super Admin');
      swalToast('Reply sent to trader desk', 'success');
    } catch (err) {
      console.warn('Backend chat reply notice:', err.message);
      swalToast('Reply sent locally', 'success');
    } finally {
      setIsSending(false);
    }
  };

  // Toggle AI Auto-Reply on/off for this user
  const handleToggleAi = async () => {
    if (!selectedChat) return;
    const newAiState = !selectedChat.aiEnabled;
    const updated = { ...selectedChat, aiEnabled: newAiState };
    setSelectedChat(updated);
    setChats((prev) =>
      prev.map((c) => (c._id === selectedChat._id ? updated : c))
    );

    try {
      await adminApi.updateChatStatus(selectedChat._id, selectedChat.status, newAiState);
      swalToast(`AI Auto-Reply ${newAiState ? 'ENABLED' : 'PAUSED'} for ${selectedChat.userName}`, newAiState ? 'success' : 'warning');
    } catch {}
  };

  // Toggle Resolution Status
  const handleToggleStatus = async () => {
    if (!selectedChat) return;
    const newStatus = selectedChat.status === 'Resolved' ? 'Active' : 'Resolved';
    const updated = { ...selectedChat, status: newStatus };
    setSelectedChat(updated);
    setChats((prev) =>
      prev.map((c) => (c._id === selectedChat._id ? updated : c))
    );

    try {
      await adminApi.updateChatStatus(selectedChat._id, newStatus);
      swalToast(`Chat marked as ${newStatus}`, 'success');
    } catch {}
  };

  // Filter chats by search and status
  const filteredChats = chats.filter((c) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      !q ||
      c.userName.toLowerCase().includes(q) ||
      c.userUid.toLowerCase().includes(q) ||
      c.userEmail.toLowerCase().includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'All' || c.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Quick Templates
  const applyTemplate = (tpl) => {
    setAdminReplyText(tpl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100vh - 120px)' }}>
      {/* Top Stats Banner */}
      <div
        className="square-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#0d111a',
          border: '1px solid #1a2233',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bot size={22} color="#fbbf24" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9' }}>
              AI Live Support Desk &amp; Trader Chat
            </div>
            <div style={{ fontSize: '11px', color: '#8b9bb4' }}>
              Real-time multilingual AI Assistant auto-resolves deposits, withdrawals, and contract queries
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="square-badge badge-green"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
          >
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
            AI Auto-Reply Engine: ACTIVE
          </span>
          <button
            onClick={fetchChats}
            disabled={isLoading}
            className="square-btn-secondary"
            style={{ padding: '5px 12px', fontSize: '11px' }}
          >
            {isLoading ? 'Syncing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Main 2-Pane Chat Desk Viewport */}
      <div
        className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3.5 flex-1 min-h-0"
      >
        {/* ============================================================== */}
        {/* LEFT PANE: CONVERSATION LIST                                   */}
        {/* ============================================================== */}
        <div
          className={`square-card flex-col bg-[#0f1420] border border-[#1e283d] p-0 overflow-hidden ${
            selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Filter Bar */}
          <div style={{ padding: '12px', borderBottom: '1px solid #1a2233', background: '#0a0d14' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'Active', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: statusFilter === st ? '#f59e0b' : '#232d3f',
                    background: statusFilter === st ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    color: statusFilter === st ? '#fbbf24' : '#8b9bb4',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChats.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                No conversations found.
              </div>
            ) : (
              filteredChats.map((c) => {
                const isSelected = selectedChat?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => handleSelectChat(c)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #182030',
                      background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #f59e0b' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9' }}>
                          {c.userName}
                        </span>
                        {c.unreadAdmin > 0 && (
                          <span
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: '9.5px',
                              fontWeight: 900,
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        {c.userUid}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: '11.5px',
                        color: isSelected ? '#cbd5e1' : '#8b9bb4',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <span className="inline-flex items-center gap-1 mr-1">
                        {c.lastSender === 'ai' ? (
                          <Bot size={11} className="text-amber-400 inline" />
                        ) : c.lastSender === 'admin' ? (
                          <Crown size={11} className="text-emerald-400 inline" />
                        ) : (
                          <User size={11} className="text-blue-400 inline" />
                        )}
                      </span>
                      {c.lastMessage}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          className={`square-badge ${c.status === 'Resolved' ? 'badge-gray' : 'badge-gold'}`}
                          style={{ fontSize: '9.5px', padding: '1px 6px' }}
                        >
                          {c.status}
                        </span>
                        {c.aiEnabled && (
                          <span
                            className="square-badge badge-green"
                            style={{ fontSize: '9.5px', padding: '1px 6px' }}
                          >
                            AI ACTIVE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANE: ACTIVE CHAT TRANSCRIPT & ADMIN REPLY CONTROLS      */}
        {/* ============================================================== */}
        <div
          className={`square-card flex-col bg-[#0f1420] border border-[#1e283d] p-0 overflow-hidden ${
            !selectedChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedChat ? (
            <>
              {/* Header Bar */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#0a0d14',
                  borderBottom: '1px solid #1a2233',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden px-2 py-1 bg-[#182030] hover:bg-[#202b40] text-amber-500 font-bold text-xs border border-[#2b374e] cursor-pointer shrink-0"
                    style={{ borderRadius: '0px' }}
                    title="Back to conversation list"
                  >
                    ← Back
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                      {selectedChat.userName}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 5px' }}>
                      {selectedChat.userUid}
                    </span>
                    <span className="hidden sm:inline" style={{ fontSize: '11px', color: '#8b9bb4' }}>
                      {selectedChat.userEmail}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleToggleAi}
                    className="square-btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderColor: selectedChat.aiEnabled ? 'rgba(16, 185, 129, 0.4)' : '#64748b',
                      color: selectedChat.aiEnabled ? '#34d399' : '#94a3b8',
                    }}
                    title="Toggle Automated AI Assistant for this trader"
                  >
                    {selectedChat.aiEnabled ? (
                      <span className="flex items-center gap-1.5"><Bot size={12} /> AI Auto-Reply: ON</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Pause size={12} /> AI Auto-Reply: OFF</span>
                    )}
                  </button>

                  <button
                    onClick={handleToggleStatus}
                    className="square-btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: selectedChat.status === 'Resolved' ? '#f59e0b' : '#10b981',
                      borderColor: selectedChat.status === 'Resolved' ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {selectedChat.status === 'Resolved' ? (
                      <span className="flex items-center gap-1.5"><RotateCcw size={12} /> Reopen Chat</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Check size={12} strokeWidth={3} /> Mark Resolved</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: '#090c13',
                }}
              >
                {selectedChat.messages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  const isAi = m.sender === 'ai';
                  const isAdmin = m.sender === 'admin';

                  return (
                    <div
                      key={m._id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        alignSelf: isUser ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: isUser ? '#60a5fa' : isAi ? '#fbbf24' : '#34d399',
                          fontWeight: 700,
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isUser ? (
                          <>
                            <User size={11} /> {m.senderName}
                          </>
                        ) : isAi ? (
                          <>
                            <Bot size={11} /> {m.senderName}
                          </>
                        ) : (
                          <>
                            <Crown size={11} /> {m.senderName}
                          </>
                        )}
                        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        style={{
                          padding: '10px 14px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          borderRadius: '8px',
                          background: isUser
                            ? 'rgba(30, 41, 59, 0.85)'
                            : isAi
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))'
                            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.1))',
                          border: isUser
                            ? '1px solid #334155'
                            : isAi
                            ? '1px solid rgba(245, 158, 11, 0.35)'
                            : '1px solid rgba(16, 185, 129, 0.45)',
                          color: '#f8fafc',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Response Templates Bar */}
              <div
                style={{
                  padding: '8px 14px',
                  background: '#0d111a',
                  borderTop: '1px solid #1a2233',
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                }}
              >
                <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                  Quick Reply:
                </span>
                {[
                  'Deposit verified & credited to wallet',
                  'Withdrawal IMPS released to your bank account',
                  'Please upload valid Aadhaar/PAN for KYC',
                  'Issue resolved. Feel free to trade!',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid #232d3f',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10.5px',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form
                onSubmit={handleSendAdminReply}
                style={{
                  padding: '12px 14px',
                  background: '#0a0d14',
                  borderTop: '1px solid #1a2233',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  placeholder="Type manual reply as Super Admin... (AI will automatically assist user otherwise)"
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#121722',
                    border: '1px solid #232d3f',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || !adminReplyText.trim()}
                  className="square-btn-primary"
                  style={{
                    padding: '0 20px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    opacity: isSending || !adminReplyText.trim() ? 0.6 : 1,
                    cursor: isSending || !adminReplyText.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSending ? 'Sending...' : 'Send Reply ↵'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              Select a conversation to view transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
