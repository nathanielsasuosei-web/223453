import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Banknote,
  Check,
  ChevronDown,
  CirclePlay,
  Clock3,
  Disc3,
  Download,
  FileAudio,
  Headphones,
  LockKeyhole,
  Mail,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Video,
  Volume2,
  X,
} from 'lucide-react';

const STORE = {
  beats: 'kairo:beats',
  videos: 'kairo:videos',
  users: 'kairo:users',
  user: 'kairo:user',
  orders: 'kairo:orders',
  messages: 'kairo:messages',
  emails: 'kairo:emails',
  settings: 'kairo:settings',
  cart: 'kairo:cart',
  admin: 'kairo:studio-session',
};

const SEEDED_BEATS = [
  {
    id: 'beat-late-check-in',
    title: 'Late Check-in',
    genre: 'Afro fusion',
    bpm: 104,
    key: 'F minor',
    price: 29,
    coverWord: 'LATE',
    mood: 'After hours, but make it golden.',
    colors: ['#ee8759', '#6d2f30', '#f1c06e'],
    audioId: null,
    fileName: null,
  },
  {
    id: 'beat-slow-burn',
    title: 'Slow Burn',
    genre: 'R&B',
    bpm: 86,
    key: 'D minor',
    price: 35,
    coverWord: 'SLOW',
    mood: 'For the part you almost said out loud.',
    colors: ['#b49bf0', '#46376f', '#e8a1c2'],
    audioId: null,
    fileName: null,
  },
  {
    id: 'beat-palmwine',
    title: 'Palmwine',
    genre: 'Amapiano',
    bpm: 112,
    key: 'A major',
    price: 32,
    coverWord: 'PALM',
    mood: 'A little sun in the middle of everything.',
    colors: ['#91b46c', '#395540', '#e1bd64'],
    audioId: null,
    fileName: null,
  },
  {
    id: 'beat-no-reply',
    title: 'No Reply',
    genre: 'Trap soul',
    bpm: 98,
    key: 'C# minor',
    price: 29,
    coverWord: 'NØ REPLY',
    mood: 'The message can wait. The hook cannot.',
    colors: ['#7497bd', '#263b57', '#e37a69'],
    audioId: null,
    fileName: null,
  },
];

const DEFAULT_SETTINGS = {
  currency: 'USD',
  mobileProvider: '',
  mobileNumber: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  contactEmail: '',
};

