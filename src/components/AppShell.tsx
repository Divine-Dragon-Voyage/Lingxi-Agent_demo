import { Avatar, Button, Layout, Menu, Tooltip } from './ui';
import { IconApps, IconBook, IconMenuFold, IconMenuUnfold, IconMindMapping, IconRobot } from '@arco-design/web-react/icon';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const selected = useMemo(() => location.pathname.startsWith('/agents') ? 'agents' : location.pathname.startsWith('/knowledge') ? 'knowledge' : location.pathname.startsWith('/skills') ? 'skills' : 'channels', [location.pathname]);
  return <Layout className="app-layout">
    <Header className="app-header">
      <div className="brand"><span className="brand-mark">灵</span><span className="brand-name">灵犀智能体</span><Button className="sider-toggle" type="text" shape="circle" aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'} icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />} onClick={() => setCollapsed((value) => !value)} /></div>
      <div className="header-actions"><Tooltip title="个人中心"><Avatar size={28}>卢</Avatar></Tooltip></div>
    </Header>
    <Layout>
      <Sider width={200} collapsed={collapsed} className="app-sider" breakpoint="md" collapsedWidth={56} onCollapse={setCollapsed}>
        <div className="sider-inner">
          <Menu className="app-menu" mode="vertical" selectedKeys={[selected]} onClickMenuItem={(key) => navigate(key === 'agents' ? '/agents' : key === 'knowledge' ? '/knowledge' : key === 'skills' ? '/skills' : '/channels')}>
            <Menu.Item key="agents"><IconRobot />智能体</Menu.Item>
            <Menu.Item key="knowledge"><IconBook />知识库</Menu.Item>
            <Menu.Item key="skills"><IconMindMapping />技能</Menu.Item>
            <Menu.Item key="channels"><IconApps />渠道</Menu.Item>
          </Menu>
        </div>
      </Sider>
      <Content className="app-content">{children}</Content>
    </Layout>
  </Layout>;
}
