/**
 * Matches page — load users, find matches, render results.
 */
document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
  try {
    const data = await api('/api/users');
    const select = document.getElementById('user-select');
    select.innerHTML = '<option value="">Choose a user...</option>';
    data.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} — ${u.domain} (${u.role})`;
      select.appendChild(opt);
    });
  } catch (e) {
    showToast('Failed to load users', 'error');
  }
}

async function findMatches() {
  const userId = document.getElementById('user-select').value;
  if (!userId) return showToast('Please select a user', 'error');

  const method = document.getElementById('method-select').value;
  const topN = document.getElementById('topn-select').value;
  const container = document.getElementById('matches-container');

  showLoading('matches-container');

  try {
    const data = await api(`/api/match/${userId}?method=${method}&top_n=${topN}`);
    renderMatches(data, container);
  } catch (e) {
    showToast(e.message, 'error');
    showEmpty('matches-container', '❌', e.message);
  }
}

function renderMatches(data, container) {
  const qu = data.query_user;
  let html = `
    <div style="margin-bottom:24px;padding:20px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-lg)">
      <div style="display:flex;align-items:center;gap:16px">
        <div class="match-avatar">${getInitials(qu.name)}</div>
        <div>
          <div style="font-weight:700;font-size:1.1rem">${qu.name}</div>
          <div style="color:var(--text-secondary);font-size:0.9rem">${qu.domain} · ${qu.role}</div>
        </div>
        <div style="margin-left:auto">
          <span class="role-tag">${data.method.toUpperCase()}</span>
        </div>
      </div>
    </div>
    <h3 style="margin-bottom:16px;color:var(--text-secondary);font-size:0.9rem;text-transform:uppercase;letter-spacing:0.5px">
      Top ${data.matches.length} Matches
    </h3>
  `;

  data.matches.forEach((m, i) => {
    const u = m.user;
    const score = m.similarity_score;
    const reasons = m.explanation.reasons || [];
    html += `
      <div class="match-card" style="animation-delay:${i * 0.08}s">
        <div class="match-header">
          <div class="match-user">
            <div class="match-avatar">${getInitials(u.name)}</div>
            <div>
              <div class="match-name">${u.name}</div>
              <div class="match-role">${u.domain} · ${u.role} · ${u.skill_level}</div>
            </div>
          </div>
          <div class="match-score">${score}%</div>
        </div>
        <div class="match-bar"><div class="match-bar-fill" style="width:${score}%"></div></div>
        <ul class="match-reasons">
          ${reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    `;
  });

  container.innerHTML = html;
}
