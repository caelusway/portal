import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { useAgents } from '@/hooks/use-query-hooks';
import info from '@/lib/info.json';
import { formatAgentName } from '@/lib/utils';
import { AgentStatus } from '@elizaos/core';
import type { Agent } from '@elizaos/core';
import {
  Book,
  Plus,
  TerminalIcon,
  Palette,
  LayoutDashboard,
  User,
  FlaskConical,
  Bot,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import ConnectionStatus from './connection-status';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function AppSidebar() {
  const [onlineAgents, setOnlineAgents] = useState<Agent[]>([]);
  const { data: { data: agentsData } = {}, isLoading: agentsLoading } = useAgents();
  const location = useLocation();

  // Extract agents from the response
  const agents = agentsData?.agents || [];

  // Create a map of agent avatars for easy lookup
  const agentAvatars: Record<string, string | null> = {};
  for (const agent of agents) {
    if (agent.id && agent.settings?.avatar) {
      agentAvatars[agent.id] = agent.settings.avatar;
    }
  }

  useEffect(() => {
    // Split into online and offline agents
    const onlineAgents = agents.filter(
      (agent: Partial<Agent & { status: string }>) => agent.status === AgentStatus.ACTIVE
    );

    setOnlineAgents(onlineAgents);
  }, [agentsData]);

  return (
    <>
      <Sidebar className="bg-background">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <NavLink to="/" className="px-6 py-2 h-full">
                  <div className="flex flex-col pt-2 gap-1 items-start justify-center">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-bio-accent/20 rounded-lg blur-md"></div>
                      <img
                        alt="elizaos-logo"
                        src="/biolightlogo.png"
                        width="90%"
                        className="relative"
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground text-center">
                      v{info?.version}
                    </span>
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {/* Agents Section */}
          <SidebarGroup>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {agentsLoading ? (
                  <div>
                    {Array.from({ length: 5 }).map((_, _index) => (
                      <SidebarMenuItem key={`agent-skeleton-item-${_index}`}>
                        <SidebarMenuSkeleton />
                      </SidebarMenuItem>
                    ))}
                  </div>
                ) : (
                  <div>
                    {/* Render enabled agents */}
                    {onlineAgents.map((agent) => (
                      <SidebarMenuItem key={agent.id}>
                        <NavLink to={`/chat/${agent.id}`}>
                          <SidebarMenuButton
                            isActive={location.pathname.includes(agent.id as string)}
                            className="transition-colors px-4 my-4 h-full py-1 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 flex justify-center items-center">
                                <div className="relative bg-gray-600 rounded-full w-full h-full">
                                  {agent && (
                                    <div className="text-sm rounded-full h-full w-full flex justify-center items-center overflow-hidden">
                                      {agent.settings?.avatar ? (
                                        <img
                                          src={agent.settings.avatar}
                                          alt="Agent Avatar"
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        formatAgentName(agent.name)
                                      )}
                                      <div className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full border-[1px] border-white bg-green-500" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-base">
                                {agent.name.toLowerCase().includes('eliza')
                                  ? 'CoreAgent'
                                  : agent.name}
                              </span>
                            </div>
                          </SidebarMenuButton>
                        </NavLink>
                      </SidebarMenuItem>
                    ))}

                    {/* Dashboard Menu Item */}
                    <SidebarMenuItem>
                      <NavLink to="/dashboard">
                        <SidebarMenuButton
                          isActive={location.pathname === '/dashboard'}
                          className="transition-colors px-4 h-full py-1 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex justify-center items-center">
                              <div className="relative bg-gray-600 rounded-full w-full h-full">
                                <div className="text-sm rounded-full h-full w-full flex justify-center items-center overflow-hidden">
                                  <LayoutDashboard className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            </div>
                            <span className="text-base">Dashboard</span>
                          </div>
                        </SidebarMenuButton>
                      </NavLink>
                    </SidebarMenuItem>

                    {/* Profile Menu Item */}
                    <SidebarMenuItem>
                      <NavLink to="/profile">
                        <SidebarMenuButton
                          isActive={location.pathname === '/profile'}
                          className="transition-colors px-4 my-4 h-full py-1 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex justify-center items-center">
                              <div className="relative bg-gray-600 rounded-full w-full h-full">
                                <div className="text-sm rounded-full h-full w-full flex justify-center items-center overflow-hidden">
                                  <User className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            </div>
                            <span className="text-base">My Profile</span>
                          </div>
                        </SidebarMenuButton>
                      </NavLink>
                    </SidebarMenuItem>
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-4 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink to="https://docs.bio.xyz" target="_blank">
                <SidebarMenuButton className="text-muted-foreground hover:text-bio-accent/90 rounded-md">
                  <Book className="size-5" />
                  <span>Documentation</span>
                </SidebarMenuButton>
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink to="/logs">
                <SidebarMenuButton className="text-muted-foreground rounded-md">
                  <TerminalIcon className="size-5" />
                  <span>Logs</span>
                </SidebarMenuButton>
              </NavLink>
            </SidebarMenuItem>
            {/* Settings button temporarily disabled
            <SidebarMenuItem>
              <NavLink to="/settings">
                <SidebarMenuButton className="text-muted-foreground rounded-md">
                  <Cog className="size-5" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </NavLink>
            </SidebarMenuItem>
            */}
            <ConnectionStatus />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
