const fs = require("fs");
const path = process.env.TEMP + "\\members-smoke.cjs";
const lines = fs.readFileSync(path, "utf8").split("\n");
const start = lines.findIndex((l) => l.includes("checkedNodes = page.locator"));
const end = lines.findIndex((l) => l.includes('呈现联动状态");'));
if (start < 0 || end < 0 || end < start) { console.log("markers not found", start, end); process.exit(1); }
const block = [
  '  const nodeInput = (name) => page.locator(".permission-tree-wrap .arco-tree-node", { hasText: name }).first().locator("input");',
  '  ok((await nodeInput("收件箱").isChecked()) && (await nodeInput("用户管理").isChecked()), "权限树回填：收件箱与用户管理为勾选态");',
  '  ok(!(await nodeInput("知识库").isChecked()), "权限树回填：未授权页面未勾选");',
  '  const settingsState = await nodeInput("设置").evaluate((el) => ({ checked: el.checked, indeterminate: el.indeterminate }));',
  '  ok(settingsState.indeterminate || settingsState.checked, "父级菜单根据子权限呈现联动状态");',
];
lines.splice(start, end - start + 1, ...block);
fs.writeFileSync(path, lines.join("\n"));
console.log("spliced", start + 1, end + 1);
