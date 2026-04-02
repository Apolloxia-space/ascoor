'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { StructureTreeNode } from '../lib/structure-tree';
import { cn } from '@shared/lib/utils';

type StructureTreeProps = {
  nodes: Array<StructureTreeNode>;
  selectedNodeIds?: ReadonlySet<string>;
  activeNodeId?: string | null;
  onFocusNode?: (nodeId: string, options?: { additive?: boolean }) => void;
  onSetNodeHidden?: (nodeId: string, hidden: boolean) => void;
};

const countTreeNodes = (nodes: Array<StructureTreeNode>): number => {
  return nodes.reduce((sum, node) => sum + 1 + countTreeNodes(node.children), 0);
};

const collectTreeNodeIds = (nodes: Array<StructureTreeNode>): Set<string> => {
  const ids = new Set<string>();
  const visit = (treeNodes: Array<StructureTreeNode>) => {
    treeNodes.forEach((node) => {
      ids.add(node.id);
      visit(node.children);
    });
  };
  visit(nodes);
  return ids;
};

const findTreeNodePath = (
  nodes: Array<StructureTreeNode>,
  targetId: string,
): Array<string> | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [node.id];
    }
    const childPath = findTreeNodePath(node.children, targetId);
    if (childPath) {
      return [node.id, ...childPath];
    }
  }
  return null;
};

const formatCountLabel = (value: number, singular: string, plural = `${singular}s`) => {
  return `${value} ${value === 1 ? singular : plural}`;
};

const collectVisibleNodeIds = (
  nodes: Array<StructureTreeNode>,
  expandedIds: Set<string>,
): Array<string> => {
  const ids: Array<string> = [];

  const visit = (treeNodes: Array<StructureTreeNode>) => {
    treeNodes.forEach((node) => {
      ids.push(node.id);
      if (expandedIds.has(node.id)) {
        visit(node.children);
      }
    });
  };

  visit(nodes);
  return ids;
};

const getNodeMeta = (node: StructureTreeNode) => {
  const details = [node.nodeType];
  if (node.hidden) {
    details.push('Hidden');
  }
  if (node.childCount > 0) {
    details.push(formatCountLabel(node.childCount, 'child'));
  }
  if (node.meshCount > 0 || node.childCount === 0) {
    details.push(formatCountLabel(node.meshCount, 'mesh'));
  }
  return details.join(' / ');
};

