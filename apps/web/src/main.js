const cosBase = import.meta.env.VITE_COS_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';

async function loadConfig() {
  const res = await fetch('/config/site.json');
  if (!res.ok) throw new Error('无法加载 site.json');
  return res.json();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function render(config) {
  const app = document.getElementById('app');
  app.replaceChildren();

  const header = el('header', 'hero');
  header.append(
    el('p', 'eyebrow', 'GuGeeGoo'),
    el('h1', null, `${config.studentName}的学习`),
    el('p', 'lead', `${config.gradeLabel} · 英语 & 数学`)
  );

  if (config.status === 'prelaunch') {
    const banner = el('div', 'banner banner--info');
    banner.textContent =
      '站点骨架已就绪，PDF 与域名配置完成后即可正式开放。';
    header.append(banner);
  }

  if (!cosBase) {
    const warn = el('div', 'banner banner--warn');
    warn.textContent =
      '未配置 VITE_COS_PUBLIC_BASE_URL：练习下载链接将在部署 COS/CDN 后启用。';
    header.append(warn);
  }

  const grid = el('section', 'cards');
  grid.append(el('h2', 'section-title', '学科入口'));

  const row = el('div', 'cards__row');
  for (const sub of config.subjects) {
    const card = el('article', 'card');
    card.append(el('h3', null, sub.title), el('p', 'card__sub', sub.subtitle));

    if (cosBase) {
      const link = el('a', 'card__link', '打开练习文件夹');
      link.href = `${cosBase}/${sub.cosPath}/`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
    } else {
      card.append(el('p', 'card__muted', '（待链接 COS）'));
    }
    row.append(card);
  }
  grid.append(row);

  const foot = el('footer', 'foot');
  foot.textContent = '家长规划与批改在 Obsidian · 学习档案';

  app.append(header, grid, foot);
}

loadConfig()
  .then(render)
  .catch((err) => {
    console.error(err);
    document.getElementById('app').textContent = '页面加载失败，请稍后再试。';
  });