const GENRES = ['All sounds', 'Afro fusion', 'Amapiano', 'R&B', 'Trap soul', 'Hip-hop', 'Other'];
const CURRENCIES = ['USD', 'GHS', 'KES', 'NGN', 'ZAR'];
const DEMO_STUDIO_PASSWORD = 'soundcheck';

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage can be disabled or full; the current session still works.
  }
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Browser file storage is not available.'));
      return;
    }
    const request = indexedDB.open('kairo-local-media', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('media')) {
        request.result.createObjectStore('media');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveMedia(id, file) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media', 'readwrite');
    transaction.objectStore('media').put(file, id);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getMedia(id) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('media', 'readonly').objectStore('media').get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function removeMedia(id) {
  if (!id || !('indexedDB' in window)) return;
  try {
    const db = await openMediaDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('media', 'readwrite');
      transaction.objectStore('media').delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // Media cleanup is best-effort.
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatMoney(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  } catch {
    return `$${Number(amount) || 0}`;
  }
}

function niceDate(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

function videoEmbedUrl(value) {
  try {
    const url = new URL(value);
    let id = '';
    if (url.hostname.includes('youtu.be')) id = url.pathname.slice(1);
    else if (url.hostname.includes('youtube.com')) id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1);
    if (id && /^[a-zA-Z0-9_-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return '';
  }
  return '';
}

function Brand({ light = false }) {
  return (
    <a className={`brand ${light ? 'brand-light' : ''}`} href="#top" aria-label="Kairo Sound home">
      <span className="brand-mark"><AudioLines size={19} strokeWidth={2.4} /></span>
      <span className="brand-type">KAIRO<span>SOUND</span></span>
    </a>
  );
}

function WaveMarks({ count = 24, quiet = false }) {
  return (
    <span className={`wave-marks ${quiet ? 'wave-quiet' : ''}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <i key={index} style={{ '--i': index, '--h': `${16 + ((index * 13 + 7) % 68)}%` }} />
      ))}
    </span>
  );
}

function BeatCover({ beat, index, isPlaying, onPlay }) {
  return (
    <div
      className="beat-cover"
      style={{
        '--cover-a': beat.colors?.[0] || '#a5b97a',
        '--cover-b': beat.colors?.[1] || '#263d35',
        '--cover-c': beat.colors?.[2] || '#e9c467',
      }}
    >
      <div className="cover-grid" />
      <div className="cover-orbit cover-orbit-one" />
      <div className="cover-orbit cover-orbit-two" />
      <div className="cover-disc"><span>{String(index + 1).padStart(2, '0')}</span></div>
      <div className="cover-topline"><span>KAIRO SOUND / INSTRUMENTAL</span><Disc3 size={15} /></div>
      <div className="cover-title">{beat.coverWord || beat.title.split(' ')[0]}</div>
      <div className="cover-bottomline"><span>{beat.genre}</span><span>ORIGINAL / 01</span></div>
      <button className={`cover-play ${isPlaying ? 'is-playing' : ''}`} onClick={onPlay} aria-label={`${isPlaying ? 'Pause' : 'Play'} ${beat.title} preview`}>
        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <div className="cover-grain" />
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span className="toast-check"><Check size={15} /></span>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss"><X size={15} /></button>
    </div>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <label className="field-wrap">
      <span className="field-label">{label}</span>
      <input className="field-input" {...props} />
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

function App() {
  const [beats, setBeats] = useState(() => readStore(STORE.beats, SEEDED_BEATS));
  const [videos, setVideos] = useState(() => readStore(STORE.videos, []));
  const [users, setUsers] = useState(() => readStore(STORE.users, []));
  const [user, setUser] = useState(() => readStore(STORE.user, null));
  const [orders, setOrders] = useState(() => readStore(STORE.orders, []));
  const [messages, setMessages] = useState(() => readStore(STORE.messages, []));
  const [emails, setEmails] = useState(() => readStore(STORE.emails, []));
  const [settings, setSettings] = useState(() => readStore(STORE.settings, DEFAULT_SETTINGS));
  const [cart, setCart] = useState(() => readStore(STORE.cart, []));
  const [mediaUrls, setMediaUrls] = useState({});
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState('All sounds');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null);
  const [accountMode, setAccountMode] = useState('signin');
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [studioSession, setStudioSession] = useState(() => readStore(STORE.admin, false));
  const [studioTab, setStudioTab] = useState('beats');
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef(null);
  const objectUrlsRef = useRef(new Map());

  useEffect(() => writeStore(STORE.beats, beats), [beats]);
  useEffect(() => writeStore(STORE.videos, videos), [videos]);
  useEffect(() => writeStore(STORE.users, users), [users]);
  useEffect(() => writeStore(STORE.user, user), [user]);
  useEffect(() => writeStore(STORE.orders, orders), [orders]);
  useEffect(() => writeStore(STORE.messages, messages), [messages]);
  useEffect(() => writeStore(STORE.emails, emails), [emails]);
  useEffect(() => writeStore(STORE.settings, settings), [settings]);
  useEffect(() => writeStore(STORE.cart, cart), [cart]);
  useEffect(() => writeStore(STORE.admin, studioSession), [studioSession]);

  useEffect(() => {
    let cancelled = false;
    const ids = [
      ...beats.map((beat) => beat.audioId),
      ...videos.map((video) => video.mediaId),
      ...orders.flatMap((order) => (order.items || []).map((item) => item.audioId)),
    ].filter((id, index, all) => id && !mediaUrls[id] && all.indexOf(id) === index);

    ids.forEach(async (id) => {
      if (objectUrlsRef.current.has(id)) return;
      try {
        const file = await getMedia(id);
        if (!file || cancelled) return;
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.set(id, url);
        setMediaUrls((current) => ({ ...current, [id]: url }));
      } catch {
        // The track stays in the library even if its local media was cleared.
      }
    });

    return () => { cancelled = true; };
  }, [beats, videos, orders, mediaUrls]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const currentTrack = useMemo(() => beats.find((beat) => beat.id === activeTrackId) || null, [beats, activeTrackId]);
  const displayedBeats = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return beats.filter((beat) => {
      const matchesGenre = selectedGenre === 'All sounds' || beat.genre.toLowerCase() === selectedGenre.toLowerCase();
      const matchesQuery = !query || `${beat.title} ${beat.genre} ${beat.key} ${beat.mood || ''}`.toLowerCase().includes(query);
      return matchesGenre && matchesQuery;
    });
  }, [beats, selectedGenre, searchTerm]);
  const cartItems = useMemo(() => cart.map((id) => beats.find((beat) => beat.id === id)).filter(Boolean), [cart, beats]);
  const cartTotal = cartItems.reduce((sum, beat) => sum + Number(beat.price || 0), 0);
  const accountOrders = useMemo(() => user ? orders.filter((order) => order.email?.toLowerCase() === user.email.toLowerCase()) : [], [orders, user]);
  const currency = settings.currency || 'USD';

  useEffect(() => {
    const player = audioRef.current;
    if (!player || !currentTrack) return;
    const nextSource = currentTrack.audioId ? mediaUrls[currentTrack.audioId] : '/demo-beat.wav';
    if (!nextSource) return;
    player.src = nextSource;
    player.load();
    setCurrentTime(0);
    setDuration(0);
    if (isPlaying) player.play().catch(() => setIsPlaying(false));
  }, [activeTrackId, currentTrack?.audioId, mediaUrls]);

  useEffect(() => {
    const player = audioRef.current;
    if (!player || !currentTrack) return;
    if (isPlaying) player.play().catch(() => setIsPlaying(false));
    else player.pause();
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setModal(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const activeCartCount = cart.length;

  function notify(message) {
    setToastMessage(message);
  }

  function openAccount() {
    if (user) {
      setModal({ type: 'account' });
      return;
    }
    setAccountMode('signin');
    setModal({ type: 'account' });
  }

  function handlePlay(beat) {
    if (activeTrackId === beat.id) {
      setIsPlaying((playing) => !playing);
      return;
    }
    setActiveTrackId(beat.id);
    setIsPlaying(true);
  }

  function stopPlayer() {
    audioRef.current?.pause();
    setIsPlaying(false);
    setActiveTrackId(null);
    setCurrentTime(0);
  }

  function addToCart(beat) {
    setCart((current) => current.includes(beat.id) ? current : [...current, beat.id]);
    notify(cart.includes(beat.id) ? 'That beat is already in your bag.' : `${beat.title} added to your bag.`);
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item !== id));
  }

  function beginCheckout() {
    if (!cartItems.length) {
      notify('Add a beat to your bag first.');
      return;
    }
    if (!user) {
      setPendingCheckout(true);
      setAccountMode('signup');
      setModal({ type: 'account' });
      return;
    }
    setModal({ type: 'checkout' });
  }

  async function handleAuthSubmit(mode, values) {
    const email = values.email.trim().toLowerCase();
    if (!email || !values.password) throw new Error('Add your email and password to continue.');
    const passwordHash = await hashPassword(values.password);
    const existing = users.find((saved) => saved.email.toLowerCase() === email);

    if (mode === 'signup') {
      if (existing) throw new Error('An account already exists for that email. Sign in instead.');
      const profile = { name: values.name.trim(), email };
      if (!profile.name) throw new Error('Add your name to create an account.');
      const account = { ...profile, passwordHash, createdAt: new Date().toISOString() };
      setUsers((current) => [...current, account]);
      setUser(profile);
      setModal(pendingCheckout ? { type: 'checkout' } : { type: 'account' });
      setPendingCheckout(false);
      notify(`You're in, ${profile.name.split(' ')[0]}.`);
      return;
    }

    if (!existing || existing.passwordHash !== passwordHash) {
      throw new Error('We couldn’t match that email and password. Try again or create an account.');
    }
    setUser({ name: existing.name, email: existing.email });
    setModal(pendingCheckout ? { type: 'checkout' } : { type: 'account' });
    setPendingCheckout(false);
    notify(`Welcome back, ${existing.name.split(' ')[0]}.`);
  }

  function logout() {
    setUser(null);
    setModal(null);
    notify('You’re signed out.');
  }

  function submitOrder(payment) {
    if (!user) {
      setPendingCheckout(true);
      setAccountMode('signin');
      setModal({ type: 'account' });
      return;
    }
    const items = cartItems.map((beat) => ({
      id: beat.id,
      title: beat.title,
      genre: beat.genre,
      price: Number(beat.price),
      audioId: beat.audioId || null,
      fileName: beat.fileName || null,
    }));
    const order = {
      id: makeId('KS'),
      name: user.name,
      email: user.email,
      items,
      amount: cartTotal,
      currency,
      paymentMethod: payment.method,
      paymentProvider: payment.provider || '',
      paymentContact: payment.contact || '',
      reference: payment.reference || '',
      status: 'pending',
      placedAt: new Date().toISOString(),
    };
    setOrders((current) => [order, ...current]);
    setCart([]);
    setModal({ type: 'order-placed', order });
  }

  async function downloadItem(item) {
    let href = item.audioId ? mediaUrls[item.audioId] : null;
    if (!href && item.audioId) {
      try {
        const file = await getMedia(item.audioId);
        if (file) {
          href = URL.createObjectURL(file);
          objectUrlsRef.current.set(item.audioId, href);
          setMediaUrls((current) => ({ ...current, [item.audioId]: href }));
        }
      } catch {
        // Fall through to the sample track if this local file is no longer present.
      }
    }
    const link = document.createElement('a');
    link.href = href || '/demo-beat.wav';
    link.download = item.fileName || `${(item.title || 'kairo-beat').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function addBeat(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const audioFile = data.get('audioFile');
    if (!(audioFile instanceof File) || !audioFile.size) {
      notify('Choose an audio file before publishing this beat.');
      return;
    }
    if (audioFile.size > 45 * 1024 * 1024) {
      notify('Keep beat uploads under 45 MB in this preview.');
      return;
    }
    const id = makeId('beat');
    const audioId = makeId('audio');
    try {
      await saveMedia(audioId, audioFile);
    } catch {
      // In-memory preview still works if the browser blocks IndexedDB.
    }
    const objectUrl = URL.createObjectURL(audioFile);
    objectUrlsRef.current.set(audioId, objectUrl);
    setMediaUrls((current) => ({ ...current, [audioId]: objectUrl }));
    const coverSets = [
      ['#a5b97a', '#395540', '#e1bd64'],
      ['#e28c69', '#793e3d', '#f0c875'],
      ['#b49bf0', '#46376f', '#e8a1c2'],
      ['#7497bd', '#263b57', '#e37a69'],
    ];
    const nextBeat = {
      id,
      title: String(data.get('title') || '').trim(),
      genre: String(data.get('genre') || 'Afro fusion'),
      bpm: Number(data.get('bpm')) || 100,
      key: String(data.get('key') || 'C minor'),
      price: Number(data.get('price')) || 29,
      coverWord: String(data.get('title') || 'NEW').trim().split(' ')[0].toUpperCase().slice(0, 9),
      mood: 'A new sound from the studio.',
      colors: coverSets[beats.length % coverSets.length],
      audioId,
      fileName: audioFile.name,
      addedAt: new Date().toISOString(),
    };
    setBeats((current) => [nextBeat, ...current]);
    form.reset();
    notify(`${nextBeat.title} is live in the beat store.`);
  }

  async function addVideo(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('videoFile');
    const url = String(data.get('videoUrl') || '').trim();
    if (!(file instanceof File) || !file.size) {
      if (!url) {
        notify('Add a video file or a YouTube link to publish a visual.');
        return;
      }
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        notify('Enter a valid video link.');
        return;
      }
    }
    if (file instanceof File && file.size > 140 * 1024 * 1024) {
      notify('Keep video uploads under 140 MB in this preview.');
      return;
    }
    const id = makeId('visual');
    const mediaId = file instanceof File && file.size ? makeId('video') : null;
    if (mediaId) {
      try {
        await saveMedia(mediaId, file);
      } catch {
        // The object URL below remains available for this session.
      }
      const objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.set(mediaId, objectUrl);
      setMediaUrls((current) => ({ ...current, [mediaId]: objectUrl }));
    }
    const nextVideo = {
      id,
      title: String(data.get('title') || '').trim(),
      caption: String(data.get('caption') || '').trim(),
      mediaId,
      fileName: mediaId ? file.name : null,
      url: url || '',
      addedAt: new Date().toISOString(),
    };
    setVideos((current) => [nextVideo, ...current]);
    form.reset();
    notify('Visual published to the site.');
  }

  function deleteBeat(beat) {
    const hasPaidDelivery = orders.some((order) => order.status === 'paid' && (order.items || []).some((item) => item.id === beat.id));
    setBeats((current) => current.filter((item) => item.id !== beat.id));
    setCart((current) => current.filter((id) => id !== beat.id));
    if (beat.audioId && !hasPaidDelivery) {
      removeMedia(beat.audioId);
      const objectUrl = objectUrlsRef.current.get(beat.audioId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrlsRef.current.delete(beat.audioId);
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[beat.audioId];
        return next;
      });
    }
    notify(hasPaidDelivery ? `${beat.title} removed from the store. Delivered artist downloads are preserved.` : `${beat.title} removed from the store.`);
  }

  function deleteVideo(video) {
    setVideos((current) => current.filter((item) => item.id !== video.id));
    if (video.mediaId) {
      removeMedia(video.mediaId);
      const objectUrl = objectUrlsRef.current.get(video.mediaId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrlsRef.current.delete(video.mediaId);
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[video.mediaId];
        return next;
      });
    }
    notify('Visual removed from the site.');
  }

  function confirmPayment(order) {
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: 'paid', deliveredAt: new Date().toISOString() } : item));
    const receipt = {
      id: makeId('mail'),
      to: order.email,
      subject: `Your Kairo Sound order ${order.id} is ready`,
      body: `Payment confirmed. Your ${order.items.length === 1 ? 'beat is' : 'beats are'} ready in your account library.`,
      orderId: order.id,
      sentAt: new Date().toISOString(),
      status: 'demo-queued',
    };
    setEmails((current) => [receipt, ...current]);
    notify(`Payment confirmed. A receipt is ready for ${order.email}.`);
  }

  function cancelOrder(order) {
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: 'cancelled' } : item));
    notify(`Order ${order.id} marked as cancelled.`);
  }

  function submitContact(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = {
      id: makeId('msg'),
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim().toLowerCase(),
      subject: String(data.get('subject') || 'A note from the site').trim(),
      body: String(data.get('message') || '').trim(),
      sentAt: new Date().toISOString(),
      read: false,
    };
    setMessages((current) => [message, ...current]);
    event.currentTarget.reset();
    notify('Your note is in the studio inbox. Email delivery needs a mail-service connection.');
  }

  function openStudio() {
    if (studioSession) {
      setStudioTab('beats');
      setModal({ type: 'studio' });
      return;
    }
    setModal({ type: 'studio-login' });
  }

  function studioLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== DEMO_STUDIO_PASSWORD) {
      notify('That studio passcode did not match.');
      return;
    }
    setStudioSession(true);
    setStudioTab('beats');
    setModal({ type: 'studio' });
    notify('Studio workspace unlocked.');
  }

  function studioLogout() {
    setStudioSession(false);
    setModal(null);
    notify('Studio session locked.');
  }

  function updateSettings(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSettings({
      currency: String(data.get('currency') || 'USD'),
      mobileProvider: String(data.get('mobileProvider') || '').trim(),
      mobileNumber: String(data.get('mobileNumber') || '').trim(),
      bankName: String(data.get('bankName') || '').trim(),
      accountName: String(data.get('accountName') || '').trim(),
      accountNumber: String(data.get('accountNumber') || '').trim(),
      contactEmail: String(data.get('contactEmail') || '').trim(),
    });
    notify('Payment details saved for the checkout preview.');
  }

  function closeModal() {
    setModal(null);
  }

  return (
    <div className="site-shell" id="top">
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="announcement-bar">
        <span><span className="announcement-dot" /> ORIGINAL BEATS. REAL FEELING.</span>
        <span className="announcement-right">INDEPENDENT SOUND / MADE WITH INTENTION</span>
      </div>

      <header className="site-header">
        <Brand />
        <button className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#beats">The beats</a>
          <a onClick={() => setMenuOpen(false)} href="#visuals">Visuals</a>
          <a onClick={() => setMenuOpen(false)} href="#process">How it works</a>
          <a onClick={() => setMenuOpen(false)} href="#contact">Say hello</a>
        </nav>
        <div className="header-actions">
          <button className="header-account" onClick={openAccount}>
            <UserRound size={15} /> <span>{user ? 'My library' : 'Artist sign in'}</span>
          </button>
          <button className="bag-button" onClick={() => setModal({ type: 'bag' })} aria-label={`Open bag, ${activeCartCount} items`}>
            <ShoppingBag size={17} /> <span>Bag</span><b>{activeCartCount}</b>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image-wrap" aria-hidden="true">
            <img src="/studio-hero.png" className="hero-image" alt="" />
          </div>
          <div className="hero-vignette" />
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow hero-eyebrow"><span className="live-dot" /> INDEPENDENT SOUND / WORLDWIDE FEELING</div>
              <h1 id="hero-title">Make room<br />for the <em>feeling.</em></h1>
              <p className="hero-intro">Original beats for artists who have something to say. Find the sound that makes the whole thing click.</p>
              <div className="hero-actions">
                <a href="#beats" className="button button-lime">Find your next beat <ArrowUpRight size={17} /></a>
                <button className="button button-quiet" onClick={() => handlePlay(beats[0])}><CirclePlay size={19} /> Hear the sound</button>
              </div>
              <div className="hero-footnote"><span>01 — ORIGINAL PRODUCTION</span><span>MADE FOR YOUR NEXT RECORD</span></div>
            </div>
            <div className="hero-stamp" aria-hidden="true">
              <div className="stamp-ring"><span>KAIRO SOUND · KAIRO SOUND · </span></div>
              <div className="stamp-center"><AudioLines size={28} /><small>PRESS<br />PLAY</small></div>
            </div>
            <div className="hero-side-note"><span className="hero-side-line" /> A SOUND THAT<br />SAYS SOMETHING</div>
            <div className="hero-bottom">
              <div className="hero-scroll"><span>SCROLL TO EXPLORE</span><ArrowDown size={15} /></div>
              <div className="hero-wave"><WaveMarks count={36} /><span>ONE BEAT CAN CHANGE THE WHOLE STORY</span></div>
              <div className="hero-index">K / 001&nbsp;&nbsp;—&nbsp;&nbsp;SOUND STORE</div>
            </div>
          </div>
          <div className="hero-orbit hero-orbit-a" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-b" aria-hidden="true" />
        </section>

        <section className="intro-band" aria-label="Kairo sound introduction">
          <div className="intro-band-inner">
            <span className="section-index">[ 01 — A NOTE FROM THE STUDIO ]</span>
            <p>Not just a beat.<br /><em>A place to begin.</em></p>
            <span className="intro-side">For the first line, the late-night voice note, and the record you can't stop hearing in your head.</span>
          </div>
          <div className="marquee-track" aria-hidden="true">
            <div className="marquee-content">FIND YOUR FREQUENCY <span>✳</span> MAKE SOMETHING HONEST <span>✳</span> LET THE BEAT BREATHE <span>✳</span> FIND YOUR FREQUENCY <span>✳</span> MAKE SOMETHING HONEST <span>✳</span></div>
          </div>
        </section>

        <section className="beats-section section-pad" id="beats">
          <div className="section-head beats-head">
            <div>
              <div className="eyebrow"><span className="eyebrow-number">02</span> THE BEAT STORE</div>
              <h2>Find the one<br />that <em>feels like you.</em></h2>
            </div>
            <div className="section-head-note"><span className="little-star">✳</span><p>Every sound starts somewhere.<br />This is your somewhere.</p><span>INSTRUMENTALS / LICENSED FOR YOUR NEXT RELEASE</span></div>
          </div>

          <div className="store-toolbar">
            <div className="genre-filters" role="tablist" aria-label="Filter beats by genre">
              {GENRES.map((genre) => (
                <button key={genre} className={selectedGenre === genre ? 'genre-chip selected' : 'genre-chip'} onClick={() => setSelectedGenre(genre)} role="tab" aria-selected={selectedGenre === genre}>{genre}</button>
              ))}
            </div>
            <label className="search-box">
              <Search size={16} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search sounds" aria-label="Search beats" />
              {searchTerm && <button onClick={() => setSearchTerm('')} aria-label="Clear search"><X size={14} /></button>}
            </label>
          </div>

          {displayedBeats.length ? (
            <div className="beat-grid">
              {displayedBeats.map((beat, index) => (
                <article className="beat-card" key={beat.id}>
                  <BeatCover beat={beat} index={index} isPlaying={activeTrackId === beat.id && isPlaying} onPlay={() => handlePlay(beat)} />
                  <div className="beat-meta-top"><span>{beat.genre}</span><span className="beat-bpm">{beat.bpm} BPM <i>·</i> {beat.key}</span></div>
                  <div className="beat-title-row"><div><h3>{beat.title}</h3><p>{beat.mood || 'An original Kairo Sound production.'}</p></div><span className="beat-price">{formatMoney(beat.price, currency)}</span></div>
                  <div className="beat-card-bottom">
                    <span className="license-tag"><ShieldCheck size={13} /> Non-exclusive license</span>
                    <button className={cart.includes(beat.id) ? 'add-beat added' : 'add-beat'} onClick={() => addToCart(beat)} aria-label={`Add ${beat.title} to bag`}>
                      {cart.includes(beat.id) ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-search"><Search size={22} /><p>No beats found for that search.</p><button onClick={() => { setSearchTerm(''); setSelectedGenre('All sounds'); }}>Clear filters <ArrowRight size={15} /></button></div>
          )}
          <div className="store-bottom-note"><span>{String(displayedBeats.length).padStart(2, '0')} SOUNDS IN THE ROOM</span><span>NEED A CUSTOM PRODUCTION? <a href="#contact">LET'S TALK <ArrowUpRight size={12} /></a></span></div>
        </section>

        <section className="visuals-section section-pad" id="visuals">
          <div className="section-head visuals-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-number">03</span> THE VISUAL ROOM</div>
              <h2>More than<br />what you <em>hear.</em></h2>
            </div>
            <p className="visuals-lead">Behind the sounds, inside the sessions, out in the world. Step into the Kairo visual room.</p>
          </div>
          {videos.length ? (
            <div className="video-grid">
              {videos.map((video, index) => <VideoCard key={video.id} video={video} index={index} mediaUrl={video.mediaId ? mediaUrls[video.mediaId] : ''} />)}
            </div>
          ) : (
            <div className="visual-feature">
              <div className="visual-feature-image">
                <img src="/studio-hero.png" alt="A late-night Kairo Sound studio session" />
                <div className="visual-image-shade" />
                <div className="visual-topline"><span>STUDIO NOTES / VOL. 01</span><span>IN THE ROOM</span></div>
                <div className="visual-play-mark"><AudioLines size={26} /><span>ROLLING SOON</span></div>
                <div className="visual-feature-caption"><span>01 — AFTER HOURS</span><span>THE MAKING OF A FEELING</span></div>
              </div>
              <div className="visual-feature-copy">
                <span className="eyebrow">BEHIND THE SOUND</span>
                <h3>Good things happen<br />after the <em>red light.</em></h3>
                <p>Studio films and little moments from the process are on the way. Check back when the next session makes it out of the room.</p>
                <button className="text-link" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Get the next update <ArrowUpRight size={15} /></button>
              </div>
            </div>
          )}
          <div className="visuals-footer"><span>VISUALS, PROCESS, LITTLE ACCIDENTS.</span><span>NEW STUDIO FILMS ADDED HERE <ArrowDownRight size={14} /></span></div>
        </section>

        <section className="process-section section-pad" id="process">
          <div className="process-topline"><div className="eyebrow"><span className="eyebrow-number">04</span> SIMPLE BY DESIGN</div><span className="process-aside">A CLEAR PATH FROM FIRST LISTEN TO FIRST TAKE.</span></div>
          <div className="process-heading"><h2>Your next record<br />starts <em>right here.</em></h2><div className="process-heading-mark"><AudioLines size={25} /><span>LESS SCROLLING.<br />MORE MAKING.</span></div></div>
          <div className="process-grid">
            <article className="process-card"><span className="process-number">01 / LISTEN</span><div className="process-icon"><Headphones size={23} /></div><h3>Find your frequency.</h3><p>Preview the instrumentals, follow the feeling, and add the beat that sounds like your next idea.</p><span className="process-line" /></article>
            <article className="process-card"><span className="process-number">02 / CHECK OUT</span><div className="process-icon"><Banknote size={23} /></div><h3>Choose how to pay.</h3><p>Place your order with mobile money or a bank transfer. Your license and files are tied to your artist account.</p><span className="process-line" /></article>
            <article className="process-card"><span className="process-number">03 / MAKE IT YOURS</span><div className="process-icon"><Sparkles size={23} /></div><h3>Get back to creating.</h3><p>After payment is confirmed, download your beat from your library. A receipt is prepared for your email.</p><span className="process-line" /></article>
          </div>
          <div className="license-note"><LockKeyhole size={14} /><span>Every checkout is a non-exclusive beat lease. You'll see the exact payment and delivery steps before placing an order.</span><a href="#beats">Browse the beats <ArrowRight size={14} /></a></div>
        </section>

        <section className="contact-section section-pad" id="contact">
          <div className="contact-left">
            <div className="eyebrow"><span className="eyebrow-number">05</span> START A CONVERSATION</div>
            <h2>Got a feeling<br />you want to <em>make real?</em></h2>
            <p>Custom production, a question about a license, or just an idea you can't leave alone — the studio inbox is open.</p>
            <div className="contact-signoff"><span className="contact-signoff-star">✳</span><span>THE BEST THINGS<br />START WITH A NOTE.</span></div>
          </div>
          <form className="contact-form" onSubmit={submitContact}>
            <div className="contact-form-top"><span>01 / YOUR NOTE</span><span>USUALLY REPLIED TO SOON</span></div>
            <div className="form-two-col">
              <Field label="Your name" name="name" placeholder="Name" autoComplete="name" required />
              <Field label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </div>
            <Field label="What's on your mind?" name="subject" placeholder="Custom beat, license question, something else…" required />
            <label className="field-wrap"><span className="field-label">A little more detail</span><textarea className="field-input field-textarea" name="message" placeholder="Tell me what you're working on…" rows="4" required /></label>
            <div className="contact-submit-row"><span><Mail size={14} /> Message lands in the studio inbox</span><button className="button button-lime" type="submit">Send your note <Send size={15} /></button></div>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main"><div className="footer-brand"><Brand light /><p>Original sound for whatever<br />you've got to say.</p></div><div className="footer-signoff"><WaveMarks count={32} quiet /><span>MAKE SOMETHING<br /><em>THAT FEELS LIKE YOU.</em></span></div><div className="footer-links"><a href="#beats">The beats <ArrowUpRight size={12} /></a><a href="#visuals">The visual room <ArrowUpRight size={12} /></a><button onClick={openAccount}>Artist library <ArrowUpRight size={12} /></button><button onClick={openStudio}>Studio access <ArrowUpRight size={12} /></button></div></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} KAIRO SOUND — INDEPENDENT BY NATURE.</span><span>PAYMENT & EMAIL ARE IN PREVIEW MODE <span className="footer-dot">●</span></span><a href="#top">BACK TO TOP ↑</a></div>
      </footer>

      {currentTrack && (
        <div className="audio-dock" aria-label="Beat preview player">
          <div className="dock-track"><BeatThumb beat={currentTrack} /><div><span className="dock-kicker">NOW PREVIEWING</span><strong>{currentTrack.title}</strong><small>{currentTrack.genre} · {currentTrack.bpm} BPM</small></div></div>
          <div className="dock-controls"><button className="dock-play" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? 'Pause preview' : 'Play preview'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><span className="dock-time">{formatTime(currentTime)}</span><input className="progress-range" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` }} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} aria-label="Preview progress" /><span className="dock-time">{formatTime(duration)}</span></div>
          <div className="dock-actions"><span className="dock-format"><Volume2 size={14} /> PREVIEW</span><button className="dock-close" onClick={stopPlayer} aria-label="Close player"><X size={17} /></button></div>
        </div>
      )}

      {modal?.type === 'bag' && <BagModal items={cartItems} currency={currency} onClose={closeModal} onRemove={removeFromCart} onCheckout={beginCheckout} onBrowse={() => { closeModal(); document.getElementById('beats')?.scrollIntoView({ behavior: 'smooth' }); }} />}
      {modal?.type === 'account' && <AccountModal mode={accountMode} setMode={setAccountMode} user={user} orders={accountOrders} currency={currency} mediaUrls={mediaUrls} onAuth={handleAuthSubmit} onDownload={downloadItem} onLogout={logout} onClose={closeModal} />}
      {modal?.type === 'checkout' && <CheckoutModal items={cartItems} total={cartTotal} currency={currency} user={user} settings={settings} onClose={closeModal} onSubmit={submitOrder} />}
      {modal?.type === 'order-placed' && <OrderPlacedModal order={modal.order} settings={settings} onClose={closeModal} onGoLibrary={() => { setModal({ type: 'account' }); }} />}
      {modal?.type === 'studio-login' && <StudioLoginModal onClose={closeModal} onSubmit={studioLogin} />}
      {modal?.type === 'studio' && <StudioModal
        tab={studioTab}
        setTab={setStudioTab}
        beats={beats}
        videos={videos}
        orders={orders}
        messages={messages}
        emails={emails}
        settings={settings}
        currency={currency}
        mediaUrls={mediaUrls}
        onClose={closeModal}
        onLogout={studioLogout}
        onAddBeat={addBeat}
        onAddVideo={addVideo}
        onDeleteBeat={deleteBeat}
        onDeleteVideo={deleteVideo}
        onConfirmPayment={confirmPayment}
        onCancelOrder={cancelOrder}
        onUpdateSettings={updateSettings}
        onMarkRead={(id) => setMessages((current) => current.map((message) => message.id === id ? { ...message, read: true } : message))}
      />}
      {modal?.type === 'video-info' && <SimpleModal title="The visual room" onClose={closeModal}><p className="modal-copy">Studio films are coming soon. Check back after the next session.</p></SimpleModal>}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(password)));
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function BeatThumb({ beat }) {
  return <div className="beat-thumb" style={{ '--cover-a': beat.colors?.[0] || '#a5b97a', '--cover-b': beat.colors?.[1] || '#395540' }}><AudioLines size={17} /></div>;
}

