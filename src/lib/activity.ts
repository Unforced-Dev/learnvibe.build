import { eq, desc, and, ne } from 'drizzle-orm'
import { getDb } from '../db'
import { discussions, comments, projects, users } from '../db/schema'

export type ActivityItem = {
  type: 'discussion' | 'comment' | 'project'
  id: number
  title: string
  authorName: string
  authorId: number
  url: string
  createdAt: string
}

/**
 * Get recent community activity — discussions, comments, and projects.
 * Returns a merged, sorted list of the most recent items.
 */
export async function getRecentActivity(
  db: D1Database,
  limit: number = 10
): Promise<ActivityItem[]> {
  const database = getDb(db)
  const items: ActivityItem[] = []

  // Recent discussions
  const recentDiscussions = await database
    .select({
      id: discussions.id,
      title: discussions.title,
      cohortId: discussions.cohortId,
      authorName: users.name,
      authorId: users.id,
      createdAt: discussions.createdAt,
    })
    .from(discussions)
    .innerJoin(users, eq(discussions.userId, users.id))
    .where(eq(discussions.status, 'active'))
    .orderBy(desc(discussions.createdAt))
    .limit(limit)
    .all()

  recentDiscussions.forEach(d => {
    items.push({
      type: 'discussion',
      id: d.id,
      title: `Started: "${d.title}"`,
      authorName: d.authorName || 'Anonymous',
      authorId: d.authorId,
      url: d.cohortId
        ? `/community/discussions/${d.id}` // simplified — would need slug lookup for cohort discussions
        : `/community/discussions/${d.id}`,
      createdAt: d.createdAt,
    })
  })

  // Recent comments (with discussion title for context)
  const recentComments = await database
    .select({
      id: comments.id,
      discussionId: comments.discussionId,
      discussionTitle: discussions.title,
      cohortId: discussions.cohortId,
      authorName: users.name,
      authorId: users.id,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .innerJoin(discussions, eq(comments.discussionId, discussions.id))
    .where(eq(comments.status, 'active'))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .all()

  recentComments.forEach(cm => {
    items.push({
      type: 'comment',
      id: cm.id,
      title: `Replied to "${cm.discussionTitle}"`,
      authorName: cm.authorName || 'Anonymous',
      authorId: cm.authorId,
      url: cm.cohortId
        ? `/community/discussions/${cm.discussionId}`
        : `/community/discussions/${cm.discussionId}`,
      createdAt: cm.createdAt,
    })
  })

  // Recent projects
  const recentProjects = await database
    .select({
      id: projects.id,
      title: projects.title,
      authorName: users.name,
      authorId: users.id,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.status, 'active'))
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .all()

  recentProjects.forEach(p => {
    items.push({
      type: 'project',
      id: p.id,
      title: `Shared project: "${p.title}"`,
      authorName: p.authorName || 'Anonymous',
      authorId: p.authorId,
      url: `/projects/${p.id}`,
      createdAt: p.createdAt,
    })
  })

  // Sort by createdAt descending, take top N
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return items.slice(0, limit)
}
