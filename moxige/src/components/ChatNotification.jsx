import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useI18n } from '../i18n';

export default function ChatNotification() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useI18n();
    const [notification, setNotification] = useState(null);
    const [debugInfo, setDebugInfo] = useState({ status: 'init', phone: '', lastMsg: null, error: null });

    // Read session/user info to identify the current user
    const session = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("sessionUser") || "null"); } catch { return null; }
    }, []);

    const phone = useMemo(() => {
        if (session?.phone) return String(session.phone);
        try {
            const u = JSON.parse(localStorage.getItem('users') || '[]');
            const m = u.find(x => x.id && session?.id && x.id === session.id);
            if (m?.phone) return String(m.phone);
        } catch { }
        try { const anon = localStorage.getItem('anon_phone'); if (anon) return String(anon); } catch { }
        return '';
    }, [session]);

    const imBase = useMemo(() => {
        try { const v = String(localStorage.getItem('im:base') || '').trim(); if (v) return v; } catch { }
        try { const v = String(import.meta.env?.VITE_IM_BASE || '').trim(); if (v) return v; } catch { }
        return '/im-api';
    }, []);

    useEffect(() => {
        if (!phone) return;

        // Don't show notifications if already on the support page
        // Note: The support page path might be /me/support or /me/institution depending on context, 
        // but usually it's /me/support for the chat interface.
        // However, the user request says "if customer is not on the current page".
        // We'll check if the pathname includes 'support' or if we are in the iframe page (which is unlikely here as this is the main app).

        const token = (() => {
            try { return String(localStorage.getItem('im:token') || import.meta.env?.VITE_IM_TOKEN || '').trim(); } catch { return ''; }
        })();

        const base = imBase.replace(/\/$/, '');
        let socketUrl = undefined;
        let pathPrefix = '';
        try {
            const u = new URL(base, window.location.origin);
            pathPrefix = u.pathname.replace(/\/$/, '');
            if (base.startsWith('http')) {
                socketUrl = u.origin;
            }
        } catch { }

        const socketPath = pathPrefix + '/socket.io/';

        console.log('[ChatNotification] Connecting. URL:', socketUrl, 'Path:', socketPath, 'Phone:', phone);
        setDebugInfo(prev => ({ ...prev, status: 'connecting', phone, url: socketUrl, path: socketPath }));

        const opts = {
            path: socketPath,
            auth: { token },
            query: { token },
            transports: ['websocket', 'polling']
        };

        const socket = socketUrl ? io(socketUrl, opts) : io(opts);

        socket.on('connect', () => {
            console.log('[ChatNotification] Connected with ID:', socket.id);
            setDebugInfo(prev => ({ ...prev, status: 'connected', id: socket.id }));
            socket.emit('join', { phone, role: 'customer' });
        });

        socket.on('connect_error', (err) => {
            console.error('[ChatNotification] Connection error:', err);
            setDebugInfo(prev => ({ ...prev, status: 'error', error: String(err) }));
        });

        socket.on('message', (msg) => {
            console.log('[ChatNotification] Received message:', msg);
            setDebugInfo(prev => ({ ...prev, lastMsg: msg }));
            // Only notify for agent messages
            if (msg && msg.sender === 'agent') {
                // Check if we are currently on the support page
                if (window.location.pathname.includes('/me/support')) return;

                // Increment unread count
                try {
                    const current = parseInt(localStorage.getItem('im:unread_count') || '0', 10);
                    localStorage.setItem('im:unread_count', String(current + 1));
                    window.dispatchEvent(new Event('im:unread'));
                } catch { }

                setNotification({
                    id: msg.id || Date.now(),
                    content: msg.type === 'image' ? (t('imageMessage') || '图片消息') : (msg.content || ''),
                    title: t('newServiceMessage') || '新客服消息'
                });

                // Auto dismiss after 5 seconds
                setTimeout(() => {
                    setNotification(prev => (prev && prev.id === (msg.id || Date.now()) ? null : prev));
                }, 5000);
            }
        });

        return () => {
            console.log('[ChatNotification] Disconnecting');
            socket.disconnect();
        };
    }, [phone, imBase, t]);

    // Render debug info if URL param ?debug=1 is present
    const showDebug = new URLSearchParams(window.location.search).get('debug') === '1';

    if (!notification && !showDebug) return null;

    return (
        <>
            {showDebug && (
                <div style={{ position: 'fixed', bottom: 10, left: 10, background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: 10, zIndex: 99999, fontSize: 12, pointerEvents: 'none' }}>
                    <div>Status: {debugInfo.status}</div>
                    <div>Phone: {debugInfo.phone}</div>
                    <div>Error: {debugInfo.error || 'none'}</div>
                    <div>Last Msg: {JSON.stringify(debugInfo.lastMsg)}</div>
                </div>
            )}
            {notification && (
                <div
                    onClick={() => {
                        setNotification(null);
                        try {
                            localStorage.setItem('im:unread_count', '0');
                            window.dispatchEvent(new Event('im:unread'));
                        } catch { }
                        navigate('/me/support');
                    }}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 10000,
                        background: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        maxWidth: '300px',
                        cursor: 'pointer',
                        borderLeft: '4px solid #2860ff',
                        animation: 'slideIn 0.3s ease-out'
                    }}
                >
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1a1f36', fontSize: '14px' }}>
                        {notification.title}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notification.content}
                    </div>
                    <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
                </div>
            )}
        </>
    );
}
