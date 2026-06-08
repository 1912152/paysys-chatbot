export function getSessionId() {
  const key = 'paysys_chat_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'vis_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem(key, id);
  }
  return id;
}