function ModalShell({ children, onClose, className = '', label = 'Dialog' }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal-card ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        <button className="modal-x" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        {children}
      </section>
    </div>
  );
}

function BagModal({ items, currency, onClose, onRemove, onCheckout, onBrowse }) {
  return (
    <ModalShell onClose={onClose} className="bag-modal" label="Shopping bag">
      <div className="modal-eyebrow"><ShoppingBag size={15} /> THE BEAT BAG</div>
      <h2>Your next<br /><em>starting point.</em></h2>
      {items.length ? (
        <>
          <div className="bag-list">
            {items.map((item) => <div className="bag-item" key={item.id}><BeatThumb beat={item} /><div className="bag-item-info"><strong>{item.title}</strong><span>{item.genre} · {item.bpm} BPM</span></div><b>{formatMoney(item.price, currency)}</b><button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}><X size={15} /></button></div>)}
          </div>
          <div className="bag-total"><span>SUBTOTAL</span><strong>{formatMoney(items.reduce((sum, item) => sum + Number(item.price || 0), 0), currency)}</strong></div>
          <p className="bag-note">A non-exclusive lease is included with every beat. Payment and delivery details are confirmed at checkout.</p>
          <button className="button button-lime button-full" onClick={onCheckout}>Continue to checkout <ArrowRight size={16} /></button>
        </>
      ) : (
        <div className="empty-bag"><div className="empty-bag-icon"><ShoppingBag size={25} /></div><h3>Nothing in here yet.</h3><p>Your next favorite might be one listen away.</p><button className="button button-lime" onClick={onBrowse}>Browse the beats <ArrowRight size={16} /></button></div>
      )}
      <button className="modal-text-button" onClick={onClose}>Keep looking around <ArrowLeft size={14} /></button>
    </ModalShell>
  );
}

