import React, { useState, useEffect, useRef } from 'react';

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Sora:wght@300;400;500;600;700&display=swap');
:root {
  --cream: #FAF7F2; --cream2: #F2EDE4; --cream3: #E8E0D4;
  --teal: #104C4C; --teal2: #0A3B3B; --tealSoft: #E8F3F3; --tealMid: #1A6B6B;
  --gold: #C9973A; --goldSoft: #FDF3E3; --goldDark: #9A6E1F;
  --slate: #1F2D3D; --slateM: #4A5E72; --slateL: #8AA0B4;
  --red: #D94F3D; --redSoft: #FDE8E6;
  --sage: #4A7C6F; --sageSoft: #EBF4F1;
  --green: #2E7D5E; --greenSoft: #E6F4EF;
  --purple: #7C5CBF; --purpleSoft: #F0EAF9;
  --white: #FFFFFF;
  --shadow: rgba(13,79,79,0.06); --shadowM: rgba(13,79,79,0.12);
}
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Sora', sans-serif; background: var(--cream); color: var(--slate); font-size: 14px; }
h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', serif; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes spinRing { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes spinRingR { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(-360deg); } }
@keyframes glowPulse { 0% { box-shadow: 0 0 0 0 rgba(16,76,76,0.2); } 50% { box-shadow: 0 0 0 24px rgba(16,76,76,0); } 100% { box-shadow: 0 0 0 0 rgba(16,76,76,0); } }
@keyframes floatEmoji { 0% { transform: translateY(0); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
@keyframes bgDrift { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
@keyframes bgDrift { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--cream); }
::-webkit-scrollbar-thumb { background: var(--cream3); border-radius: 10px; }
`;

// MOCK DATA
const USERS = {
  student: { email: 'arjun@college.edu', pass: 'pass123', name: 'Arjun Mehta', id: 'S001', role: 'student', year: 3, dept: 'CSE', cgpa: 8.7, attendance: 91, warnings: 1, active: true },
  faculty: { email: 'kavita@college.edu', pass: 'pass123', name: 'Dr. Kavita Rao', id: 'F001', role: 'faculty', dept: 'CSE', subject: 'Data Structures', active: true },
  admin: { email: 'admin@college.edu', pass: 'admin123', name: 'System Admin', id: 'A001', role: 'admin', active: true }
};
const ROLE_COLORS = { student: 'var(--teal)', faculty: 'var(--sage)', admin: 'var(--gold)' };

// COMPONENTS
const Card = ({ children, style, className='', hover=true }) => (
  <div className={className} style={{
    background: 'var(--white)', borderRadius: 24, padding: 28,
    boxShadow: '0 4px 24px var(--shadow)', transition: 'all 0.3s cubic-bezier(0.1, 0, 0.2, 1)', ...style
  }} onMouseEnter={hover ? e => Object.assign(e.currentTarget.style, { boxShadow: '0 8px 32px var(--shadowM)', transform: 'translateY(-2px)' }) : undefined}
     onMouseLeave={hover ? e => Object.assign(e.currentTarget.style, { boxShadow: '0 4px 24px var(--shadow)', transform: 'none' }) : undefined}>
    {children}
  </div>
);

const KpiCard = ({ title, sub, value, trend, icon, color }) => (
  <Card style={{ position: 'relative', overflow: 'hidden', padding: 24 }}>
    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `var(--${color}Soft)`, opacity: 0.8 }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: `var(--${color}Soft)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      {trend !== undefined && <div style={{ background: `var(--${trend > 0 ? 'green' : 'red'}Soft)`, color: `var(--${trend > 0 ? 'green' : 'red'})`, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%</div>}
    </div>
    <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
      <div style={{ fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 700, color: 'var(--slate)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slateM)', marginTop: 8 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--slateL)', marginTop: 4 }}>{sub}</div>}
    </div>
  </Card>
);

const PrimaryBtn = ({ children, bg, onClick, full, style }) => (
  <button onClick={onClick} style={{
    background: bg || 'var(--teal)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontFamily: 'Sora',
    fontWeight: 600, fontSize: 15, cursor: 'pointer', width: full ? '100%' : 'auto', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,76,76,0.15)', ...style
  }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,76,76,0.2)'; }}
     onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,76,76,0.15)'; }}>
    {children}
  </button>
);

const OutlineBtn = ({ children, onClick, full, style }) => (
  <button onClick={onClick} style={{
    background: 'transparent', color: 'var(--slateM)', border: '1.5px solid var(--slateM)', borderRadius: 12, padding: '12px 24px',
    fontFamily: 'Sora', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: full ? '100%' : 'auto', transition: 'all 0.2s', ...style
  }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream2)'; e.currentTarget.style.color = 'var(--slate)'; }}
     onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slateM)'; }}>
    {children}
  </button>
);

const Tag = ({ text, color, style }) => (
  <span style={{ background: `var(--${color}Soft)`, color: `var(--${color === 'gold' ? 'goldDark' : color})`, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...style }}>{text}</span>
);

const Avatar = ({ name, bg, size=44 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display', fontWeight: 600, fontSize: size*0.4, flexShrink: 0 }}>
    {name.split(' ').map(n => n[0]).join('')}
  </div>
);

const FormField = ({ label, icon, ...props }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slateM)', marginBottom: 8, letterSpacing: 0.5 }}>{label}</label>
    <div style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', left: 16, top: 15, fontSize: 16, color: 'var(--slateL)' }}>{icon}</span>}
      <input style={{
        width: '100%', padding: `15px 16px 15px ${icon ? 46 : 16}px`, border: '2px solid var(--cream3)', borderRadius: 12, background: 'var(--cream2)',
        outline: 'none', transition: 'all 0.2s', fontFamily: 'Sora', color: 'var(--slate)', fontSize: 15, fontWeight: 500
      }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--white)'; }}
         onBlur={e => { e.currentTarget.style.borderColor = 'var(--cream3)'; e.currentTarget.style.background = 'var(--cream2)'; }} {...props} />
    </div>
  </div>
);

// PAGES
const Dashboard = ({ user }) => (
  <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 1100, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
      <div>
        <h1 style={{ fontSize: 36, color: 'var(--slate)', letterSpacing: '-0.5px' }}>
          {user.role === 'student' ? <>Good morning, {user.name.split(' ')[0]} <span style={{ fontSize: 28 }}>👋</span></> :
           user.role === 'faculty' ? 'Faculty Dashboard' : 'Admin Control Panel'}
        </h1>
        <p style={{ color: 'var(--slateL)', fontSize: 15, margin: 0, marginTop: 6, fontWeight: 500 }}>Academic overview for this semester.</p>
      </div>
      {user.role === 'student' && <Tag text={`🎓 ${user.dept} · Year ${user.year}`} color="sage" style={{ fontSize: 14, padding: '8px 16px' }} />}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
      {user.role === 'student' && <>
        <KpiCard title="CGPA" sub="This semester" value={user.cgpa} trend={3} icon="🎯" color="teal" />
        <KpiCard title="Attendance" sub="Overall" value={`${user.attendance}%`} trend={2} icon="📅" color="sage" />
        <KpiCard title="Assignments" sub="Completed" value="12/15" icon="📋" color="gold" />
        <KpiCard title="Project" sub="Completion" value="80%" icon="🚀" color="purple" />
        <KpiCard title="Warnings" sub="Active" value={user.warnings} icon="⚠️" color="red" />
      </>}
      {user.role === 'faculty' && <>
        <KpiCard title="Total Students" sub="Active this term" value="142" trend={5} icon="👥" color="teal" />
        <KpiCard title="Pending Reviews" sub="Requires grading" value="18" icon="📝" color="gold" />
        <KpiCard title="Leave Requests" sub="Awaiting approval" value="3" icon="🗓" color="sage" />
        <KpiCard title="Violations" sub="Recent flags" value="2" trend={-2} icon="⚠️" color="red" />
      </>}
      {user.role === 'admin' && <>
        <KpiCard title="Total Users" sub="System-wide" value="4,250" trend={12} icon="👥" color="teal" />
        <KpiCard title="Suspended" sub="Account locks" value="12" icon="🚫" color="red" />
        <KpiCard title="Security Score" sub="Health check" value="98%" trend={1} icon="🛡" color="green" />
        <KpiCard title="Threats Blocked" sub="Past 30d" value="47" trend={-5} icon="⚔️" color="purple" />
        <KpiCard title="Audit Events" sub="Logged today" value="1.2k" icon="📋" color="gold" />
      </>}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>{user.role === 'admin' ? '🛡' : '📢'}</span>
          <h2 style={{ fontSize: 22 }}>{user.role === 'admin' ? 'Security Events' : 'Recent Announcements'}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {user.role !== 'admin' ? <>
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 0, top: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <strong style={{ color: 'var(--slate)', fontSize: 16 }}>Mid-Semester Examination Schedule</strong>
                <Tag text="high" color="red" />
              </div>
              <div style={{ fontSize: 14, color: 'var(--slateM)', marginBottom: 8, lineHeight: 1.5 }}>Exams scheduled from Dec 15th–20th.</div>
              <div style={{ fontSize: 12, color: 'var(--slateL)', fontWeight: 500 }}>Dr. Kavita Rao · 2h ago</div>
            </div>
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 0, top: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <strong style={{ color: 'var(--slate)', fontSize: 16 }}>Assignment III — Data Structures</strong>
                <Tag text="medium" color="gold" />
              </div>
              <div style={{ fontSize: 14, color: 'var(--slateM)', marginBottom: 8, lineHeight: 1.5 }}>Binary Trees assignment is now available.</div>
              <div style={{ fontSize: 12, color: 'var(--slateL)', fontWeight: 500 }}>Dr. Kavita Rao · 5h ago</div>
            </div>
          </> : <>
            <div style={{ background: 'var(--redSoft)', padding: 16, borderRadius: 12, border: '1px solid var(--red)' }}>
              <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 4 }}>[ANOMALY DETECTED]</strong>
              <span style={{ color: 'var(--slate)' }}>Multiple failed logins for Student S003. Account locked.</span>
              <div style={{ fontSize: 12, color: 'var(--slateM)', marginTop: 8, fontFamily: 'monospace' }}>IP: 192.168.1.45 · 10 mins ago</div>
            </div>
            <div style={{ background: 'var(--goldSoft)', padding: 16, borderRadius: 12, border: '1px solid var(--gold)' }}>
              <strong style={{ color: 'var(--goldDark)', display: 'block', marginBottom: 4 }}>[FLAGGED CHAT]</strong>
              <span style={{ color: 'var(--slate)' }}>AI filtered non-academic message in Chat Rm #892.</span>
              <div style={{ fontSize: 12, color: 'var(--slateM)', marginTop: 8, fontFamily: 'monospace' }}>User: S004 · 1h ago</div>
            </div>
          </>}
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>{user.role === 'student' ? '📈' : user.role === 'faculty' ? '📊' : '⚙️'}</span>
          <h2 style={{ fontSize: 22 }}>{user.role === 'student' ? 'Subject Performance' : user.role === 'faculty' ? 'Class Averages' : 'Active Protocols'}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {user.role === 'student' ? [
            { subj: 'Data Structures', prog: 85, c: 'teal' }, { subj: 'Calculus', prog: 72, c: 'gold' },
            { subj: 'Physics', prog: 90, c: 'sage' }, { subj: 'English', prog: 78, c: 'purple' }
          ].map(s => (
            <div key={s.subj}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--slate)', marginBottom: 10 }}><span>{s.subj}</span><span>{s.prog}%</span></div>
              <div style={{ height: 8, background: 'var(--cream2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${s.prog}%`, height: '100%', background: `var(--${s.c})`, borderRadius: 99, transition: 'width 1.5s cubic-bezier(0.1, 0, 0.2, 1)' }} />
              </div>
            </div>
          )) : user.role === 'faculty' ? [
            { subj: 'A Grade (>8.0)', prog: 45, c: 'green' }, { subj: 'B Grade (6-8)', prog: 35, c: 'gold' }, { subj: 'C Grade (<6)', prog: 20, c: 'red' }
          ].map(s => (
            <div key={s.subj}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--slate)', marginBottom: 10 }}><span>{s.subj}</span><span>{s.prog}%</span></div>
              <div style={{ height: 8, background: 'var(--cream2)', borderRadius: 99 }}>
                <div style={{ width: `${s.prog}%`, height: '100%', background: `var(--${s.c})`, borderRadius: 99 }} />
              </div>
            </div>
          )) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {['TLS 1.3', 'JWT Auth', 'AES-256 E2EE', 'AI Message Filter', 'Rate Limiting', 'Audit Logging', 'CSRF Protection', 'Login Lockout'].map(p => (
                <Tag key={p} text={`✓ ${p}`} color="green" style={{ padding: '8px 14px', fontSize: 13 }} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  </div>
);

const Messages = ({ user }) => (
  <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 1200, margin: '0 auto', height: 'calc(100vh - 100px)' }}>
    <h1 style={{ fontSize: 32, color: 'var(--slate)', marginBottom: 24, paddingLeft: 8 }}>Secure Messages 💬</h1>
    <div style={{ display: 'flex', gap: 24, height: 'calc(100% - 60px)' }}>
      <Card style={{ width: 280, padding: 0, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px 12px', fontSize: 16, fontWeight: 700, fontFamily: 'Playfair Display', borderBottom: '1px solid var(--cream3)' }}>Contacts</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {[{ n: 'Dr. Kavita Rao', d: 'CSE', a: true }, { n: 'Prof. Anand Kumar', d: 'MATH' }].map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 20px', cursor: 'pointer', background: c.a ? 'var(--tealSoft)' : 'transparent', borderLeft: c.a ? '3px solid var(--teal)' : '3px solid transparent', transition: 'background 0.2s' }}>
              <Avatar name={c.n} bg={c.a ? 'var(--teal)' : 'var(--sage)'} size={40} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--slate)', marginBottom: 2 }}>{c.n}</div>
                <div style={{ fontSize: 12, color: 'var(--slateL)', fontWeight: 500 }}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--cream3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Avatar name="Dr. Kavita Rao" bg="var(--teal)" size={48} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--slate)', marginBottom: 4 }}>Dr. Kavita Rao</div>
              <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}></span> Online · End-to-End Encrypted
              </div>
            </div>
          </div>
          <Tag text="🤖 AI Active" color="purple" style={{ padding: '6px 12px' }} />
        </div>
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
            <div style={{ background: 'var(--teal)', color: '#fff', padding: '16px 20px', borderRadius: '20px 20px 0 20px', fontSize: 15, lineHeight: 1.5 }}>
              Ma'am, can you clarify the assignment submission format?
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 8 }}>🔒 encrypted</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--slateL)', marginTop: 6, textAlign: 'right', fontWeight: 500 }}>Arjun Mehta · 10:32 AM</div>
          </div>
          <div style={{ alignSelf: 'flex-start', maxWidth: '70%', display: 'flex', gap: 12 }}>
            <Avatar name="Dr. Kavita" bg="var(--teal)" size={32} />
            <div>
              <div style={{ background: 'var(--white)', color: 'var(--slate)', border: '1px solid var(--cream3)', padding: '16px 20px', borderRadius: '20px 20px 20px 0', fontSize: 15, lineHeight: 1.5 }}>
                Submit as PDF with your roll number in the filename.
                <div style={{ fontSize: 10, color: 'var(--gold)', textAlign: 'right', marginTop: 8 }}>🔒 encrypted</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--slateL)', marginTop: 6, fontWeight: 500 }}>Dr. Kavita Rao · 10:45 AM</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', background: 'var(--white)', borderTop: '1px solid var(--cream3)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input placeholder="Type an academic message..." style={{ flex: 1, padding: '14px 20px', border: '1px solid var(--cream3)', borderRadius: 12, background: 'var(--cream2)', outline: 'none', fontSize: 15, fontFamily: 'Sora', color: 'var(--slate)' }} onFocus={e => e.currentTarget.style.background = 'var(--white)'} onBlur={e => e.currentTarget.style.background = 'var(--cream2)'} />
            <PrimaryBtn style={{ padding: '0 32px' }}>Send</PrimaryBtn>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--slateL)', fontWeight: 600, marginTop: 12, paddingLeft: 4 }}>
            <span>🔒 E2EE Active</span><span>⚡ 0/10 Msgs</span><span>⚠️ 0/3 Warnings</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

