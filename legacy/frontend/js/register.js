/**
 * Registration form handler.
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.textContent = '⏳ Registering...';
    btn.disabled = true;

    const data = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      domain: document.getElementById('domain').value,
      role: document.getElementById('role').value.trim(),
      interests: document.getElementById('interests').value.trim(),
      goals: document.getElementById('goals').value.trim(),
      bio: document.getElementById('bio').value.trim(),
      skill_level: document.getElementById('skill_level').value,
    };

    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify(data) });
      form.style.display = 'none';
      document.getElementById('success-message').style.display = 'block';
      showToast('User registered successfully!');
    } catch (err) {
      showToast(err.message, 'error');
      btn.textContent = '🚀 Register User';
      btn.disabled = false;
    }
  });
});

function resetForm() {
  document.getElementById('register-form').style.display = '';
  document.getElementById('register-form').reset();
  document.getElementById('success-message').style.display = 'none';
  document.getElementById('submit-btn').textContent = '🚀 Register User';
  document.getElementById('submit-btn').disabled = false;
}
