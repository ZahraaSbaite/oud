"""Renders a short, loopable lute/oud-style taqsim (Hijaz on D) with Karplus-Strong plucked strings."""
import numpy as np, wave, sys
from scipy.signal import lfilter, fftconvolve, butter, sosfilt

FS = 32000
rng = np.random.default_rng(7)

NOTE = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(name):
    n = NOTE[name[0]]; i = 1
    if name[i] == '#': n += 1; i += 1
    elif name[i] == 'b': n -= 1; i += 1
    return 12 * (int(name[i:]) + 1) + n
def hz(name): return 440.0 * 2 ** ((midi(name) - 69) / 12)

def pluck(freq, vel=0.8, dur=3.0, bright=0.5, detune_cents=0.0):
    """One string: noise burst through a comb (pick position) into a damped delay loop."""
    n = int(FS * dur)
    period = FS / (freq * 2 ** (detune_cents / 1200))
    M = int(np.floor(period)); c = period - M
    # excitation: filtered noise, pick-position comb
    L = M + 2
    x = rng.uniform(-1, 1, L)
    sos = butter(2, min(0.9, (1500 + 5500 * bright) / (FS / 2)), output='sos')
    x = sosfilt(sos, x)
    p = max(1, int(L * 0.18))
    x[p:] = x[p:] - 0.6 * x[:-p]
    exc = np.zeros(n); exc[:L] = x
    # loop filter: slight lowpass + fractional delay + decay
    g = 0.9955 if freq < 200 else 0.9945 if freq < 330 else 0.993
    a = np.zeros(M + 2); a[0] = 1.0
    a[M] = -g * (1 - c) * 0.5 * 2 * 0.5 + 0  # placeholder replaced below
    # two-tap averaging (lowpass) combined with fractional delay interpolation
    a = np.zeros(M + 3); a[0] = 1.0
    w = np.array([1 - c, c])
    for k, wk in enumerate(w):
        a[M + k] -= g * 0.5 * wk
        a[M + k + 1] -= g * 0.5 * wk
    y = lfilter([1.0], a, exc)
    return y

def note_voice(name, vel=0.8, dur=3.0, bright=0.5):
    f = hz(name)
    # double-course strings, slightly detuned (like an oud)
    y = pluck(f, vel, dur, bright, -2.0) + pluck(f, vel, dur, bright, +2.5) * 0.9
    # soft attack thump
    t = np.arange(len(y)) / FS
    y += 0.05 * np.sin(2 * np.pi * min(f, 160) * t) * np.exp(-t * 40)
    return y / (np.max(np.abs(y)) + 1e-9) * vel

def peaking(x, f0, q, gain_db):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / FS; alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return lfilter(b, a, x)

# ---------- composition (seconds) ----------
# tokens: (note or None for rest, duration, flags)  flags: t = tremolo (rish), g = grace from below
phrases = []
P = phrases.append
P([('D3',0.0,'drone'),('D4',1.3,''),('Eb4',.5,''),('F#4',.9,''),('G4',1.7,'t'),('F#4',.5,''),('Eb4',.55,''),('D4',2.4,'t'),(None,.5,'')])
P([('A3',0.0,'drone'),('D4',.55,''),('Eb4',.5,''),('F#4',.5,''),('G4',.5,''),('A4',1.9,'t'),('G4',.45,''),('F#4',.45,''),('Eb4',.55,''),('D4',2.1,'t'),(None,.5,'')])
P([('D3',0.0,'drone')] + [(n,.27,'') for n in 'D4 F#4 G4 A4 G4 F#4 G4 F#4 Eb4 D4 Eb4 F#4 G4 F#4 Eb4'.split()] + [('D4',1.6,'t'),(None,.5,'')])
P([('A3',0.0,'drone'),('A4',.6,''),('Bb4',.5,''),('C5',.5,''),('D5',1.9,'t'),('C5',.4,''),('Bb4',.4,''),('A4',.6,''),('G4',.45,''),('F#4',.45,''),('Eb4',.55,''),('D4',2.3,'t'),(None,.5,'')])
motif = [('D4',.26,''),('Eb4',.26,''),('F#4',.52,''),('G4',.26,''),('F#4',.26,''),('Eb4',.52,''),('D4',.52,'')]
motif2 = [('F#4',.26,''),('G4',.26,''),('A4',.52,''),('Bb4',.26,''),('A4',.26,''),('G4',.52,''),('F#4',.52,'')]
P([('D3',0.0,'drone')] + motif + motif + motif2 + [('Eb4',.5,''),('D4',1.7,'t'),(None,.6,'')])
P([('A3',0.0,'drone'),('A4',1.3,''),('G4',.65,''),('F#4',.65,''),('Eb4',.85,''),('F#4',.5,''),('Eb4',.5,''),('D4',3.4,'t'),('A3',.0,'drone'),(None,1.0,'')])

