import type { WikiNode } from './types'

export interface DomainTreeNode {
  label: string
  fullPath: string
  count: number
  totalCount: number
  children: DomainTreeNode[]
}

export function buildDomainTree(domainMap: Record<string, WikiNode[]>): DomainTreeNode[] {
  const root: DomainTreeNode[] = []
  const lookup = new Map<string, DomainTreeNode>()

  // Collect all unique domain keys that nodes are directly tagged with
  const directCounts = new Map<string, number>()
  const allPaths = new Set<string>()
  for (const key of Object.keys(domainMap)) {
    const stripped = key.startsWith('#') ? key.slice(1) : key
    const parts = stripped.split('/')
    for (let i = 1; i <= parts.length; i++) {
      allPaths.add(parts.slice(0, i).join('/'))
    }
    // Count only nodes whose domains array literally contains this key
    const directCount = domainMap[key]?.filter(n => n.domains.includes(key)).length ?? 0
    directCounts.set(key, directCount)
  }

  const sorted = Array.from(allPaths).sort()

  for (const fullPath of sorted) {
    const parts = fullPath.split('/')
    const label = parts[parts.length - 1]
    const domainKey = `#${fullPath}`
    const count = directCounts.get(domainKey) ?? 0

    const node: DomainTreeNode = { label, fullPath: domainKey, count, totalCount: count, children: [] }
    lookup.set(fullPath, node)

    if (parts.length === 1) {
      root.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = lookup.get(parentPath)
      if (parent) parent.children.push(node)
    }
  }

  function computeTotal(node: DomainTreeNode): number {
    node.totalCount = node.count + node.children.reduce((sum, c) => sum + computeTotal(c), 0)
    return node.totalCount
  }
  root.forEach(computeTotal)

  return root
}
