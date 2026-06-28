import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, TOKEN_KEY } from '../api.js';
import { useAuth } from '../auth.jsx';
import GifPicker from './GifPicker.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const NICK_COLORS = [
  '#e05c5c', '#e0935c', '#d4bc4a', '#4caf78',
  '#4ab8d4', '#5c8fd4', '#9c5cd4', '#d45cb8',
  '#4ccc9c', '#d4795c',
];

function nickColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(h, 31) + name.charCodeAt(i)) >>> 0;
  }
  return NICK_COLORS[h % NICK_COLORS.length];
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

const IMG_URL_RE = /^https?:\/\/\S+\.(gif|jpg|jpeg|png|webp)(\?\S*)?$/i;
const GIPHY_RE = /^https?:\/\/(media\d?\.)?giphy\.com\/\S+$/i;
const TENOR_RE = /^https?:\/\/(media\d?\.)?tenor\.com\/\S+$/i;

function isImageUrl(text) {
  const t = (text || '').trim();
  return IMG_URL_RE.test(t) || GIPHY_RE.test(t) || TENOR_RE.test(t);
}

const MAX_B64 = 180000; // ~135 KB image, safe under server 250 KB limit

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const MAX_DIM = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        const s = MAX_DIM / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // Adaptive quality: start high, reduce until it fits
      let quality = 0.88;
      let dataUrl;
      do {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        quality -= 0.08;
      } while (dataUrl.length > MAX_B64 && quality > 0.28);

      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

export default function Chat({ onClose, onNewMessage }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [sendErr, setSendErr] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    api.chat.messages().then(setMsgs);

    const token = localStorage.getItem(TOKEN_KEY) || '';
    const es = new EventSource(`${API_BASE}/chat/stream?token=${encodeURIComponent(token)}`);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMsgs((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev; // dedup own optimistic messages
        onNewMessage?.();
        return [...prev, msg];
      });
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'instant' : 'smooth' });
    isFirstLoad.current = false;
  }, [msgs]);

  const addOptimistic = (msg) => {
    setMsgs((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
  };

  const send = async (e) => {
    e?.preventDefault();
    setSendErr(false);
    if (pendingImage) {
      const img = pendingImage;
      try {
        setPendingImage(null);
        const out = await api.chat.sendImage(img);
        addOptimistic(out);
      } catch {
        setPendingImage(img);
        setSendErr(true);
        setTimeout(() => setSendErr(false), 3000);
      }
      return;
    }
    const t = text.trim();
    if (!t) return;
    setText('');
    inputRef.current?.focus();
    const out = await api.chat.send(t);
    addOptimistic(out);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingImage(dataUrl);
      setShowGif(false);
    } catch (err) {
      console.error('Image compression failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleGifSelect = async (url) => {
    await api.chat.send(url);
  };

  const imgSrc = (m) => m.imageData || (isImageUrl(m.text) ? m.text.trim() : null);

  return (
    <>
      {/* Lightbox — rendered in document.body to escape the fixed overlay's stacking context */}
      {lightbox && createPortal(
        <div className="chat-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>,
        document.body
      )}

      <div className="chat-panel">
        <div className="chat-header">
          <span className="chat-title">Chat</span>
          {onClose && (
            <button className="chat-close" onClick={onClose} aria-label="Zavrieť chat">✕</button>
          )}
        </div>

        <div className="chat-messages">
          {msgs.length === 0 && (
            <p className="muted small" style={{ margin: '1rem auto', textAlign: 'center' }}>
              Zatiaľ žiadne správy.
            </p>
          )}
          {msgs.map((m) => {
            const mine = m.nickname === user?.nickname;
            const color = nickColor(m.nickname);
            const src = imgSrc(m);
            return (
              <div key={m._id} className={`chat-msg ${mine ? 'mine' : ''}`}>
                {!mine && <span className="chat-nick" style={{ color }}>{m.nickname}</span>}
                <div className="chat-bubble">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="chat-img"
                      loading="lazy"
                      onClick={() => setLightbox(src)}
                    />
                  ) : (
                    m.text
                  )}
                </div>
                <span className="chat-time">{fmtTime(m.createdAt)}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* GIF picker panel */}
        {showGif && (
          <GifPicker
            onSelect={handleGifSelect}
            onClose={() => setShowGif(false)}
          />
        )}

        {/* Image preview before send */}
        {pendingImage && (
          <div className="chat-img-preview">
            <div className="chat-img-preview-inner">
              <img src={pendingImage} alt="preview" />
              <button
                type="button"
                className="chat-img-preview-cancel"
                onClick={() => setPendingImage(null)}
              >✕</button>
            </div>
            <span className="muted small">Stlač ➤ na odoslanie</span>
          </div>
        )}

        {sendErr && (
          <div className="chat-send-err">Obrázok je príliš veľký, skús menší.</div>
        )}
        <form className="chat-input-row" onSubmit={send}>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <button
            type="button"
            className="chat-attach"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Priložiť obrázok"
            title="Priložiť obrázok"
          >
            {uploading ? '…' : '📷'}
          </button>
          <button
            type="button"
            className={`chat-gif-btn ${showGif ? 'active' : ''}`}
            onClick={() => { setShowGif((v) => !v); setPendingImage(null); }}
            aria-label="GIF"
            title="Vybrať GIF"
          >
            GIF
          </button>
          <input
            ref={inputRef}
            className="chat-input"
            placeholder={pendingImage ? 'Pridaj popis…' : 'Napíš správu…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            autoComplete="off"
          />
          <button
            type="submit"
            className="chat-send"
            disabled={!text.trim() && !pendingImage}
          >
            ➤
          </button>
        </form>
      </div>
    </>
  );
}