def render():
    total = 70.0
    out = np.zeros(int(FS * (total + 6)))
    t = 0.6
    for ph in phrases:
        for name, d, fl in ph:
            if fl == 'drone':
                v = note_voice(name, 0.45, 4.5, 0.3)
                s = int(FS * (t + rng.uniform(-.01, .01)))
                out[s:s + len(v)] += v[:len(out) - s]
                continue
            if name is None:
                t += d; continue
            start = t + rng.uniform(-0.012, 0.012)
            vel = float(np.clip(rng.normal(0.8, 0.07), 0.55, 1.0))
            br = 0.55 if d < 0.4 else 0.45
            ring = 3.2
            if 't' in fl:
                # rish: fast repeated picks for the length of the note
                n_picks = max(2, int(d * 11))
                for k in range(n_picks):
                    vk = vel * (0.95 if k == 0 else 0.5 + 0.2 * rng.random())
                    v = note_voice(name, vk, 1.4 if k < n_picks - 1 else ring, br)
                    s = int(FS * (start + k * d / n_picks))
                    out[s:s + len(v)] += v[:len(out) - s]
            else:
                v = note_voice(name, vel, ring, br)
                s = int(FS * start)
                out[s:s + len(v)] += v[:len(out) - s]
            t += d
    print('melody ends at %.1fs' % t, file=sys.stderr)
    return out, t

dry, end_t = render()

# body resonance
body = dry.copy()
for f0, q, g in [(105, 4, 5), (210, 5, 4), (420, 4, 3), (850, 3, 2)]:
    body = peaking(body, f0, q, g)
dry = 0.55 * dry + 0.45 * body

# gentle high-cut to keep it warm
dry = sosfilt(butter(2, 6500 / (FS / 2), output='sos'), dry)

# reverb: decaying noise IR (RT60 ~ 2.2s)
ir_len = int(FS * 2.4)
t_ir = np.arange(ir_len) / FS
ir = rng.normal(0, 1, ir_len) * np.exp(-6.9 * t_ir / 2.2)
ir = sosfilt(butter(1, 3500 / (FS / 2), output='sos'), ir)
ir[:int(0.012 * FS)] *= np.linspace(0, 1, int(0.012 * FS))
wet = fftconvolve(dry, ir)[:len(dry)]
mix = dry + 0.22 * wet * (np.max(np.abs(dry)) / (np.max(np.abs(wet)) + 1e-9)) * 2.0

# loop: fold the tail after the loop point back onto the start for a seamless repeat
loop_len = int(FS * (end_t + 3.0))
body_part = mix[:loop_len].copy()
tail = mix[loop_len:loop_len + int(FS * 3.0)]
body_part[:len(tail)] += tail
# fade in 20ms at the start
body_part[:int(.02 * FS)] *= np.linspace(0, 1, int(.02 * FS))
y = np.tanh(1.4 * body_part / (np.max(np.abs(body_part)) + 1e-9)) * 0.85
pcm = (y * 32767).astype(np.int16)
with wave.open('lute.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(FS); w.writeframes(pcm.tobytes())
print('wrote lute.wav %.1fs' % (len(pcm) / FS), file=sys.stderr)
