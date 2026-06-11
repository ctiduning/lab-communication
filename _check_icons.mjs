import * as icons from '@element-plus/icons-vue';
const names = Object.keys(icons);
const targets = ['Home', 'House', 'ChatDot', 'ChatSquare', 'ChatLine', 'Message', 'Office', 'Comment', 'Promotion', 'Bell', 'Setting', 'User', 'Document', 'Menu', 'ArrowDown', 'Flag', 'Warning', 'Search', 'Refresh'];
for (const t of targets) {
  const matches = names.filter(n => n.toLowerCase().includes(t.toLowerCase()));
  console.log(`${t}:`, matches.join(', '));
}