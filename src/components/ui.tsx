import {
  Avatar,
  Badge,
  Button as ArcoButton,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Dropdown,
  Drawer as ArcoDrawer,
  Empty as ArcoEmpty,
  Form as ArcoForm,
  Grid,
  Input as ArcoInput,
  InputNumber,
  Layout,
  Menu,
  Message,
  Modal as ArcoModal,
  Popconfirm as ArcoPopconfirm,
  Popover,
  Radio,
  Slider as ArcoSlider,
  Select,
  Space,
  Switch as ArcoSwitch,
  Table as ArcoTable,
  Tag as ArcoTag,
  Tooltip as ArcoTooltip,
  Tabs as ArcoTabs,
  Descriptions as ArcoDescriptions,
  Upload,
} from '@arco-design/web-react';
import { forwardRef, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

const { Row, Col } = Grid;

const normalizeColor = (color: unknown) => ({
  success: 'green',
  error: 'red',
  warning: 'orange',
  processing: 'arcoblue',
  blue: 'arcoblue',
  default: 'gray',
}[String(color)] || color);

export { Avatar, Badge, Card, Checkbox, Col, DatePicker, Divider, Dropdown, InputNumber, Layout, Menu, Message, Popover, Radio, Row, Select, Space, Upload };

const CompatEmpty = ({ children, image: _image, ...props }: any) => <><ArcoEmpty {...props} /><div className="empty-action">{children}</div></>;
CompatEmpty.PRESENTED_IMAGE_SIMPLE = null;
export const Empty = CompatEmpty;

const CompatForm = (props: any) => <ArcoForm {...props} />;
export const Form: any = Object.assign(CompatForm, {
  useForm: () => {
    const [form] = ArcoForm.useForm();
    return [{ ...form, validateFields: form.validate }];
  },
  Item: ({ name, valuePropName, rules, children, ...props }: any) => {
    const normalizedRules = rules?.map((rule: any) => {
      const { pattern, max, min, ...rest } = rule;
      return { ...rest, match: pattern || rule.match, maxLength: rule.maxLength ?? max, minLength: rule.minLength ?? min };
    });
    const normalizedChildren = typeof children === 'function' ? (values: any, form: any) => children({ getFieldValue: form.getFieldValue }, values) : children;
    return <ArcoForm.Item field={name} triggerPropName={valuePropName} rules={normalizedRules} {...props}>{normalizedChildren}</ArcoForm.Item>;
  },
});

const CompatInput = ({ onChange, ...props }: { onChange?: (value: string) => void; [key: string]: any }) => <ArcoInput onChange={onChange} {...props} />;
CompatInput.TextArea = ({ showCount, ...props }: any) => <ArcoInput.TextArea showWordLimit={showCount} {...props} />;
CompatInput.Search = ArcoInput.Search;
CompatInput.Password = ArcoInput.Password;
export const Input = CompatInput;

export function Switch({ checkedChildren, unCheckedChildren, onChange, ...props }: { checkedChildren?: ReactNode; unCheckedChildren?: ReactNode; onChange?: (checked: boolean) => void; [key: string]: any }) {
  return <ArcoSwitch checkedText={checkedChildren} uncheckedText={unCheckedChildren} onChange={onChange} {...props} />;
}

export function Slider(props: any) {
  return <ArcoSlider {...props} />;
}

export function Tooltip({ title, ...props }: any) {
  return <ArcoTooltip content={title} {...props} />;
}

export function Popconfirm({ description, ...props }: any) {
  return <ArcoPopconfirm content={description} {...props} />;
}

export const Button = forwardRef<HTMLButtonElement, any>(function Button({ danger, type, ...props }, ref) {
  return <ArcoButton ref={ref} type={type === 'link' ? 'text' : type} status={danger ? 'danger' : props.status} {...props} />;
});

export function Tag({ color, ...props }: any) {
  return <ArcoTag color={normalizeColor(color)} {...props} />;
}

export function Table({ dataSource, ...props }: any) {
  return <ArcoTable data={dataSource} {...props} />;
}

export function Descriptions({ items, ...props }: any) {
  const data = items?.map((item: any) => ({ key: item.key, label: item.label, value: item.children, span: item.span }));
  return <ArcoDescriptions data={data} {...props} />;
}

export function Drawer({ open, destroyOnHidden, ...props }: any) {
  return <ArcoDrawer visible={open} unmountOnExit={destroyOnHidden} {...props} />;
}

export const Modal = Object.assign(function Modal({ open, destroyOnHidden, afterOpenChange, ...props }: { open?: boolean; destroyOnHidden?: boolean; afterOpenChange?: (visible: boolean) => void; [key: string]: any }) {
  const previousOpen = useRef(false);
  const afterOpenChangeRef = useRef(afterOpenChange);
  afterOpenChangeRef.current = afterOpenChange;
  useEffect(() => {
    if (open && !previousOpen.current) afterOpenChangeRef.current?.(true);
    previousOpen.current = Boolean(open);
  }, [open]);
  return <ArcoModal visible={open} unmountOnExit={destroyOnHidden} {...props} />;
}, { confirm: ArcoModal.confirm });

export function Tabs({ activeKey, items, onChange, ...props }: any) {
  return <ArcoTabs activeTab={activeKey} onChange={onChange} {...props}>{items?.map((item: any) => <ArcoTabs.TabPane key={item.key} title={item.label} />)}</ArcoTabs>;
}
