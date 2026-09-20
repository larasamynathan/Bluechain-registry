import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ClipboardCheck,
  Globe2,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRoles } from "@/hooks/use-roles";
import { AlertRipple, DropletCheck, EvidenceMark, MangroveMark, TideMark } from "@/components/coastal-icons";

type RoleMode = "admin" | "verifier" | "field_submitter";
type NavPath = "/dashboard" | "/projects" | "/evidence" | "/verification" | "/alerts" | "/users";
type QuickPath = "/projects/new" | "/projects" | "/verification" | "/alerts" | "/users";
type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  title: string;
  description: string;
  url: NavPath;
  icon: NavIcon;
};

const sharedItems: Record<"dashboard" | "projects" | "evidence" | "alerts", NavItem> = {
  dashboard: { title: "Overview", description: "Today’s working picture", url: "/dashboard", icon: TideMark },
  projects: { title: "Projects", description: "Restoration field sites", url: "/projects", icon: MangroveMark },
  evidence: { title: "Evidence", description: "Photos, measures & notes", url: "/evidence", icon: EvidenceMark },
  alerts: { title: "Alerts", description: "Anomalies needing attention", url: "/alerts", icon: AlertRipple },
};

const roleNavigation: Record<RoleMode, {
  name: string;
  label: string;
  note: string;
  icon: NavIcon;
  groups: { label: string; items: NavItem[] }[];
  quick: { label: string; url: QuickPath; icon: NavIcon }[];
}> = {
  field_submitter: {
    name: "Field Station",
    label: "Field submitter",
    note: "Capture · document · track",
    icon: MangroveMark,
    groups: [
      { label: "Field log", items: [sharedItems.dashboard, sharedItems.projects, sharedItems.evidence] },
      { label: "Signals", items: [sharedItems.alerts] },
    ],
    quick: [
      { label: "New project", url: "/projects/new", icon: MangroveMark },
      { label: "Submit evidence", url: "/projects", icon: EvidenceMark },
    ],
  },
  verifier: {
    name: "Review Desk",
    label: "Verifier",
    note: "Inspect · compare · decide",
    icon: DropletCheck,
    groups: [
      {
        label: "Review current",
        items: [
          sharedItems.dashboard,
          { title: "Verification", description: "Review the evidence queue", url: "/verification", icon: DropletCheck },
          sharedItems.alerts,
        ],
      },
      { label: "Source records", items: [sharedItems.evidence, sharedItems.projects] },
    ],
    quick: [
      { label: "Open review queue", url: "/verification", icon: ClipboardCheck },
      { label: "Inspect alerts", url: "/alerts", icon: AlertRipple },
    ],
  },
  admin: {
    name: "Registry Command",
    label: "Administrator",
    note: "Oversee · approve · govern",
    icon: ShieldCheck,
    groups: [
      {
        label: "Registry pulse",
        items: [sharedItems.dashboard, sharedItems.projects, sharedItems.evidence],
      },
      {
        label: "Review & governance",
        items: [
          { title: "Verification", description: "Evidence review & approval", url: "/verification", icon: DropletCheck },
          sharedItems.alerts,
          { title: "Team & Roles", description: "Access and responsibilities", url: "/users", icon: UserCog },
        ],
      },
    ],
    quick: [
      { label: "Review queue", url: "/verification", icon: ClipboardCheck },
      { label: "Manage team", url: "/users", icon: UserCog },
    ],
  },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, isVerifier } = useRoles();
  const role: RoleMode = isAdmin ? "admin" : isVerifier ? "verifier" : "field_submitter";
  const navigation = roleNavigation[role];
  const isActive = (url: NavPath) =>
    url === "/dashboard" ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon" className={`role-sidebar role-sidebar--${role}`}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="brand-mark flex size-9 shrink-0 items-center justify-center text-primary">
            <TideMark className="size-5" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold">BlueChain</span>
              <span className="font-mono text-[9px] uppercase text-muted-foreground">Field registry · MRV</span>
            </span>
          )}
        </div>
        <div className="role-pass">
          <span className="role-pass__icon"><navigation.icon className="size-4" /></span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="role-pass__eyebrow">{navigation.label}</span>
              <strong className="role-pass__name">{navigation.name}</strong>
              <span className="role-pass__note">{navigation.note}</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={isActive(item.url)}
                      tooltip={`${item.title} — ${item.description}`}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span className="nav-entry">
                          <span className="nav-entry__title">{item.title}</span>
                          <span className="nav-entry__description">{item.description}</span>
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="quick-actions-group">
          <SidebarGroupLabel>Quick paths</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="quick-paths">
              {navigation.quick.map((action) => (
                <Link key={action.label} to={action.url} className="quick-path" title={action.label}>
                  <action.icon className="size-3.5" />
                  {!collapsed && <span>{action.label}</span>}
                  {!collapsed && <ArrowUpRight className="ml-auto size-3" />}
                </Link>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="transparency-group">
          <SidebarGroupLabel>Transparency</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/registry" || pathname.startsWith("/registry/")}
                  tooltip="Public Registry"
                >
                  <Link to="/registry">
                    <Globe2 />
                    <span>Public Registry</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <p className="sidebar-coordinates px-2 pb-1">
            Coastal record · live field ledger
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
