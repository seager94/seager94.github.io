#!/usr/bin/env python3
"""
verify_answers.py - recompute formula-driven money/growth answers in a lesson HTML
and flag any stored answer that drifts from the true value.

USAGE:
  python verify_answers.py <lesson.html> [more.html ...] [--tol 0.01]

WHAT IT CHECKS (Tier 1 - fully automatable):
  - compound interest:  A = P(1 + r/n)^(nt)   ("compounded annually/monthly/quarterly/daily/weekly")
  - simple interest:    I = Prt  (accepts either the interest OR the final balance P+Prt)
  - constant % growth/decay (non-compounded): P(1 +/- r)^t

WHAT IT DOES NOT CHECK (printed as MANUAL - your eyeball list):
  - doubling time / half-life / "how many whole years" threshold questions
  - "difference between" two-scenario questions
  - anything it cannot parse P/r/t from -> never silently passed
"""
import sys, re, html

FREQ = {'annual':1,'annually':1,'monthly':12,'quarterly':4,'daily':365,'weekly':52,'fortnight':26,'semi-annual':2,'half-year':2}

def strip(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return html.unescape(re.sub(r'\s+', ' ', s)).strip()

def num(x):
    return float(x.replace(',', '').replace('$', ''))

def find_amount(t):
    m = re.search(r'\$\s*([\d,]+(?:\.\d+)?)', t)
    if m: return num(m.group(1))
    m = re.search(r'\b([\d,]{3,}(?:\.\d+)?)\b', t)  # fallback: first big number
    return num(m.group(1)) if m else None

def find_rate(t):
    m = re.search(r'(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?|per annum|per year|annual)', t)
    if m: return float(m.group(1))/100
    m = re.search(r'(\d+(?:\.\d+)?)\s*%', t)
    return float(m.group(1))/100 if m else None

def find_t(t):
    m = re.search(r'(\d+(?:\.\d+)?)\s*year', t)
    return float(m.group(1)) if m else None

def find_freq(t):
    for k,v in FREQ.items():
        if k in t.lower(): return v
    return None

def check_verify(verify, sv, rtol):
    """verify strings: 'compound:P=5000,r=0.045,n=12,t=3' | 'simple:P=..,r=..,t=..' |
    'growth:P=..,r=..,t=..' | 'decay:P=..,r=..,t=..'  (r as a decimal; n optional, default 1).
    Returns (status, detail) or None if unparseable (caller falls back to prose)."""
    try:
        vtype, _, params = verify.partition(':')
        vtype = vtype.strip().lower()
        kv = dict(x.split('=', 1) for x in params.split(',') if '=' in x)
        g = lambda k: float(kv[k]) if k in kv else None
        P, r, t, n = g('P'), g('r'), g('t'), g('n')
        if vtype == 'compound' and None not in (P, r, t):
            true = round(P*(1+r/(n or 1))**((n or 1)*t), 2)
            return ('OK' if abs(sv-true) <= rtol else 'MISMATCH', f'[verify] compound P={P} r={r} n={n or 1} t={t} -> true {true:.2f}, stored {sv:.2f}')
        if vtype == 'simple' and None not in (P, r, t):
            I = round(P*r*t, 2); bal = round(P+I, 2)
            if abs(sv-I) <= rtol or abs(sv-bal) <= rtol:
                return ('OK', f'[verify] simple I {I:.2f} / balance {bal:.2f}')
            return ('MISMATCH', f'[verify] simple -> I {I:.2f} or balance {bal:.2f}, stored {sv:.2f}')
        if vtype in ('growth', 'decay') and None not in (P, r, t):
            true = round(P*(1+r)**t, 2) if vtype == 'growth' else round(P*(1-r)**t, 2)
            return ('OK' if abs(sv-true) <= rtol else 'MISMATCH', f'[verify] {vtype} P={P} r={r} t={t} -> true {true:.2f}, stored {sv:.2f}')
    except Exception:
        pass
    return None

def classify_and_check(q, stored, tol, verify=''):
    """returns (status, detail). status in OK / MISMATCH / MANUAL"""
    t = strip(q)
    low = t.lower()
    try:
        sv = num(stored)
    except Exception:
        return ('MANUAL', 'non-numeric answer')
    # verify-first (patch 7): machine-readable params beat prose parsing; reaches types prose cannot
    if verify:
        rtol0 = 0.5 if (re.search(r'nearest (whole|dollar)|whole dollar|whole number', low) or ('.' not in str(stored))) else tol
        res = check_verify(verify, sv, rtol0)
        if res: return res
    # skip obvious non-final-value question types
    if any(p in low for p in ['how many whole years','how many years','difference','how much more','real value','real return','real growth','as a decimal','rounded to 5 dp','% per year. enter a whole','approximately']):
        return ('MANUAL', 'threshold/difference/conceptual - check by hand')
    # rounding awareness: questions saying 'nearest whole/dollar' (or whole-number stored answers) compare at +/- 0.5
    rtol = tol
    if re.search(r'nearest (whole|dollar)|whole dollar|whole number', low) or ('.' not in str(stored)):
        rtol = 0.5
    P, r, yr = find_amount(t), find_rate(t), find_t(t)
    if 'compound' in low:
        n = find_freq(t) or 1
        if None in (P, r, yr): return ('MANUAL', f'compound but could not parse P/r/t (P={P} r={r} t={yr})')
        true = round(P*(1+r/n)**(n*yr), 2)
        return ('OK' if abs(sv-true)<=rtol else 'MISMATCH', f'compound P={P} r={r} n={n} t={yr} -> true {true:.2f}, stored {sv:.2f}')
    if 'simple interest' in low:
        if None in (P, r, yr): return ('MANUAL', 'simple but could not parse P/r/t')
        I = round(P*r*yr,2); bal = round(P+I,2)
        if abs(sv-I)<=tol:  return ('OK', f'simple interest {I:.2f}')
        if abs(sv-bal)<=tol:return ('OK', f'simple balance {bal:.2f}')
        return ('MISMATCH', f'simple P={P} r={r} t={yr} -> I {I:.2f} or balance {bal:.2f}, stored {sv:.2f}')
    if any(w in low for w in ['grows','growth','decay','falls','depreciat','increase','decrease']) and yr is not None and r is not None and P is not None:
        gt = round(P*(1+r)**yr,2); dt = round(P*(1-r)**yr,2)
        if abs(sv-gt)<=rtol: return ('OK', f'growth {gt:.2f}')
        if abs(sv-dt)<=rtol: return ('OK', f'decay {dt:.2f}')
        return ('MISMATCH', f'const-% P={P} r={r} t={yr} -> growth {gt:.2f}/decay {dt:.2f}, stored {sv:.2f}')
    return ('MANUAL', 'type not recognised')

def extract(text):
    items = []  # (kind, question, answer, lineno)
    # practice/retrieval arrays: { q: '...', a: '...' ... }
    # whole-text scan: \s* spans newlines, so one-key-per-line objects match too
    for m in re.finditer(r"q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'(?:\s*,\s*hint:\s*'(?:[^'\\]|\\.)*')?(?:\s*,\s*verify:\s*'((?:[^'\\]|\\.)*)')?", text):
        items.append(('practice', m.group(1), m.group(2), m.group(3) or '', text.count('\n', 0, m.start()) + 1))
    return items

def run(path, tol):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    items = extract(text)
    print(f"\n=== {path} : {len(items)} stored answers ===")
    bad=man=ok=0
    for kind,q,a,vf,ln in items:
        st,detail = classify_and_check(q, a, tol, vf)
        if st=='MISMATCH':
            bad+=1; print(f"  L{ln}  MISMATCH  ans='{a}'  | {detail}")
        elif st=='MANUAL':
            man+=1
    if man:
        print(f"  ... {man} MANUAL items (not auto-checkable) - listing:")
        for kind,q,a,vf,ln in items:
            st,detail = classify_and_check(q,a,tol,vf)
            if st=='MANUAL': print(f"      L{ln}  ans='{a}'  | {strip(q)[:70]}")
    ok = len(items)-bad-man
    print(f"  SUMMARY: {ok} verified OK, {bad} MISMATCH, {man} manual.  {'>>> FIX MISMATCHES BEFORE PUBLISH' if bad else 'no formula errors found'}")
    return bad

if __name__=='__main__':
    import glob
    raw=[a for a in sys.argv[1:] if not a.startswith('--')]
    args=[]
    for a in raw:
        g=glob.glob(a)
        args.extend(g if g else [a])
    tol=0.01
    if '--tol' in sys.argv: tol=float(sys.argv[sys.argv.index('--tol')+1])
    total=sum(run(p,tol) for p in args)
    sys.exit(1 if total else 0)
