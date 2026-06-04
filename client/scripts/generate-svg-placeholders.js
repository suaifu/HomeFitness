/**
 * SVG占位图生成脚本
 * 运行方式: node scripts/generate-svg-placeholders.js
 *
 * 直接生成 SVG 文件，无需额外依赖
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../images');

// 确保目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 占位图配置
const placeholders = [
  {
    name: 'default-avatar.svg',
    width: 200,
    height: 200,
    text: '头像',
    bgColor: '#f0f0f0',
    textColor: '#999'
  },
  {
    name: 'default-coach.svg',
    width: 200,
    height: 200,
    text: '教练',
    bgColor: '#f0f0f0',
    textColor: '#999'
  },
  {
    name: 'empty-address.svg',
    width: 400,
    height: 400,
    text: '暂无地址',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-reviews.svg',
    width: 400,
    height: 400,
    text: '暂无评价',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-orders.svg',
    width: 400,
    height: 400,
    text: '暂无订单',
    bgColor: '#fafafa',
    textColor: '#ccc'
  }
];

function generateSVG(config) {
  const { width, height, text, bgColor, textColor } = config;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <circle cx="${width/2}" cy="${height/2 - 20}" r="40" fill="${textColor}" opacity="0.3"/>
  <rect x="${width/2 - 30}" y="${height/2 + 30}" width="60" height="8" rx="4" fill="${textColor}" opacity="0.3"/>
  <text x="${width/2}" y="${height - 40}"
        font-family="Arial, sans-serif"
        font-size="24"
        fill="${textColor}"
        text-anchor="middle">${text}</text>
</svg>`;
}

// 生成所有SVG文件
placeholders.forEach(config => {
  const svg = generateSVG(config);
  const filePath = path.join(outputDir, config.name);

  fs.writeFileSync(filePath, svg, 'utf8');
  console.log(`✅ 已生成: ${config.name}`);
});

console.log(`\n📁 图片已保存到: ${outputDir}`);
console.log('\n⚠️  注意: 小程序需要 PNG/JPG 图片，请使用在线工具转换或直接替换为真实图片');
