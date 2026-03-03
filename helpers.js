export function mapPostsByCreatedAt(record) {
  if (!record.createdAt) return []
  return [record.createdAt]
}

export function mapCommentsByPostId(record) {
  if (!record.postId) return []
  return [record.postId]
}

export function mapByAuthor(record) {
  if (!record.author) return []
  return [record.author]
}