function AccountModal({ mode, setMode, user, orders, currency, mediaUrls, onAuth, onDownload, onLogout, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await onAuth(mode, {
        name: String(data.get('name') || ''),
        email: String(data.get('email') || ''),
        password: String(data.get('password') || ''),
      });
    } catch (exception) {
      setError(exception.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} className={`account-modal ${user ? 'account-library-modal' : ''}`} label={user ? 'Artist library' : 'Artist account'}>
      {user ? (
        <>
          <div className="modal-eyebrow"><UserRound size={15} /> YOUR ARTIST LIBRARY</div>
          <div className="account-welcome"><div><h2>Hey, {user.name.split(' ')[0]}.</h2><p>{user.email}</p></div><span className="account-avatar">{user.name.charAt(0).toUpperCase()}</span></div>
          <div className="library-section-title"><span>YOUR ORDERS</span><span>{orders.length.toString().padStart(2, '0')} TOTAL</span></div>
          {orders.length ? (
            <div className="order-library-list">
              {orders.map((order) => (
                <div className="library-order" key={order.id}>
                  <div className="library-order-head"><div><strong>{order.items.map((item) => item.title).join(', ')}</strong><span>{niceDate(order.placedAt)} · {order.id.slice(0, 12).toUpperCase()}</span></div><OrderStatus status={order.status} /></div>
                  <div className="library-order-bottom"><span>{formatMoney(order.amount, order.currency || currency)} · {order.paymentMethod === 'mobile' ? 'Mobile money' : 'Bank transfer'}</span>{order.status === 'paid' ? <div className="library-downloads">{order.items.map((item) => <button className="download-link" key={item.id} onClick={() => onDownload(item)}><Download size={13} /> {item.title}</button>)}</div> : <span className="pending-copy">Files unlock after payment is confirmed.</span>}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="library-empty"><div><FileAudio size={22} /></div><strong>Your next track starts here.</strong><p>Paid orders and download links will show up in this library.</p><button className="text-link" onClick={onClose}>Go find a beat <ArrowRight size={14} /></button></div>
          )}
          <div className="account-modal-foot"><span><Mail size={13} /> Receipts are prepared for your email after payment approval.</span><button className="modal-text-button" onClick={onLogout}>Sign out <ArrowRight size={13} /></button></div>
        </>
      ) : (
        <>
          <div className="modal-eyebrow"><AudioLines size={15} /> KAIRO SOUND / ARTIST ACCESS</div>
          <h2>{mode === 'signup' ? 'Make room.' : 'Good to have you back.'}<br /><em>{mode === 'signup' ? 'Make it yours.' : 'Let’s get to it.'}</em></h2>
          <p className="modal-intro">Keep your orders, licensed beats, and download links together in one place.</p>
          <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && <Field label="Your name" name="name" placeholder="Name for your artist account" autoComplete="name" required />}
            <Field label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <label className="field-wrap"><span className="field-label">Password</span><div className="password-field"><input className="field-input" name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="6" required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'HIDE' : 'SHOW'}</button></div></label>
            {error && <div className="form-error">{error}</div>}
            <button className="button button-lime button-full" type="submit" disabled={busy}>{busy ? 'One second…' : mode === 'signup' ? 'Create your account' : 'Sign in'} <ArrowRight size={16} /></button>
          </form>
          <p className="auth-footnote"><LockKeyhole size={13} /> Your account keeps your licenses and delivery links in one place.</p>
        </>
      )}
    </ModalShell>
  );
}

function CheckoutModal({ items, total, currency, user, settings, onClose, onSubmit }) {
  const [method, setMethod] = useState('mobile');
  const [provider, setProvider] = useState(settings.mobileProvider || 'Mobile money');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const contact = String(data.get('contact') || '').trim();
    const reference = String(data.get('reference') || '').trim();
    if (method === 'mobile' && !contact) {
      setError('Add the mobile money number used for payment.');
      return;
    }
    if (method === 'bank' && !reference) {
      setError('Add the bank transfer reference so the studio can match your payment.');
      return;
    }
    onSubmit({ method, provider, contact, reference });
  }

  return (
    <ModalShell onClose={onClose} className="checkout-modal" label="Checkout">
      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="modal-eyebrow"><LockKeyhole size={15} /> SECURE CHECKOUT / PREVIEW</div>
          <h2>Almost<br /><em>in the studio.</em></h2>
          <div className="checkout-customer"><span className="customer-avatar">{user?.name?.charAt(0).toUpperCase() || 'A'}</span><div><small>ARTIST ACCOUNT</small><strong>{user?.name || 'Artist'}</strong><span>{user?.email}</span></div><ShieldCheck size={18} /></div>
          <form className="checkout-form" onSubmit={submit}>
            <div className="checkout-label-row"><span>CHOOSE A PAYMENT METHOD</span><span>01 / 02</span></div>
            <div className="payment-methods">
              <button type="button" onClick={() => setMethod('mobile')} className={method === 'mobile' ? 'payment-option selected' : 'payment-option'}><span className="payment-icon"><Volume2 size={17} /></span><span><b>Mobile money</b><small>MoMo, M-Pesa & more</small></span><i>{method === 'mobile' && <Check size={12} />}</i></button>
              <button type="button" onClick={() => setMethod('bank')} className={method === 'bank' ? 'payment-option selected' : 'payment-option'}><span className="payment-icon"><Banknote size={17} /></span><span><b>Bank transfer</b><small>Pay directly from your bank</small></span><i>{method === 'bank' && <Check size={12} />}</i></button>
            </div>
            {method === 'mobile' ? (
              <>
                <label className="field-wrap"><span className="field-label">Mobile money network</span><select className="field-input" value={provider} onChange={(event) => setProvider(event.target.value)}><option>Mobile money</option><option>MTN MoMo</option><option>M-Pesa</option><option>Airtel Money</option><option>Other provider</option></select><ChevronDown className="select-chevron" size={15} /></label>
                <Field label="Payment phone number" name="contact" type="tel" placeholder="Include your country code" autoComplete="tel" required />
              </>
            ) : (
              <>
                <div className="transfer-details">
                  <span className="transfer-label">TRANSFER TO / PRODUCER PAYMENT DETAILS</span>
                  {settings.bankName || settings.accountNumber ? <><strong>{settings.bankName || 'Bank account'}</strong><span>{settings.accountName || 'Account holder to be confirmed'}</span><b>{settings.accountNumber || 'Account number not set'}</b></> : <p>The studio hasn't added bank details yet. Place a request and confirm the destination with the producer before sending money.</p>}
                </div>
                <Field label="Bank transfer reference" name="reference" placeholder="Your transaction reference" required />
              </>
            )}
            {method === 'mobile' && settings.mobileNumber && <div className="mobile-destination"><span>PAYMENT DESTINATION</span><strong>{settings.mobileProvider || provider}</strong><b>{settings.mobileNumber}</b></div>}
            {method === 'mobile' && !settings.mobileNumber && <div className="payment-not-set"><Settings2 size={15} /><span>Payment destination is not set yet. Your order will be held for manual follow-up.</span></div>}
            {error && <div className="form-error">{error}</div>}
            <p className="checkout-terms">By placing this order, you request a non-exclusive beat lease. The producer reviews transfers manually before downloads are released.</p>
            <button className="button button-lime button-full" type="submit">Place order <ArrowRight size={16} /></button>
          </form>
        </div>
        <aside className="checkout-summary">
          <div className="summary-top"><span>YOUR BEATS</span><span>{items.length.toString().padStart(2, '0')}</span></div>
          {items.map((item) => <div className="summary-beat" key={item.id}><BeatThumb beat={item} /><div><strong>{item.title}</strong><span>{item.genre} · Lease</span></div><b>{formatMoney(item.price, currency)}</b></div>)}
          <div className="summary-total"><span>TOTAL</span><strong>{formatMoney(total, currency)}</strong></div>
          <div className="summary-note"><ShieldCheck size={14} /><span>Your files unlock in your library after the producer confirms payment.</span></div>
          <div className="summary-support"><Mail size={14} /><span>Receipt prepared for<br /><b>{user?.email}</b></span></div>
          <div className="summary-demo"><span className="demo-pill">PREVIEW MODE</span><p>No payment is charged and no email is sent by this demo. Studio approval completes the local order flow.</p></div>
        </aside>
      </div>
    </ModalShell>
  );
}

function OrderPlacedModal({ order, settings, onClose, onGoLibrary }) {
  const payTo = order.paymentMethod === 'mobile' ? settings.mobileNumber : settings.accountNumber;
  return (
    <ModalShell onClose={onClose} className="order-placed-modal" label="Order received">
      <div className="order-success-mark"><Check size={27} /></div>
      <div className="modal-eyebrow">ORDER RECEIVED / {order.id.slice(0, 12).toUpperCase()}</div>
      <h2>Good things<br /><em>are in motion.</em></h2>
      <p className="modal-intro">Your request for {order.items.map((item) => item.title).join(', ')} is with the studio. Your order is currently waiting for payment confirmation.</p>
      <div className="order-instructions">
        <div className="order-instruction-head"><span>{order.paymentMethod === 'mobile' ? 'MOBILE MONEY' : 'BANK TRANSFER'}</span><span>{formatMoney(order.amount, order.currency)}</span></div>
        {payTo ? <p>Use your selected payment method to transfer to <strong>{payTo}</strong>. Share the transaction details with the producer if needed.</p> : <p>Payment destination details are not set in the studio yet. Please contact the producer to confirm where to send payment before transferring.</p>}
        {order.reference && <div className="reference-line"><span>YOUR REFERENCE</span><b>{order.reference}</b></div>}
        <div className="pending-banner"><Clock3 size={15} /><span>Pending review · downloads unlock after the producer confirms payment.</span></div>
      </div>
      <div className="order-email-note"><Mail size={15} /><span>A receipt and download email will be prepared after approval. This preview doesn't send real email.</span></div>
      <div className="order-modal-actions"><button className="button button-lime" onClick={onGoLibrary}>Go to my library <ArrowRight size={16} /></button><button className="modal-text-button" onClick={onClose}>Back to the store <ArrowLeft size={14} /></button></div>
    </ModalShell>
  );
}

function StudioLoginModal({ onClose, onSubmit }) {
  return (
    <ModalShell onClose={onClose} className="studio-login-modal" label="Studio access">
      <div className="studio-login-symbol"><Settings2 size={22} /></div>
      <div className="modal-eyebrow">KAIRO SOUND / PRIVATE ROOM</div>
      <h2>Studio<br /><em>access.</em></h2>
      <p className="modal-intro">Manage the beat store, video room, payment details, and incoming orders.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <label className="field-wrap"><span className="field-label">Studio passcode</span><input className="field-input" type="password" name="password" placeholder="Enter passcode" autoComplete="current-password" required /></label>
        <button className="button button-lime button-full" type="submit">Enter the studio <ArrowRight size={16} /></button>
      </form>
      <p className="studio-demo-hint">Preview passcode: <b>soundcheck</b>. Replace client-side demo access with server-side admin authentication before launch.</p>
    </ModalShell>
  );
}

function VideoCard({ video, index, mediaUrl }) {
  const embedUrl = videoEmbedUrl(video.url);
  const directVideo = video.url && !embedUrl;
  return (
    <article className="video-card">
      <div className="video-frame">
        {mediaUrl ? <video src={mediaUrl} controls preload="metadata" poster="/studio-hero.png" /> : embedUrl ? <iframe src={embedUrl} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : directVideo ? <video src={video.url} controls preload="metadata" poster="/studio-hero.png" /> : <div className="video-unavailable"><Video size={22} /><span>VISUAL FILE STORED IN STUDIO</span></div>}
        <span className="video-index">VISUAL / {String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="video-card-meta"><div><span className="eyebrow">KAIRO SOUND / FIELD NOTES</span><h3>{video.title}</h3><p>{video.caption || 'A moment from the studio.'}</p></div><ArrowUpRight size={19} /></div>
    </article>
  );
}

function OrderStatus({ status }) {
  const label = status === 'paid' ? 'Delivered' : status === 'cancelled' ? 'Cancelled' : 'Pending';
  return <span className={`order-status status-${status}`}>{label}</span>;
}

function StudioModal({ tab, setTab, beats, videos, orders, messages, emails, settings, currency, mediaUrls, onClose, onLogout, onAddBeat, onAddVideo, onDeleteBeat, onDeleteVideo, onConfirmPayment, onCancelOrder, onUpdateSettings, onMarkRead }) {
  const pendingCount = orders.filter((order) => order.status === 'pending').length;
  const unreadCount = messages.filter((message) => !message.read).length;
  const paidTotal = orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.amount, 0);
  const tabs = [
    { id: 'beats', label: 'Beats', icon: Music2, count: beats.length },
    { id: 'videos', label: 'Visuals', icon: Video, count: videos.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: pendingCount },
    { id: 'inbox', label: 'Inbox', icon: Mail, count: unreadCount },
    { id: 'payments', label: 'Payments', icon: Settings2, count: null },
  ];

  return (
    <div className="studio-backdrop">
      <div className="studio-window" role="dialog" aria-modal="true" aria-label="Kairo Sound studio dashboard">
        <aside className="studio-sidebar">
          <div className="studio-brand-row"><Brand light /><span className="studio-live-pill"><i /> LIVE PREVIEW</span></div>
          <div className="studio-sidebar-label">WORKSPACE</div>
          <nav className="studio-nav" aria-label="Studio pages">
            {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} className={tab === id ? 'studio-nav-item active' : 'studio-nav-item'} onClick={() => setTab(id)}><Icon size={17} /><span>{label}</span>{count > 0 && <b>{count}</b>}</button>)}
          </nav>
          <div className="studio-sidebar-bottom"><div className="studio-user-card"><span className="studio-user-avatar">K</span><div><b>Kairo Studio</b><small>PRODUCER ACCOUNT</small></div><span className="studio-user-dot" /></div><button onClick={onLogout} className="studio-lock-button"><LockKeyhole size={14} /> Lock studio</button></div>
        </aside>
        <main className="studio-content">
          <header className="studio-topbar"><div><span className="studio-topline">KAIRO SOUND / STUDIO CONSOLE</span><span className="studio-topdate">{new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date())}</span></div><button className="studio-close" onClick={onClose}><span>Close console</span><X size={17} /></button></header>
          {tab === 'beats' && <StudioBeats beats={beats} currency={currency} onAddBeat={onAddBeat} onDeleteBeat={onDeleteBeat} />}
          {tab === 'videos' && <StudioVideos videos={videos} mediaUrls={mediaUrls} onAddVideo={onAddVideo} onDeleteVideo={onDeleteVideo} />}
          {tab === 'orders' && <StudioOrders orders={orders} onConfirmPayment={onConfirmPayment} onCancelOrder={onCancelOrder} />}
          {tab === 'inbox' && <StudioInbox messages={messages} emails={emails} onMarkRead={onMarkRead} />}
          {tab === 'payments' && <StudioPayments settings={settings} onUpdateSettings={onUpdateSettings} />}
          <div className="studio-footer-note"><span><ShieldCheck size={13} /> LOCAL PREVIEW WORKSPACE</span><span>{beats.length} BEATS · {orders.length} ORDERS · {messages.length} NOTES</span></div>
        </main>
      </div>
    </div>
  );
}

