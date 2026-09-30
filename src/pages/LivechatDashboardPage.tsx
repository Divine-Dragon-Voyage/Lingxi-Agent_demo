import { useState } from 'react';
import { IconClockCircle, IconCustomerService, IconDashboard, IconFile, IconMoon, IconRefresh, IconSearch, IconSettings, IconUser, IconUserGroup, IconFullscreen, IconRobot } from '@arco-design/web-react/icon';
import { Empty } from '../components/ui';
import { createTranslator } from '../i18n';
import { useAppStore } from '../store';

const menuKeys = ['dataOverview', 'aiCustomerService', 'customerConsulting', 'customerList', 'serviceMonitor', 'ticketList', 'userManagement', 'teamManagement', 'serviceInfoManagement', 'chatConfig'] as const;
const menuIcons = [IconDashboard, IconRobot, IconCustomerService, IconUser, IconSearch, IconFile, IconUser, IconUserGroup, IconCustomerService, IconSettings];

export function LivechatDashboardPage() {
  const { state } = useAppStore();
  const t = createTranslator(state.ui.language);
  const [active, setActive] = useState<typeof menuKeys[number]>('dataOverview');
  const stats = [
    { title: t('currentConsultingUsers'), label: t('currentOnline'), icon: '💳' },
    { title: t('currentQueuedUsers'), label: t('currentQueue'), icon: '🧭' },
    { title: t('totalReceptionUsers'), label: t('totalSessions'), icon: '📊' },
    { title: t('currentOnlineAgents'), label: t('currentOnline'), icon: '👇' },
  ];
  return <div className="livechat-shell">
    <aside className="livechat-sider">
      <div className="livechat-brand-skeleton" />
      <nav className="livechat-menu">
        {menuKeys.map((key, index) => {
          const Icon = menuIcons[index];
          return <button key={key} className={active === key ? 'active' : ''} type="button" onClick={() => setActive(key)}><Icon />{t(key)}</button>;
        })}
      </nav>
      <button className="livechat-collapse" type="button">«</button>
    </aside>
    <main className="livechat-main">
      <header className="livechat-topbar">
        <div className="livechat-topbar-left"><button type="button">☰</button><IconRefresh /><IconClockCircle /><span>{t('dataOverview')}</span></div>
        <div className="livechat-topbar-right"><span className="livechat-search"><IconSearch />{t('search')}<kbd>Ctrl K</kbd></span><IconSettings /><IconMoon /><span>文A</span><span>{state.ui.language === 'zh-CN' ? '当前时区: (UTC+08:00)' : 'Timezone: (UTC+08:00)'}</span><IconFullscreen /><span className="livechat-offline"><i />{t('offline')}</span><span className="livechat-bell">◦</span><span className="livechat-avatar">卢</span></div>
      </header>
      <section className="livechat-content">
        {active === 'dataOverview' ? <>
          <div className="livechat-page-head"><h1>{t('dataOverview')}</h1><div className="livechat-tabs"><button className="active">{t('today')}</button><button>{t('yesterday')}</button><button>{t('thisWeek')}</button><button>{t('thisMonth')}</button><button>{t('year')}</button><button>{t('all')}</button></div></div>
          <div className="livechat-stat-grid">{stats.map((item) => <article className="livechat-stat-card" key={item.title}><h2>{item.title}</h2><div className="livechat-stat-body"><strong>0</strong><span>{item.icon}</span></div><p><span>{item.label}</span><b>0</b></p></article>)}</div>
          <section className="livechat-trend-card"><h2>{t('serviceTrend')}</h2><div className="livechat-empty"><Empty description={t('noData')} /></div></section>
        </> : <section className="livechat-empty-page"><h1>{t(active)}</h1><Empty description={t('featureEmpty')} /></section>}
      </section>
    </main>
  </div>;
}
