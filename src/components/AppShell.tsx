import { Avatar, Button, Layout, Menu, Tooltip } from './ui';
import { IconApps, IconBook, IconMenuFold, IconMenuUnfold, IconMessage, IconRobot, IconSettings, IconUserGroup } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!location.pathname.startsWith('/workflows')) return;
    const query = window.matchMedia('(max-width: 760px)');
    const compact = () => { if (query.matches) setCollapsed(true); };
    compact();
    query.addEventListener('change', compact);
    return () => query.removeEventListener('change', compact);
  }, [location.pathname]);
  const selected = useMemo(() => location.pathname.startsWith('/inbox') ? 'inbox' : location.pathname.startsWith('/agents') ? 'agent-management' : location.pathname.startsWith('/knowledge') ? 'knowledge' : location.pathname.startsWith('/workflows') ? 'workflows' : location.pathname.startsWith('/teams') ? 'teams' : location.pathname.startsWith('/channels') ? 'channels' : location.pathname.startsWith('/settings') ? 'settings' : '', [location.pathname]);
  return <Layout className="app-layout">
    <Header className="app-header">
      <div className="brand"><span className="brand-mark">灵</span><span className="brand-name">IM Support</span><Button className="sider-toggle" type="text" shape="circle" aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />} onClick={() => setCollapsed((value) => !value)} /></div>
      <div className="header-actions"><Tooltip title="个人中心"><Avatar size={28}>卢</Avatar></Tooltip></div>
    </Header>
    <Layout>
      <Sider width={200} collapsed={collapsed} className="app-sider" breakpoint="md" collapsedWidth={56} onCollapse={setCollapsed}>
        <div className="sider-inner">
          <Menu className="app-menu" mode="vertical" defaultOpenKeys={['resource-center']} selectedKeys={[selected]} onClickMenuItem={(key) => navigate(key === 'inbox' ? '/inbox' : key === 'agent-management' ? '/agents' : key === 'knowledge' ? '/knowledge' : key === 'workflows' ? '/workflows' : key === 'teams' ? '/teams' : key === 'settings' ? '/settings' : '/channels')}>
            <Menu.Item key="inbox"><IconMessage />收件箱</Menu.Item>
            <Menu.Item key="agent-management"><IconRobot />AI Agents</Menu.Item>
            <Menu.SubMenu key="resource-center" title={<><IconBook />资源中心</>}>
              <Menu.Item key="knowledge">知识库</Menu.Item>
              <Menu.Item key="workflows">工作流</Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key="teams"><IconUserGroup />团队</Menu.Item>
            <Menu.Item key="channels"><IconApps />渠道</Menu.Item>
            <Menu.Item key="settings"><IconSettings />设置</Menu.Item>
          </Menu>
        </div>
      </Sider>
      <Content className="app-content">{children}</Content>
    </Layout>
  </Layout>;
}