// LOGIN COMPONENT
const Login = ({ onLogin }) => {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const loadDemo = (r) => { setRole(r); setEmail(USERS[r].email); setPass(USERS[r].pass); };
  useEffect(() => loadDemo('student'), []);

  const handleLogin = (e) => {
    e.preventDefault();
    const u = USERS[role];
    if (u.email === email && u.pass === pass) {
      setErr('');
      onLogin(USERS[role]);
    } else {
      setErr('Invalid credentials or role mismatch.');
    }
  };

  const HeroPanel = () => (
    <div style={{ width: '46%', background: 'linear-gradient(160deg, #0A3B3B 0%, #0D4F4F 55%, #1A6B6B 100%)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', color: '#fff' }}>
      <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(16,76,76,0.3) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(201,151,58,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 80, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 44, height: 44, background: 'var(--gold)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 16px rgba(201,151,58,0.3)' }}>🎓</div>
        <div>
          <div style={{ fontFamily: 'Playfair Display', fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>AcadPortal</div>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, fontWeight: 600, marginTop: 4 }}>SECURE ACADEMIC SYSTEM</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '25%', right: '15%', width: 220, height: 220, zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 220, height: 220, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', animation: 'spinRing 20s linear infinite' }}>
          <div style={{ position: 'absolute', top: -3, left: '50%', width: 6, height: 6, background: 'var(--gold)', borderRadius: '50%', boxShadow: '0 0 10px var(--gold)' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 140, height: 140, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '50%', animation: 'spinRingR 24s linear infinite' }}>
          <div style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, background: 'var(--purple)', borderRadius: '50%', boxShadow: '0 0 10px var(--purple)' }} />
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 64, height: 64, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', borderRadius: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glowPulse 3s ease-in-out infinite', fontSize: 28, border: '1px solid rgba(255,255,255,0.1)' }}>🎓</div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
        <div style={{ fontFamily: 'Playfair Display', fontSize: 64, color: '#FFF', lineHeight: 1.1, fontWeight: 700 }}>Learn.</div>
        <div style={{ fontFamily: 'Playfair Display', fontSize: 64, color: 'var(--gold)', fontStyle: 'italic', lineHeight: 1.1 }}>Connect.</div>
        <div style={{ fontFamily: 'Playfair Display', fontSize: 64, color: '#FFF', marginBottom: 24, lineHeight: 1.1, fontWeight: 700 }}>Grow.</div>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, maxWidth: 360, fontWeight: 300 }}>A secure, AI-powered communication platform built for the modern academic community.</p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32, position: 'relative', zIndex: 1 }}>
        {[{ i: '🔒', t: 'End-to-End Encrypted' }, { i: '🤖', t: 'AI Message Filter' }, { i: '🛡', t: 'Cyber Security' }, { i: '📋', t: 'Audit Logs' }].map(f => (
          <div key={f.t} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '8px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><span style={{ opacity: 0.8 }}>{f.i}</span> {f.t}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 48, marginTop: 'auto', marginBottom: 40, position: 'relative', zIndex: 1 }}>
        {[{ v: '4,200+', l: 'Students' }, { v: '98%', l: 'Uptime' }, { v: '0', l: 'Breaches' }].map(s => (
          <div key={s.l}>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 6, fontWeight: 600, letterSpacing: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--cream)', overflow: 'hidden' }}>
      <HeroPanel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, var(--tealSoft) 0%, transparent 60%)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, var(--goldSoft) 0%, transparent 60%)', opacity: 0.6 }} />
        <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 2, animation: 'slideR 0.6s cubic-bezier(0.1, 0, 0.2, 1)' }}>

          <form onSubmit={handleLogin}>
            <h1 style={{ fontSize: 42, color: 'var(--slate)', marginBottom: 12, letterSpacing: '-0.5px' }}>Welcome Back</h1>
            <p style={{ color: 'var(--slateL)', marginBottom: 40, fontSize: 15, fontWeight: 500 }}>Sign in to your academic portal</p>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slateM)', marginBottom: 16, letterSpacing: 0.5 }}>Select Role</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
              {['student', 'faculty', 'admin'].map(r => (
                <button type="button" key={r} onClick={() => loadDemo(r)} style={{
                  flex: 1, padding: '20px 8px', borderRadius: 16,
                  background: role === r ? `var(--${r === 'student' ? 'teal' : r === 'faculty' ? 'sage' : 'gold'}Soft)` : 'var(--white)',
                  border: `2px solid ${role === r ? `var(--${r === 'student' ? 'teal' : r === 'faculty' ? 'sage' : 'gold'})` : 'var(--cream3)'}`,
                  cursor: 'pointer', transition: 'all 0.2s', transform: role === r ? 'translateY(-2px)' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  boxShadow: role === r ? '0 8px 24px rgba(16,76,76,0.08)' : '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontSize: 28 }}>{r === 'student' ? '👨‍🎓' : r === 'faculty' ? '👩‍🏫' : '🛡️'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate)', textTransform: 'capitalize' }}>{r}</span>
                </button>
              ))}
            </div>
            {err && <div style={{ background: 'var(--redSoft)', color: 'var(--red)', border: '1px solid var(--red)', padding: '14px 16px', borderRadius: 12, fontSize: 14, marginBottom: 24, fontWeight: 600 }}>{err}</div>}
            <FormField label="Email Address" icon="✉" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <FormField label="Password" icon="🔑" type="password" value={pass} onChange={e => setPass(e.target.value)} required />
            <PrimaryBtn full bg="var(--teal)" style={{ marginTop: 16, fontSize: 16, padding: '16px', borderRadius: 12 }}>Sign In to Portal →</PrimaryBtn>
            <div style={{ background: 'var(--cream2)', borderRadius: 16, padding: 24, marginTop: 40, border: '1px solid var(--cream3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slateL)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 }}>Quick Demo Access</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <OutlineBtn full style={{ padding: '10px 4px', fontSize: 13, background: 'var(--white)' }} onClick={() => loadDemo('student')}>Student</OutlineBtn>
                <OutlineBtn full style={{ padding: '10px 4px', fontSize: 13, background: 'var(--white)' }} onClick={() => loadDemo('faculty')}>Faculty</OutlineBtn>
                <OutlineBtn full style={{ padding: '10px 4px', fontSize: 13, background: 'var(--white)' }} onClick={() => loadDemo('admin')}>Admin</OutlineBtn>
              </div>
              <div style={{ fontSize: 12, color: 'var(--slateL)', marginTop: 12, textAlign: 'center', fontFamily: 'monospace' }}>Click a role → credentials auto-fill → Sign In</div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

// APP SHELL
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) return <><style>{GLOBAL_CSS}</style><Login onLogin={setUser} /></>;

  const navs = {
    student: [{ t: 'Dashboard', i: '■' }, { t: 'Announcements', i: '📢' }, { t: 'Messages', i: '💬' }, { t: 'Assignments', i: '📋' }, { t: 'Leave', i: '🗓' }, { t: 'Progress', i: '📊' }],
    faculty: [{ t: 'Dashboard', i: '■' }, { t: 'Announcements', i: '📢' }, { t: 'Messages', i: '💬' }, { t: 'Assignments', i: '📋' }, { t: 'Leave Requests', i: '🗓' }, { t: 'Update Marks', i: '📝' }],
    admin: [{ t: 'Dashboard', i: '■' }, { t: 'Users', i: '👥' }, { t: 'Warnings', i: '⚠️' }, { t: 'Messages Monitor', i: '💬' }, { t: 'Security Center', i: '🛡️' }, { t: 'Audit Log', i: '📋' }, { t: 'Reports', i: '📈' }]
  }[user.role];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'messages': return <Messages user={user} />;
      case 'security center': return <Card><h1 style={{ fontSize: 32, marginBottom: 24 }}>Security Center 🛡️</h1><div style={{ display: 'flex', gap: 12 }}>{['TLS 1.3', 'JWT Auth', 'OAuth 2.0', 'Bcrypt', '2FA TOTP'].map(p => <Tag key={p} text={p} color="green" style={{ padding: '8px 16px', fontSize: 14 }} />)}</div></Card>;
      case 'announcements': return <Card><h1 style={{ fontSize: 32, marginBottom: 24 }}>Announcements 📢</h1><div style={{ color: 'var(--slateM)' }}>Select an announcement to view details.</div></Card>;
      default: return <Card><h1 style={{ fontSize: 32, marginBottom: 24 }}>{activeTab.replace(/\b\w/g, l => l.toUpperCase())}</h1><p>Content for {activeTab} coming soon.</p></Card>;
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)' }}>
        <aside style={{ width: 260, background: 'var(--white)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10, boxShadow: '2px 0 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '32px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, background: 'var(--teal)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 4px 12px rgba(16,76,76,0.2)' }}>🎓</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 20, color: 'var(--slate)', letterSpacing: 0.5 }}>AcadPortal</div>
              <div style={{ fontSize: 11, color: 'var(--slateL)', fontWeight: 600 }}>v2.0 Secure</div>
            </div>
          </div>
          <div style={{ padding: '0 28px 32px' }}>
            <div style={{ padding: '16px 14px', background: 'var(--cream)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.name} bg={ROLE_COLORS[user.role]} size={42} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate)', marginBottom: 4 }}>{user.name}</div>
                <Tag text={user.role.charAt(0).toUpperCase() + user.role.slice(1)} color={user.role === 'student' ? 'teal' : user.role === 'faculty' ? 'sage' : 'gold'} style={{ padding: '2px 8px', fontSize: 10 }} />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slateL)', textTransform: 'uppercase', padding: '0 28px 12px', letterSpacing: 1 }}>Navigation</div>
          <nav style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
            {navs.map(n => {
              const id = n.t.toLowerCase();
              const act = activeTab === id;
              return (
                <div key={id} onClick={() => setActiveTab(id)} style={{
                  padding: '14px 16px', margin: '4px 0', borderRadius: 12, fontSize: 14,
                  fontWeight: act ? 700 : 500,
                  color: act ? ROLE_COLORS[user.role] : 'var(--slateM)',
                  background: act ? `var(--${user.role === 'student' ? 'teal' : user.role === 'faculty' ? 'sage' : 'gold'}Soft)` : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s',
                  borderLeft: act ? `4px solid ${ROLE_COLORS[user.role]}` : '4px solid transparent'
                }} onMouseEnter={e => { if (!act) { e.currentTarget.style.background = 'var(--cream2)'; e.currentTarget.style.color = 'var(--slate)'; } }}
                   onMouseLeave={e => { if (!act) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slateM)'; } }}>
                  <span style={{ fontSize: 16, opacity: act ? 1 : 0.6 }}>{n.i}</span> {n.t}
                </div>
              );
            })}
          </nav>
          <div style={{ padding: '24px 24px 32px' }}>
            <PrimaryBtn full bg="var(--redSoft)" style={{ color: 'var(--red)', boxShadow: 'none' }} onClick={() => setUser(null)}>🚪 Sign Out</PrimaryBtn>
          </div>
        </aside>
        <main style={{ marginLeft: 260, padding: '40px 48px', flex: 1 }}>
          {renderContent()}
        </main>
      </div>
    </>
  );
}