function StudioPageHead({ eyebrow, title, subtitle, aside }) {
  return <div className="studio-page-head"><div><span className="studio-page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{aside && <div className="studio-head-aside">{aside}</div>}</div>;
}

function StudioBeats({ beats, currency, onAddBeat, onDeleteBeat }) {
  const [uploadOpen, setUploadOpen] = useState(true);
  return (
    <div className="studio-page">
      <StudioPageHead eyebrow="01 / BEAT CATALOGUE" title="The beat store." subtitle="Upload new instrumentals and keep the storefront sounding fresh." aside={<div className="studio-stat"><strong>{beats.length.toString().padStart(2, '0')}</strong><span>LIVE BEATS</span></div>} />
      <div className="studio-content-grid">
        <section className="studio-panel studio-upload-panel">
          <div className="studio-panel-head"><div><span className="studio-panel-kicker">NEW RELEASE</span><h2>Add a beat</h2></div><button className="panel-collapse" onClick={() => setUploadOpen((open) => !open)}>{uploadOpen ? 'MINIMIZE' : 'OPEN'} <ChevronDown className={uploadOpen ? 'rotate-up' : ''} size={14} /></button></div>
          {uploadOpen && <form className="studio-form" onSubmit={onAddBeat}>
            <Field label="Track title" name="title" placeholder="e.g. Sunday Service" required />
            <div className="studio-two-col"><label className="field-wrap"><span className="field-label">Genre</span><select className="field-input" name="genre" defaultValue="Afro fusion"><option>Afro fusion</option><option>Amapiano</option><option>R&B</option><option>Trap soul</option><option>Hip-hop</option><option>Other</option></select><ChevronDown className="select-chevron" size={15} /></label><Field label="Tempo (BPM)" name="bpm" type="number" min="40" max="220" placeholder="104" required /></div>
            <div className="studio-two-col"><Field label="Key" name="key" placeholder="F minor" required /><Field label={`Price (${currency})`} name="price" type="number" min="1" placeholder="29" required /></div>
            <label className="upload-drop"><input type="file" name="audioFile" accept="audio/*,.wav,.mp3,.aiff,.flac" required /><span className="upload-icon"><FileAudio size={20} /></span><span className="upload-drop-copy"><b>Choose your audio file</b><small>WAV, MP3, AIFF · up to 45 MB</small></span><Upload size={16} /></label>
            <button className="studio-action-button" type="submit"><Plus size={16} /> Publish beat</button>
          </form>}
          <div className="upload-local-note"><LockKeyhole size={13} /><span>Files stay in this browser's local preview storage. Connect object storage before launch.</span></div>
        </section>
        <section className="studio-panel studio-inventory-panel">
          <div className="studio-panel-head"><div><span className="studio-panel-kicker">ON THE STOREFRONT</span><h2>Beat inventory <span className="inventory-count">{beats.length}</span></h2></div><AudioLines size={20} className="panel-heading-icon" /></div>
          {beats.length ? <div className="inventory-list">{beats.map((beat, index) => <div className="inventory-row" key={beat.id}><BeatThumb beat={beat} /><span className="inventory-order">{String(index + 1).padStart(2, '0')}</span><div className="inventory-info"><strong>{beat.title}</strong><span>{beat.genre} · {beat.bpm} BPM · {beat.key}</span></div><span className="inventory-price">{formatMoney(beat.price, currency)}</span><button className="icon-danger" onClick={() => onDeleteBeat(beat)} aria-label={`Delete ${beat.title}`}><Trash2 size={15} /></button></div>)}</div> : <div className="studio-empty"><Music2 size={22} /><p>Your beat inventory is empty.</p></div>}
        </section>
      </div>
    </div>
  );
}

