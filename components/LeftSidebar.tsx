'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

import { Menu, Plus, Link as LinkIcon } from 'lucide-react';

type Props = {
  mode: string;
  setMode: (mode: string) => void;
  setSidebarWidth: (w: number) => void;
};

export default function LeftSidebar({
  mode,
  setMode,
  setSidebarWidth
}: Props) {

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSidebarWidth(collapsed ? 60 : 180);
  }, [collapsed]);

  const menu = [
    { key: 'add-node', label: 'Add Node', icon: Plus },
    { key: 'link', label: 'Add Link', icon: LinkIcon }
  ];

  return (
    <TooltipProvider>

      <div
        className={`
          fixed top-[60px] left-0 z-[1000]
          h-[calc(100%-60px)]
          border-r bg-background
          transition-all duration-300
          ${collapsed ? 'w-[60px]' : 'w-[180px]'}
        `}
      >

        {/* 🔘 Toggle */}
        <div className="p-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* 📋 Menu */}
        <div className="flex flex-col gap-1 px-2 text-xs">

          {menu.map(item => {

            const Icon = item.icon;
            const active = mode === item.key;

            const button = (
              <Button
                variant={active ? 'default' : 'ghost'}
                size="sm"
                className={`
                  justify-start gap-2 text-xs
                  ${collapsed ? 'px-2 justify-center' : ''}
                `}
                onClick={() => setMode(item.key)}
              >
                <Icon className="w-4 h-4" />
                {!collapsed && item.label}
              </Button>
            );

            return collapsed ? (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.key}>{button}</div>
            );
          })}

        </div>

      </div>

    </TooltipProvider>
  );
}