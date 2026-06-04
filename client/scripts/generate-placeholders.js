/**
 * 占位图生成脚本
 * 运行方式: node scripts/generate-placeholders.js
 *
 * 需要先安装 canvas 或使用在线工具生成
 */

// 占位图配置
const placeholders = [
  {
    name: 'default-avatar.png',
    width: 200,
    height: 200,
    text: '头像',
    bgColor: '#f0f0f0',
    textColor: '#999'
  },
  {
    name: 'default-coach.png',
    width: 200,
    height: 200,
    text: '教练',
    bgColor: '#f0f0f0',
    textColor: '#999'
  },
  {
    name: 'empty-address.png',
    width: 400,
    height: 400,
    text: '暂无地址',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-reviews.png',
    width: 400,
    height: 400,
    text: '暂无评价',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-orders.png',
    width: 400,
    height: 400,
    text: '暂无订单',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-data.png',
    width: 400,
    height: 400,
    text: '暂无数据',
    bgColor: '#fafafa',
    textColor: '#ccc'
  },
  {
    name: 'empty-search.png',
    width: 400,
    height: 400,
    text: '未找到结果',
    bgColor: '#fafafa',
    textColor: '#ccc'
  }
];

console.log('📦 占位图配置已生成');
console.log('\n请选择以下方式之一生成图片：');
console.log('\n方式1: 使用在线工具');
console.log('访问 https://placeholder.com 或 https://dummyimage.com 生成');
console.log('\n方式2: 使用 canvas (Node.js)');
console.log('npm install canvas');
console.log('\n方式3: 使用代码生成 SVG (推荐)');
console.log('参考 /utils/images-svg.js 生成 SVG 占位图\n');

console.log('需要的图片文件列表：');
placeholders.forEach(p => {
  console.log(`  - ${p.name} (${p.width}x${p.height})`);
});
