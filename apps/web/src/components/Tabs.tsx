"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Supersedes CollapsibleSection for detail/record pages with enough attached modules that
 * stacking them means scrolling past everything to reach the last one (Students, Staff). All
 * tabs' content is still fetched server-side up front and passed in as `content` -- this
 * component only controls which one is visible, the same "children already rendered, this just
 * shows/hides" shape CollapsibleSection used. See docs/design-system.md > Detail and record pages
 * for the superseded guidance.
 */
export function Tabs({ tabs, defaultTabId }: { tabs: TabItem[]; defaultTabId?: string }) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={
                isActive
                  ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                  : "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" hidden={tab.id !== activeId}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
