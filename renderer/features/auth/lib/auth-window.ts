export function isAuthWindowHash(hash = window.location.hash): boolean {
  const path = hash.replace(/^#/, '').split('?')[0]
  return path === '/auth'
}

export function parseAuthWindowMode(
  hash = window.location.hash
): 'login' | 'register' {
  const query = hash.replace(/^#/, '').split('?')[1] ?? ''
  const params = new URLSearchParams(query)
  return params.get('mode') === 'register' ? 'register' : 'login'
}
