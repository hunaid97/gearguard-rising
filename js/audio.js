// Synthesised sound effects, chiptune music and read-aloud dialogue. No audio files needed.
const Sound = (() => {
  let ac = null, master, sfxBus, musicBus;
  const settings = { music: true, voice: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('qa_settings') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('qa_settings', JSON.stringify(settings)); } catch (e) {} };
  let wantSong = null;
  const MUSIC_VOL = 0.2;

  function init() {
    try {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = settings.music ? MUSIC_VOL : 0; musicBus.connect(master);
      if (wantSong) { const s = wantSong; wantSong = null; music(s); }
    } catch (e) {}
  }

  function osc(freq, start, dur, type, vol, slide, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest);
    o.start(start); o.stop(start + dur + 0.05);
  }
  function tone(freq, dur, o = {}) {
    if (!ac) return;
    osc(freq, ac.currentTime + (o.delay || 0), dur, o.type || 'square', o.vol ?? 0.25, o.slide || 0, sfxBus);
  }
  let nb = null;
  function noiseAt(start, dur, vol, freq, dest) {
    if (!nb) {
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource(); s.buffer = nb;
    const f = ac.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, start);
    f.frequency.exponentialRampToValueAtTime(80, start + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(start); s.stop(start + dur + 0.05);
  }
  function noise(dur, o = {}) {
    if (!ac) return;
    noiseAt(ac.currentTime + (o.delay || 0), dur, o.vol ?? 0.4, o.freq || 1500, sfxBus);
  }

  const SFX = {
    jump() { tone(260, 0.15, { slide: 420, vol: 0.14 }); },
    djump() { tone(420, 0.16, { slide: 520, vol: 0.14 }); noise(0.1, { vol: 0.1, freq: 3000 }); },
    stomp() { tone(200, 0.12, { slide: -130, vol: 0.25 }); noise(0.1, { vol: 0.2, freq: 900 }); },
    blast() { tone(950, 0.12, { slide: -750, vol: 0.1, type: 'sawtooth' }); },
    bigblast() { tone(320, 0.32, { slide: -260, vol: 0.2, type: 'sawtooth' }); noise(0.25, { vol: 0.2, freq: 700 }); },
    hit() { tone(150, 0.08, { vol: 0.2 }); noise(0.08, { vol: 0.25, freq: 2200 }); },
    smash() { noise(0.32, { vol: 0.45, freq: 2000 }); tone(95, 0.2, { slide: -50, vol: 0.3, type: 'triangle' }); },
    boom() { noise(0.7, { vol: 0.6, freq: 1000 }); tone(70, 0.5, { slide: -40, vol: 0.4, type: 'triangle' }); },
    hurt() { tone(240, 0.28, { slide: -160, vol: 0.25, type: 'triangle' }); },
    pickup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.13, { delay: i * 0.07, vol: 0.16 })); },
    select() { tone(660, 0.05, { vol: 0.1 }); },
    confirm() { tone(523, 0.08, { vol: 0.14 }); tone(784, 0.14, { delay: 0.07, vol: 0.14 }); },
    back() { tone(420, 0.09, { slide: -160, vol: 0.12 }); },
    transform() {
      [0, 0.05, 0.11, 0.18, 0.24, 0.32].forEach((d, i) => {
        noise(0.05, { vol: 0.3, freq: 3500 - i * 350, delay: d });
        tone(220 + i * 95, 0.05, { delay: d, vol: 0.1 });
      });
      tone(160, 0.42, { slide: 640, vol: 0.09, type: 'sawtooth' });
    },
    honk() { tone(392, 0.32, { type: 'sawtooth', vol: 0.16 }); tone(494, 0.32, { type: 'sawtooth', vol: 0.12 }); },
    beep() { [880, 1175, 988, 1319].forEach((f, i) => tone(f, 0.06, { delay: i * 0.07, vol: 0.09 })); },
    land() { noise(0.12, { vol: 0.2, freq: 600 }); },
    slam() { noise(0.55, { vol: 0.6, freq: 800 }); tone(62, 0.45, { slide: -30, vol: 0.5, type: 'triangle' }); },
    charge() { tone(180, 0.8, { slide: 820, vol: 0.1, type: 'sawtooth' }); },
    firework() { noise(0.5, { vol: 0.25, freq: 2600 }); tone(1200, 0.3, { slide: -900, vol: 0.05 }); },
    suit() { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { delay: i * 0.09, vol: 0.14 })); },
  };
  function play(n) { if (!ac || !SFX[n]) return; try { SFX[n](); } catch (e) {} }

  // ---------- music (original tunes) ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parse(str) {
    return str.split(/\s+/).filter(t => t && t !== '|').map(t => {
      if (t === '.') return 0;
      const m = t.match(/^([A-G])(#|b)?(\d)$/);
      if (!m) return 0;
      return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    });
  }
  const SONGS = {
    hero: {
      bpm: 150,
      lead: parse(`E5 . E5 G5 . E5 D5 C5 | D5 . D5 G4 . . . . | C5 . C5 E5 . C5 D5 E5 | G5 . . F5 E5 . D5 .
                   A4 . C5 E5 . A5 G5 E5 | F5 . E5 D5 . C5 D5 . | E5 . G5 C6 . B5 A5 G5 | C6 . . . G5 . . .`),
      bass: parse(`C3 . C3 . G2 . G2 . | G2 . G2 . D3 . D3 . | A2 . A2 . E2 . E2 . | F2 . F2 . G2 . G2 .
                   A2 . A2 . E2 . E2 . | F2 . F2 . C3 . C3 . | C3 . C3 . E3 . E3 . | F2 . G2 . C3 . G2 .`),
      drums: 'k.hsk.hs',
    },
    title: {
      bpm: 120,
      lead: parse(`C5 . . G4 C5 . E5 . | D5 . . . . . . . | A4 . . F4 A4 . C5 . | B4 . . . G4 . . .
                   C5 . . G4 C5 . E5 . | F5 . E5 . D5 . C5 . | D5 . . . G5 . . . | C5 . . . . . . .`),
      bass: parse(`C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .
                   C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . . .`),
      drums: 'k..sk..s',
    },
    boss: {
      bpm: 168,
      lead: parse(`A4 A4 . A4 C5 . A4 . | G4 G4 . G4 B4 . G4 . | F4 F4 . F4 A4 . F4 . | E4 . G#4 . B4 . E5 .
                   A5 . E5 . C5 . A4 . | B4 . C5 . D5 . E5 . | F5 . E5 . D5 . C5 . | B4 . G#4 . E4 . . .`),
      bass: parse(`A2 A2 A2 A2 A2 A2 A2 A2 | G2 G2 G2 G2 G2 G2 G2 G2 | F2 F2 F2 F2 F2 F2 F2 F2 | E2 E2 E2 E2 E2 E2 E2 E2`),
      drums: 'khskkhsh',
    },
    win: {
      bpm: 132,
      lead: parse(`C5 . E5 . G5 . C6 . | . . G5 . C6 . . . | A5 . F5 . A5 . C6 . | B5 . G5 . D6 . . .
                   C6 . B5 . A5 . G5 . | F5 . E5 . D5 . E5 . | F5 . A5 . G5 . B5 . | C6 . . . . . . .`),
      bass: parse(`C3 . C3 . C3 . C3 . | E3 . E3 . E3 . E3 . | F2 . F2 . F2 . F2 . | G2 . G2 . G2 . G2 .
                   A2 . A2 . A2 . A2 . | F2 . F2 . G2 . G2 . | F2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .`),
      drums: 'k.hsk.hs',
    },
  };
  let song = null, step = 0, next = 0, timer = null;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function music(name) {
    if (!ac) { wantSong = name; return; }
    const s = name ? SONGS[name] : null;
    if (s === song) return;
    song = s; step = 0; next = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 30);
  }
  function tick() {
    if (!song || !ac) return;
    const sd = 60 / song.bpm / 2;
    if (next < ac.currentTime - 0.2) next = ac.currentTime + 0.05;
    while (next < ac.currentTime + 0.15) {
      const L = song.lead[step % song.lead.length], B = song.bass[step % song.bass.length];
      if (L) osc(mf(L), next, sd * 0.9, 'square', 0.12, 0, musicBus);
      if (B) osc(mf(B), next, sd * 0.85, 'triangle', 0.32, 0, musicBus);
      const d = song.drums[step % song.drums.length];
      if (d === 'k') osc(120, next, 0.12, 'sine', 0.5, -80, musicBus);
      if (d === 's') noiseAt(next, 0.1, 0.22, 4000, musicBus);
      if (d === 'h') noiseAt(next, 0.03, 0.07, 9000, musicBus);
      step++; next += sd;
    }
  }

  // ---------- read-aloud voices (great for a 7 year old!) ----------
  const VOICE = {
    titan: [0.5, 0.85], zip: [1.45, 1.2], skysnarl: [1.8, 1.15],
    dreadcore: [0.15, 0.75], qumayl: [1.5, 1.05], narrator: [1, 0.95],
  };
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    return vs.find(v => /en[-_]GB/i.test(v.lang) && /Daniel/i.test(v.name))
      || vs.find(v => /en[-_]US/i.test(v.lang) && /Samantha|Alex|Google/i.test(v.name))
      || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  function speak(text, who) {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      let clean = text.replace(/\*[^*]*\*/g, ' ').replace(/\.\.\./g, ', ').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      clean = clean.toLowerCase().replace(new RegExp(PERSONAL.name.toLowerCase(), 'g'), PERSONAL.spokenName || PERSONAL.name);
      const u = new SpeechSynthesisUtterance(clean);
      const [p, r] = VOICE[who] || VOICE.narrator;
      u.pitch = p; u.rate = r;
      const v = pickVoice(); if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  let unlocked = false;
  function unlockSpeech() {  // iOS only allows speech after a first utterance inside a tap
    if (unlocked || !('speechSynthesis' in window)) return;
    unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
  }
  function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) {} }
  function setMusic(on) { settings.music = on; save(); if (musicBus) musicBus.gain.value = on ? MUSIC_VOL : 0; }
  function setVoice(on) { settings.voice = on; save(); if (!on) stopSpeak(); }

  return { init, play, music, speak, stopSpeak, unlockSpeech, settings, setMusic, setVoice };
})();
