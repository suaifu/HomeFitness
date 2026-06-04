#!/usr/bin/env python3
"""生成微信小程序占位图片"""
from PIL import Image, ImageDraw, ImageFont
import os

# 输出目录
OUTPUT_DIR = "/Users/fushuaiguo/WorkBuddy/Claw/HomeFitness/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 颜色配置
COLORS = {
    'primary': '#07c160',      # 微信绿
    'secondary': '#576b95',   # 微信蓝
    'gray': '#999999',
    'light_gray': '#cccccc',
    'white': '#ffffff',
    'bg_light': '#f7f7f7',
    'text': '#333333',
}

def create_image(filename, size, draw_func):
    """创建图片"""
    img = Image.new('RGBA', size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw, size)
    img.save(os.path.join(OUTPUT_DIR, filename), 'PNG')
    print(f"Created: {filename}")

# 1. Logo 图片
def draw_logo(draw, size):
    w, h = size
    # 背景圆
    draw.ellipse([10, 10, w-10, h-10], fill=COLORS['primary'])
    # 健身图标 (简化的哑铃形状)
    cx, cy = w//2, h//2
    # 横杆
    draw.rectangle([cx-30, cy-5, cx+30, cy+5], fill=COLORS['white'])
    # 左侧哑铃头
    draw.ellipse([cx-40, cy-15, cx-20, cy+15], fill=COLORS['white'])
    # 右侧哑铃头
    draw.ellipse([cx+20, cy-15, cx+40, cy+15], fill=COLORS['white'])

create_image("logo.png", (200, 200), draw_logo)

# 2. 默认头像
def draw_default_avatar(draw, size):
    w, h = size
    # 圆形背景
    draw.ellipse([5, 5, w-5, h-5], fill=COLORS['light_gray'])
    # 头部
    cx, cy = w//2, h//2 - 5
    draw.ellipse([cx-15, cy-20, cx+15, cy+10], fill=COLORS['gray'])
    # 身体
    draw.ellipse([cx-25, cy+5, cx+25, cy+35], fill=COLORS['gray'])

create_image("default-avatar.png", (100, 100), draw_default_avatar)

# 3. 默认教练头像
def draw_default_coach(draw, size):
    w, h = size
    # 圆形背景
    draw.ellipse([5, 5, w-5, h-5], fill=COLORS['primary'])
    # 头部
    cx, cy = w//2, h//2 - 5
    draw.ellipse([cx-15, cy-20, cx+15, cy+10], fill=COLORS['white'])
    # 身体
    draw.ellipse([cx-25, cy+5, cx+25, cy+35], fill=COLORS['white'])

create_image("default-coach.png", (100, 100), draw_default_coach)

