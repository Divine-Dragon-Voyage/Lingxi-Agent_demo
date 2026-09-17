import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { setCreateRoot } from '@arco-design/web-react/es/_util/react-dom';
import '@arco-design/web-react/dist/css/arco.css';
import App from './App';

// React 19 主入口不再导出 createRoot，需显式注入，Arco 的 Message/Modal 等静态方法才能正常渲染
setCreateRoot(createRoot);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <HashRouter><App /></HashRouter>
    </ConfigProvider>
  </StrictMode>,
);
