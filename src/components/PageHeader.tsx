import type { ReactNode } from 'react';
import { Tag } from './ui';

const statusMap = { draft: ['未发布', 'warning'], published: ['已发布', 'success'] } as const;

function StatusTag({ status }: { status: keyof typeof statusMap }) {
  const [label, color] = statusMap[status];
  return <Tag color={color}>{label}</Tag>;
}

export function PageHeader({ title, breadcrumb = [], status, actions, extra }: { title: ReactNode; breadcrumb?: string[]; status?: keyof typeof statusMap; actions?: ReactNode; extra?: ReactNode }) {
  return <div className="page-header"><div className="page-header-left">{breadcrumb.length > 0 && <div className="breadcrumb">{breadcrumb.map((item, index) => <span key={`${item}-${index}`}>{index > 0 ? ' / ' : ''}{item}</span>)}</div>}<div className="page-title-row"><h1 className="page-title">{title}</h1>{status && <StatusTag status={status} />}{extra}</div></div><div className="page-header-actions">{actions}</div></div>;
}