# 4. 空状态图片 - 地址
def draw_empty_address(draw, size):
    w, h = size
    # 位置图标
    cx, cy = w//2, h//3
    # 标注
    draw.polygon([(cx, cy-25), (cx-15, cy), (cx+15, cy)], fill=COLORS['gray'])
    draw.ellipse([cx-8, cy, cx+8, cy+16], fill=COLORS['gray'])
    # 文字区域
    draw.text((w//2-30, h//2+10), "暂无地址", fill=COLORS['gray'])

create_image("empty-address.png", (200, 200), draw_empty_address)

# 5. 空状态图片 - 订单
def draw_empty_orders(draw, size):
    w, h = size
    # 订单图标 (文档形状)
    cx, cy = w//2, h//3
    draw.rectangle([cx-25, cy-30, cx+25, cy+30], fill=COLORS['light_gray'])
    draw.line([cx-25, cy-10, cx+25, cy-10], fill=COLORS['gray'], width=2)
    draw.line([cx-25, cy+5, cx+15, cy+5], fill=COLORS['gray'], width=2)
    draw.line([cx-25, cy+20, cx+10, cy+20], fill=COLORS['gray'], width=2)
    # 文字
    draw.text((w//2-30, h//2+15), "暂无订单", fill=COLORS['gray'])

create_image("empty-orders.png", (200, 200), draw_empty_orders)

# 6. 空状态图片 - 评价
def draw_empty_reviews(draw, size):
    w, h = size
    # 星星图标
    cx, cy = w//2, h//3
    for i, offset in enumerate([-40, 0, 40]):
        # 五角星简化
        draw.ellipse([cx+offset-10, cy-10, cx+offset+10, cy+10], fill=COLORS['light_gray'])
    # 文字
    draw.text((w//2-30, h//2+15), "暂无评价", fill=COLORS['gray'])

create_image("empty-reviews.png", (200, 200), draw_empty_reviews)

# 7. 空状态图片 - 通用数据
def draw_empty_data(draw, size):
    w, h = size
    # 数据框图标
    cx, cy = w//2, h//3
    draw.rectangle([cx-30, cy-25, cx+30, cy+25], outline=COLORS['gray'], width=3)
    draw.line([cx-30, cy-5, cx+30, cy-5], fill=COLORS['light_gray'], width=2)
    # 文字
    draw.text((w//2-30, h//2+15), "暂无数据", fill=COLORS['gray'])

create_image("empty-data.png", (200, 200), draw_empty_data)

# 8. 空状态图片 - 搜索
def draw_empty_search(draw, size):
    w, h = size
    # 搜索框图标
    cx, cy = w//2, h//3
    # 圆圈
    draw.ellipse([cx-20, cy-20, cx+15, cy+15], outline=COLORS['gray'], width=3)
    # 手柄
    draw.line([cx+10, cy+10, cx+25, cy+25], fill=COLORS['gray'], width=3)
    # 文字
    draw.text((w//2-40, h//2+20), "未找到结果", fill=COLORS['gray'])

create_image("empty-search.png", (200, 200), draw_empty_search)

# 9. Banner 默认图
def draw_banner(draw, size):
    w, h = size
    # 渐变背景
    for i in range(h):
        alpha = int(200 - (i / h) * 100)
        draw.line([(0, i), (w, i)], fill=(120, 180, 255, alpha))
    # 图片图标
    cx, cy = w//2, h//2
    draw.rectangle([cx-30, cy-20, cx+30, cy+20], outline=COLORS['white'], width=2)
    draw.ellipse([cx-8, cy-8, cx+8, cy+8], fill=COLORS['white'])
    draw.polygon([(cx-20, cy+10), (cx+20, cy-10), (cx-20, cy-10), (cx+20, cy+10)], fill=COLORS['white'])

create_image("banner-default.png", (375, 150), draw_banner)

# 10-17. TabBar 图标 (普通和选中状态)
tab_icons = [
    ("tab-home.png", "tab-home-active.png", "首页"),
    ("tab-coach.png", "tab-coach-active.png", "教练"),
    ("tab-order.png", "tab-order-active.png", "订单"),
    ("tab-user.png", "tab-user-active.png", "我的"),
]

def draw_tab_icon_normal(draw, size, label):
    w, h = size
    cx, cy = w//2, h//2 - 5
    # 矩形框
    draw.rectangle([cx-18, cy-18, cx+18, cy+18], outline=COLORS['gray'], width=2)
    # 内部图形
    if label == "首页":
        draw.rectangle([cx-10, cy-10, cx+10, cy+10], outline=COLORS['gray'], width=1)
    elif label == "教练":
        draw.ellipse([cx-10, cy-10, cx+10, cy+10], outline=COLORS['gray'], width=1)
    elif label == "订单":
        draw.rectangle([cx-8, cy-12, cx+8, cy+12], outline=COLORS['gray'], width=1)
    else:  # 我的
        draw.ellipse([cx-10, cy-12, cx+10, cy+2], outline=COLORS['gray'], width=1)
        draw.ellipse([cx-12, cy+5, cx+12, cy+15], outline=COLORS['gray'], width=1)

def draw_tab_icon_active(draw, size, label):
    w, h = size
    cx, cy = w//2, h//2 - 5
    # 填充矩形
    draw.rectangle([cx-18, cy-18, cx+18, cy+18], fill=COLORS['primary'])
    # 内部图形
    if label == "首页":
        draw.rectangle([cx-10, cy-10, cx+10, cy+10], fill=COLORS['white'])
    elif label == "教练":
        draw.ellipse([cx-10, cy-10, cx+10, cy+10], fill=COLORS['white'])
    elif label == "订单":
        draw.rectangle([cx-8, cy-12, cx+8, cy+12], fill=COLORS['white'])
    else:  # 我的
        draw.ellipse([cx-10, cy-12, cx+10, cy+2], fill=COLORS['white'])
        draw.ellipse([cx-12, cy+5, cx+12, cy+15], fill=COLORS['white'])

for normal, active, label in tab_icons:
    create_image(normal, (81, 81), lambda d, s, l=label: draw_tab_icon_normal(d, s, l))
    create_image(active, (81, 81), lambda d, s, l=label: draw_tab_icon_active(d, s, l))

print("\n所有图片创建完成!")
