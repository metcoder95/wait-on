const PREFIX_RESOURCE = /^((https?-get|https?|tcp|socket|file):)(.+)$/

function extractPath (resource) {
  const m = PREFIX_RESOURCE.exec(resource)
  if (m) {
    return m[3]
  }
  return resource
}

module.exports = {
  extractPath
}