function StudioVideos({ videos, mediaUrls, onAddVideo, onDeleteVideo }) {
  return (
    <div className="studio-page">
      <StudioPageHead eyebrow="02 / VISUAL ROOM" title="The moving image." subtitle="Publish a session film, music video, or behind-the-scenes clip." aside={<div className="studio-stat"><strong>{videos.length.toString().padStart(2, '0')}</strong><span>PUBLISHED</span></div>} />
      <div className="studio-content-grid studio-video-grid">
        <section className="studio-panel studio-upload-panel">
          <div className="studio-panel-head"><div><span className="studio-panel-kicker">PUBLISH A VISUAL</span><h2>Add a video</h2></div><Video size={21} className="panel-heading-icon" /></div>
          <form className="studio-form" onSubmit={onAddVideo}>
            <Field label="Video title" name="title" placeholder="e.g. After Hours — studio session" required />
            <Field label="Short description" name="caption" placeholder="A little context for the clip" />
            <label className="upload-drop upload-drop-video"><input type="file" name="videoFile" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm" /><span className="upload-icon"><Video size={20} /></span><span className="upload-drop-copy"><b>Upload a video file</b><small>MP4, MOV, WebM · up to 140 MB</small></span><Upload size={16} /></label>
            <div className="or-divider"><span>OR PUBLISH A LINK</span></div>
            <Field label="YouTube or direct video URL" name="videoUrl" type="url" placeholder="https://…" />
            <button className="studio-action-button" type="submit"><Plus size={16} /> Publish visual</button>
          </form>
          <div className="upload-local-note"><LockKeyhole size={13} /><span>Uploaded video files are stored locally in this browser preview.</span></div>
        </section>
        <section className="studio-panel studio-inventory-panel">
          <div className="studio-panel-head"><div><span className="studio-panel-kicker">PUBLIC VISUALS</span><h2>Published clips <span className="inventory-count">{videos.length}</span></h2></div></div>
          {videos.length ? <div className="studio-video-list">{videos.map((video) => <div className="studio-video-item" key={video.id}><div className="studio-video-thumb">{video.mediaId && mediaUrls[video.mediaId] ? <video src={mediaUrls[video.mediaId]} /> : <img src="/studio-hero.png" alt="" />}<Video size={17} /></div><div className="studio-video-info"><strong>{video.title}</strong><span>{video.fileName || video.url || 'Kairo Sound visual'}</span></div><button className="icon-danger" onClick={() => onDeleteVideo(video)} aria-label={`Delete ${video.title}`}><Trash2 size={15} /></button></div>)}</div> : <div className="studio-empty"><Video size={22} /><p>No visuals published yet.</p></div>}
        </section>
      </div>
    </div>
  );
}

