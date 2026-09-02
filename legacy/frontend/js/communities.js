/**
 * Communities page — generate and display AI communities.
 */
document.addEventListener('DOMContentLoaded', () => {
  const methodSel = document.getElementById('cluster-method');
  const kGroup = document.getElementById('k-group');
  const vecGroup = document.getElementById('vectorizer-group');

  methodSel.addEventListener('change', () => {
    kGroup.style.display = methodSel.value === 'kmeans' ? '' : 'none';
    vecGroup.style.display = methodSel.value === 'rule' ? 'none' : '';
  });
  // Initial state
  vecGroup.style.display = 'none';
});

async function generateCommunities() {
  const method = document.getElementById('cluster-method').value;
  const vec = document.getElementById('vec-method').value;
  const k = document.getElementById('k-value').value;

  showLoading('communities-container');

  try {
    let url = `/api/communities?method=${method}&vectorizer=${vec}`;
    if (method === 'kmeans') url += `&k=${k}`;
    const data = await api(url);
    renderCommunities(data);
  } catch (e) {
    showToast(e.message, 'error');
    showEmpty('communities-container', '❌', e.message);
  }
}

function renderCommunities(data) {
  const container = document.getElementById('communities-container');
  if (!data.communities || data.communities.length === 0) {
    showEmpty('communities-container', '🤷', 'No communities generated. Try a different method.');
    return;
  }

  let html = `
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
      <span class="community-badge" style="font-size:0.9rem;padding:8px 16px">
        ${data.method} · ${data.n_communities} communities
      </span>
      ${data.noise_points && data.noise_points.length > 0
        ? `<span class="community-badge" style="background:rgba(245,158,11,0.15);color:var(--accent-orange)">
            ${data.noise_points.length} unassigned users
          </span>` : ''}
    </div>
  `;

  data.communities.forEach((comm, i) => {
    const diversity = Math.round((comm.role_diversity || 0) * 100);
    const domainDist = comm.domain_distribution || {};
    const domainTags = Object.entries(domainDist)
      .map(([d, c]) => `<span class="role-tag">${d} (${c})</span>`)
      .join(' ');

    html += `
      <div class="community-card" style="animation-delay:${i * 0.1}s">
        <div class="community-header">
          <div class="community-name">🏘️ ${comm.name}</div>
          <span class="community-badge">${comm.size} members</span>
        </div>
        <div class="community-meta">
          <span>📍 ${comm.dominant_domain || 'Mixed'}</span>
          <span>🎯 ${diversity}% role diversity</span>
          <span>⚙️ ${comm.method}</span>
        </div>
        <div style="margin-bottom:12px">${domainTags}</div>
        <div style="margin-bottom:8px;font-size:0.85rem;color:var(--text-secondary);font-weight:600">Members:</div>
        <div class="members-list">
          ${(comm.member_details || []).map(m => `
            <div class="member-chip">
              <div class="chip-avatar">${m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <span>${m.name}</span>
              <span class="role-tag" style="font-size:0.7rem">${m.role}</span>
            </div>
          `).join('')}
        </div>
        <div class="explanation-panel" id="expl-${comm.id}">
          <h4>🧠 Why This Community?</h4>
          <button class="btn btn-sm btn-secondary" onclick="loadExplanation(${comm.id})" style="margin-bottom:8px">
            Load Explanation
          </button>
          <ul id="expl-list-${comm.id}"></ul>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function loadExplanation(commId) {
  const method = document.getElementById('cluster-method').value;
  const vec = document.getElementById('vec-method').value;
  const k = document.getElementById('k-value').value;
  const listEl = document.getElementById(`expl-list-${commId}`);
  listEl.innerHTML = '<li>Loading...</li>';

  try {
    let url = `/api/communities/explain/${commId}?method=${method}&vectorizer=${vec}`;
    if (method === 'kmeans') url += `&k=${k}`;
    const data = await api(url);
    listEl.innerHTML = (data.reasons || []).map(r => `<li>✦ ${r}</li>`).join('');
  } catch (e) {
    listEl.innerHTML = `<li style="color:var(--accent-pink)">${e.message}</li>`;
  }
}
