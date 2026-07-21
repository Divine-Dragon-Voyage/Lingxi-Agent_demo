import { Avatar, Button, Layout, Menu, Tooltip } from './ui';
import { IconMenuFold, IconMenuUnfold, IconRobot, IconUserGroup } from '@arco-design/web-react/icon';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const selected = useMemo(() => location.pathname.startsWith('/agents') ? 'agent-management' : location.pathname.startsWith('/knowledge') ? 'knowledge' : location.pathname.startsWith('/teams') ? 'teams' : '', [location.pathname]);
  return <Layout className="app-layout">
    <Header className="app-header">
      <div className="brand"><span className="brand-mark">灵</span><span className="brand-name">灵犀智能体</span><Button className="sider-toggle" type="text" shape="circle" aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />} onClick={() => setCollapsed((value) => !value)} /></div>
      <div className="header-actions"><Tooltip title="个人中心"><Avatar size={28}>卢</Avatar></Tooltip></div>
    </Header>
    <Layout>
      <Sider width={200} collapsed={collapsed} className="app-sider" breakpoint="md" collapsedWidth={56} onCollapse={setCollapsed}>
        <div className="sider-inner">
          <Menu className="app-menu" mode="vertical" defaultOpenKeys={['ai-service']} selectedKeys={[selected]} onClickMenuItem={(key) => navigate(key === 'agent-management' ? '/agents' : key === 'knowledge' ? '/knowledge' : '/teams')}>
            <Menu.SubMenu key="ai-service" title={<><IconRobot />AI客服</>}>
              <Menu.Item key="agent-management">客服管理</Menu.Item>
              <Menu.Item key="knowledge">知识库</Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key="teams"><IconUserGroup />团队</Menu.Item>
          </Menu>
        </div>
      </Sider>
      <Content className="app-content">{children}</Content>
    </Layout>
  </Layout>;
}