function StudioOrders({ orders, onConfirmPayment, onCancelOrder }) {
  return (
    <div className="studio-page">
      <StudioPageHead eyebrow="03 / ORDER DESK" title="Artist orders." subtitle="Review mobile money and bank transfer requests. Confirm manually to unlock downloads." aside={<div className="studio-stat"><strong>{orders.filter((order) => order.status === 'pending').length.toString().padStart(2, '0')}</strong><span>NEED REVIEW</span></div>} />
      {orders.length ? <div className="studio-orders-list">{orders.map((order) => <article className="studio-order-card" key={order.id}><div className="studio-order-top"><div><span className="studio-order-id">{order.id.slice(0, 12).toUpperCase()} / {niceDate(order.placedAt)}</span><h2>{order.name}</h2><a href={`mailto:${order.email}`}><Mail size={13} /> {order.email}</a></div><OrderStatus status={order.status} /></div><div className="studio-order-body"><div className="studio-order-items"><span className="studio-table-label">BEATS IN ORDER</span>{order.items.map((item) => <span className="studio-order-track" key={item.id}><Music2 size={13} /> {item.title}<b>{formatMoney(item.price, order.currency || 'USD')}</b></span>)}</div><div className="studio-payment-info"><span className="studio-table-label">PAYMENT DETAILS</span><b>{order.paymentMethod === 'mobile' ? (order.paymentProvider || 'Mobile money') : 'Bank transfer'}</b><span>{order.paymentContact || order.reference || 'Awaiting payment details'}</span>{order.reference && order.paymentContact && <small>Ref: {order.reference}</small>}</div><div className="studio-order-total"><span className="studio-table-label">ORDER TOTAL</span><strong>{formatMoney(order.amount, order.currency || 'USD')}</strong></div></div><div className="studio-order-actions">{order.status === 'pending' ? <><span className="manual-review-note"><Clock3 size={14} /> Check the transfer before confirming.</span><button className="studio-confirm-button" onClick={() => onConfirmPayment(order)}><Check size={14} /> Confirm payment & deliver</button><button className="studio-cancel-order" onClick={() => onCancelOrder(order)}>Cancel</button></> : <span className="delivered-note"><ShieldCheck size={14} /> {order.status === 'paid' ? `Delivered ${niceDate(order.deliveredAt)} · receipt prepared for ${order.email}` : 'Order cancelled'}</span>}</div></article>)}</div> : <div className="studio-empty large-empty"><ShoppingBag size={25} /><h3>It's quiet in here.</h3><p>New orders will appear here after an artist checks out.</p></div>}
      <div className="studio-email-disclaimer"><Mail size={14} /><span>Confirmation creates a local receipt record. Real email delivery and mobile money verification need provider integrations.</span></div>
    </div>
  );
}

function StudioInbox({ messages, emails, onMarkRead }) {
  return (
    <div className="studio-page">
      <StudioPageHead eyebrow="04 / STUDIO INBOX" title="Notes from artists." subtitle="Questions and custom-production requests submitted through the site." aside={<div className="studio-stat"><strong>{messages.filter((message) => !message.read).length.toString().padStart(2, '0')}</strong><span>UNREAD NOTES</span></div>} />
      <div className="inbox-email-note"><Mail size={15} /><p><b>Email note:</b> messages are saved to this local inbox in preview mode. Connect an email provider to receive real notifications.</p></div>
      <div className="studio-inbox-list">
        {messages.length ? messages.map((message) => <article key={message.id} className={`studio-message-card ${message.read ? 'message-read' : ''}`}><div className="message-avatar">{message.name.charAt(0).toUpperCase()}</div><div className="message-main"><div className="message-heading"><div><span className="message-subject">{message.subject}</span><strong>{message.name}</strong><a href={`mailto:${message.email}`}>{message.email}</a></div><span className="message-date">{niceDate(message.sentAt)}</span></div><p>{message.body}</p>{!message.read && <button className="mark-read-button" onClick={() => onMarkRead(message.id)}><Check size={13} /> Mark as read</button>}</div></article>) : <div className="studio-empty large-empty"><Mail size={25} /><h3>No notes yet.</h3><p>Artist messages will land here.</p></div>}
      </div>
      <div className="email-log-section"><div className="email-log-heading"><div><span className="studio-panel-kicker">LOCAL DELIVERY LOG</span><h2>Prepared emails <span className="inventory-count">{emails.length}</span></h2></div><span className="demo-pill">NOT SENT</span></div>{emails.length ? <div className="email-log-list">{emails.map((email) => <div className="email-log-row" key={email.id}><span className="email-log-icon"><Mail size={15} /></span><div><strong>{email.subject}</strong><span>To: {email.to} · {niceDate(email.sentAt)}</span></div><span className="email-log-status">DEMO QUEUED</span></div>)}</div> : <p className="email-log-empty">Receipt emails will be recorded here when an order is approved.</p>}</div>
    </div>
  );
}

function StudioPayments({ settings, onUpdateSettings }) {
  return (
    <div className="studio-page">
      <StudioPageHead eyebrow="05 / PAYOUT SETUP" title="Where artists pay." subtitle="Add your payment destinations. These details appear at checkout. Always verify a transfer before delivering files." aside={<div className="studio-stat studio-stat-outline"><Settings2 size={18} /><span>PAYMENT SETUP</span></div>} />
      <div className="payout-warning"><ShieldCheck size={17} /><p><b>Manual review is on.</b> Checkout does not charge a wallet or bank account. Artists place a request, you verify payment outside the site, then confirm it in Orders.</p></div>
      <form className="studio-panel payment-settings-form" onSubmit={onUpdateSettings}>
        <div className="payment-setting-section"><div className="payment-setting-title"><span className="payment-setting-icon"><Volume2 size={17} /></span><div><h2>Mobile money</h2><p>Wallet details shown in the artist checkout.</p></div></div><div className="studio-two-col"><Field label="Network / provider" name="mobileProvider" placeholder="e.g. MTN MoMo, M-Pesa" defaultValue={settings.mobileProvider} /><Field label="Wallet number" name="mobileNumber" placeholder="Include country code" defaultValue={settings.mobileNumber} /></div></div>
        <div className="payment-setting-section"><div className="payment-setting-title"><span className="payment-setting-icon"><Banknote size={17} /></span><div><h2>Bank transfer</h2><p>Bank account details shown in the artist checkout.</p></div></div><div className="studio-two-col"><Field label="Bank name" name="bankName" placeholder="Your bank" defaultValue={settings.bankName} /><Field label="Account name" name="accountName" placeholder="Name on the account" defaultValue={settings.accountName} /></div><Field label="Account number / IBAN" name="accountNumber" placeholder="Account number" defaultValue={settings.accountNumber} /></div>
        <div className="payment-setting-section payment-setting-last"><div className="payment-setting-title"><span className="payment-setting-icon"><Settings2 size={17} /></span><div><h2>Store preferences</h2><p>Currency and reply-to address for the preview store.</p></div></div><div className="studio-two-col"><label className="field-wrap"><span className="field-label">Store currency</span><select className="field-input" name="currency" defaultValue={settings.currency || 'USD'}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select><ChevronDown className="select-chevron" size={15} /></label><Field label="Studio contact email" name="contactEmail" type="email" placeholder="studio@example.com" defaultValue={settings.contactEmail} /></div></div>
        <div className="payment-settings-footer"><span><LockKeyhole size={13} /> Stored only in this browser preview.</span><button className="studio-action-button" type="submit">Save payment details <Check size={15} /></button></div>
      </form>
      <div className="payout-email-hint"><Mail size={15} /><div><b>For real payments and email delivery</b><span>Connect a payment gateway that supports mobile money and bank settlement, plus a transactional email service. Keep verification keys on a server, never in this browser app.</span></div></div>
    </div>
  );
}

function SimpleModal({ title, children, onClose }) {
  return <ModalShell onClose={onClose} label={title}><div className="modal-eyebrow"><AudioLines size={15} /> KAIRO SOUND</div><h2>{title}</h2>{children}</ModalShell>;
}

export default App;
