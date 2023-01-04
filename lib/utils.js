const PREFIX_RESOURCE = /^((https?-get|https?|tcp|socket|file):)(.+)$/

function extractPath (resource) {
  const m = PREFIX_RESOURCE.exec(resource)
  if (m) {
    return m[3]
  }
  return resource
}

function clone (src) {
  const copy = { ...src }
  const keys = Object.keys(src)

  for (const key of keys) {
    const value = src[key]
    if (Object.prototype.toString.call(value) === '[object Object]') {
      copy[key] = clone(value)
    } else if (Array.isArray(value)) {
      copy[key] = Array.from(value)
    }
  }

  return copy
}

module.exports = {
  extractPath,
  clone
}