export function StructureTree({
  nodes,
  selectedNodeIds = new Set<string>(),
  activeNodeId = null,
  onFocusNode,
  onSetNodeHidden,
}: StructureTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const nodeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const nodeCount = countTreeNodes(nodes);
  const visibleNodeIds = useMemo(
    () => collectVisibleNodeIds(nodes, expandedIds),
    [nodes, expandedIds],
  );
  const firstVisibleNodeId = visibleNodeIds[0] ?? null;

  useEffect(() => {
    const validIds = collectTreeNodeIds(nodes);
    setExpandedIds((current) => {
      if (validIds.size === 0) {
        return new Set();
      }

      const next = new Set<string>();
      current.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });

      if (current.size === 0) {
        nodes.forEach((node) => {
          next.add(node.id);
        });
      }

      return next;
    });
  }, [nodes]);

  useEffect(() => {
    const validIds = collectTreeNodeIds(nodes);
    setFocusedNodeId((current) => (current && validIds.has(current) ? current : null));
  }, [nodes]);

  useEffect(() => {
    const validIds = collectTreeNodeIds(nodes);
    const nextActiveNodeId = activeNodeId && validIds.has(activeNodeId) ? activeNodeId : null;
    setFocusedNodeId(nextActiveNodeId);
    if (!nextActiveNodeId) return;
    const path = findTreeNodePath(nodes, nextActiveNodeId);
    if (!path) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      path.slice(0, -1).forEach((id) => {
        next.add(id);
      });
      return next;
    });
  }, [activeNodeId, nodes]);

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const focusTreeNode = (nodeId: string) => {
    setFocusedNodeId(nodeId);
    const button = nodeButtonRefs.current.get(nodeId);
    button?.focus();
  };

  const renderNodes = (treeNodes: Array<StructureTreeNode>, depth = 0): React.ReactNode => {
    return treeNodes.map((node) => {
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedNodeIds.has(node.id);
      const isActive = activeNodeId === node.id;
      const isExpandable = node.children.length > 0;
      const path = findTreeNodePath(nodes, node.id);
      const parentId = path && path.length > 1 ? path[path.length - 2] : null;
      const nodeIndex = visibleNodeIds.indexOf(node.id);
      const previousNodeId = nodeIndex > 0 ? visibleNodeIds[nodeIndex - 1] : null;
      const nextNodeId =
        nodeIndex >= 0 && nodeIndex < visibleNodeIds.length - 1
          ? visibleNodeIds[nodeIndex + 1]
          : null;

      return (
        <div key={node.id} className="space-y-1" role="none">
          <div
            className={cn(
              'flex items-start gap-1 rounded-md border px-2 py-1.5 transition-colors',
              isActive
                ? 'border-primary/60 bg-primary/10'
                : isSelected
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-transparent hover:border-border hover:bg-muted/60',
            )}
            style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
          >
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse structure node' : 'Expand structure node'}
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-transform hover:bg-muted',
                !isExpandable && 'pointer-events-none opacity-0',
              )}
              onClick={() => toggleExpanded(node.id)}
              disabled={!isExpandable}
            >
              <ChevronRight className={cn('size-4', isExpanded && 'rotate-90')} />
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              role="treeitem"
              aria-expanded={isExpandable ? isExpanded : undefined}
              aria-selected={isSelected}
              tabIndex={node.id === (focusedNodeId ?? activeNodeId ?? firstVisibleNodeId) ? 0 : -1}
              ref={(element) => {
                if (element) {
                  nodeButtonRefs.current.set(node.id, element);
                  return;
                }
                nodeButtonRefs.current.delete(node.id);
              }}
              onFocus={() => setFocusedNodeId(node.id)}
              onKeyDown={(event) => {
                switch (event.key) {
                  case 'ArrowDown':
                    if (!nextNodeId) return;
                    event.preventDefault();
                    focusTreeNode(nextNodeId);
                    return;
                  case 'ArrowUp':
                    if (!previousNodeId) return;
                    event.preventDefault();
                    focusTreeNode(previousNodeId);
                    return;
                  case 'ArrowRight':
                    event.preventDefault();
                    if (isExpandable && !isExpanded) {
                      setExpandedIds((current) => new Set(current).add(node.id));
                      return;
                    }
                    if (isExpandable) {
                      focusTreeNode(node.children[0]?.id ?? node.id);
                    }
                    return;
                  case 'ArrowLeft':
                    event.preventDefault();
                    if (isExpandable && isExpanded) {
                      setExpandedIds((current) => {
                        const next = new Set(current);
                        next.delete(node.id);
                        return next;
                      });
                      return;
                    }
                    if (parentId) {
                      focusTreeNode(parentId);
                    }
                    return;
                  case 'Enter':
                  case ' ':
                    event.preventDefault();
                    setFocusedNodeId(node.id);
                    onFocusNode?.(node.id, { additive: event.metaKey || event.ctrlKey });
                    return;
                  case 'h':
                  case 'H':
                    event.preventDefault();
                    onSetNodeHidden?.(node.id, !node.hidden);
                    return;
                  default:
                    return;
                }
              }}
              onClick={(event) => {
                setFocusedNodeId(node.id);
                onFocusNode?.(node.id, { additive: event.metaKey || event.ctrlKey });
              }}
            >
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{node.displayName}</p>
                {node.hidden ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Hidden
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{getNodeMeta(node)}</p>
            </button>
            <button
              type="button"
              className="shrink-0 rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onSetNodeHidden?.(node.id, !node.hidden);
              }}
            >
              {node.hidden ? 'Show' : 'Hide'}
            </button>
          </div>
          {isExpandable && isExpanded ? (
            <div className="space-y-1">{renderNodes(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  };

  if (nodes.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Structure
          </p>
          <p className="text-xs text-muted-foreground">0 nodes</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Full hierarchy appears here when a runtime Object3D is available.
        </p>
      </div>
    );
  }

  return (
    <section data-structure-tree className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Structure
        </p>
        <p className="text-xs text-muted-foreground">{formatCountLabel(nodeCount, 'node')}</p>
      </div>
      <div role="tree" aria-label="Model structure" className="space-y-1">
        {renderNodes(nodes)}
      </div>
    </section>
  );
}
