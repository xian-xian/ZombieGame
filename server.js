const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const NAV_CELL = 40;
const NAV_COLS = Math.ceil(GAME_WIDTH / NAV_CELL);
const NAV_ROWS = Math.ceil(GAME_HEIGHT / NAV_CELL);
const CORNER_RADIUS = 16;

const ATTACK_DURATION = 800;  
const ATTACK_COOLDOWN = 1200; 
const BOSS_SHOOT_COOLDOWN = 3500;
const MAX_BOSS_COUNT = 3;
const BOSS_SPAWN_INTERVAL = 12000;

// 各關卡目標配額
const LEVEL1_TARGET_KILLS = 20;
const LEVEL2_TARGET_ZOMBIES = 40;
const LEVEL2_TARGET_BOSSES = 5;
const LEVEL3_TARGET_ZOMBIES = 40;
const LEVEL3_TARGET_BOSSES = 5;

const ZOMBIE_SPEED = 1.3;     
const BOSS_SPEED = 1.15;

const MIN_BODY_DIST = 58;     
const ATTACK_RANGE = 64;      

const REVIVE_DIST = 55;        
const REVIVE_TIME_REQ = 2000;  

let zombieIdCounter = 1;

// 地圖 1 障礙物
const MAZE1_WALLS = [
    { x: 144, y: 65, width: 49, height: 318 },
    { x: 191, y: 75, width: 169, height: 72 },
    { x: 446, y: 65, width: 51, height: 308 },
    { x: 351, y: 282, width: 139, height: 97 },
    { x: 1, y: -1, width: 27, height: 1051 },
    { x: 1, y: 1000, width: 192, height: 80 },
    { x: 34, y: 455, width: 161, height: 99 },
    { x: 144, y: 632, width: 47, height: 264 },
    { x: 347, y: 457, width: 57, height: 446 },
    { x: 186, y: 806, width: 165, height: 88 },
    { x: 602, y: 69, width: 49, height: 325 },
    { x: 647, y: 71, width: 179, height: 95 },
    { x: 590, y: 966, width: 59, height: 112 },
    { x: 590, y: 630, width: 59, height: 271 },
    { x: 647, y: 628, width: 177, height: 99 },
    { x: 769, y: 793, width: 53, height: 245 },
    { x: 826, y: 793, width: 158, height: 65 },
    { x: 934, y: 858, width: 55, height: 220 },
    { x: 598, y: 455, width: 340, height: 97 },
    { x: 934, y: 276, width: 57, height: 451 },
    { x: 934, y: -1, width: 52, height: 175 },
    { x: 1098, y: -1, width: 57, height: 169 },
    { x: 1098, y: 278, width: 70, height: 283 },
    { x: 1252, y: 69, width: 370, height: 105 },
    { x: 1729, y: 1, width: 49, height: 167 },
    { x: 1888, y: 1, width: 29, height: 382 },
    { x: 1295, y: 280, width: 44, height: 437 },
    { x: 1109, y: 630, width: 230, height: 83 },
    { x: 1113, y: 799, width: 226, height: 78 },
    { x: 1124, y: 852, width: 23, height: 148 },
    { x: 1392, y: 278, width: 384, height: 89 },
    { x: 1390, y: 282, width: 46, height: 794 },
    { x: 1113, y: 852, width: 44, height: 165 },
    { x: 1563, y: 462, width: 50, height: 274 },
    { x: 1603, y: 459, width: 316, height: 95 },
    { x: 1890, y: 542, width: 25, height: 536 },
    { x: 1554, y: 991, width: 355, height: 89 },
    { x: 1432, y: 808, width: 348, height: 90 },
    { x: 1723, y: 628, width: 55, height: 188 }
];

// 地圖 2 障礙物
const MAZE2_WALLS = [
    {
        points: [
            { x: 831, y: 494 }, { x: 832, y: 223 }, { x: 795, y: 203 },
            { x: 759, y: 216 }, { x: 760, y: 232 }, { x: 541, y: 231 },
            { x: 540, y: 214 }, { x: 496, y: 203 }, { x: 467, y: 216 },
            { x: 464, y: 410 }, { x: 514, y: 408 }, { x: 522, y: 397 },
            { x: 529, y: 305 }, { x: 763, y: 305 }, { x: 761, y: 494 }
        ]
    },
    { x: -24, y: -37, width: 502, height: 76 },
    { x: 1137, y: -18, width: 804, height: 56 },
    { points: [{ x: -20, y: 221 }, { x: 0, y: 208 }, { x: 61, y: 63 }, { x: 84, y: 63 }, { x: 93, y: 39 }, { x: -8, y: -29 }] },
    { points: [{ x: 1945, y: 192 }, { x: 1919, y: 173 }, { x: 1877, y: 63 }, { x: 1858, y: 63 }, { x: 1847, y: 34 }, { x: 1946, y: -56 }, { x: 2011, y: 142 }] },
    { points: [{ x: 1359, y: 1081 }, { x: 1355, y: 1051 }, { x: 1345, y: 1051 }, { x: 1338, y: 1018 }, { x: 1345, y: 967 }, { x: 1385, y: 959 }, { x: 1415, y: 965 }, { x: 1423, y: 1004 }, { x: 1418, y: 1039 }, { x: 1426, y: 1089 }, { x: 1359, y: 1098 }] },
    { points: [{ x: 1542, y: 853 }, { x: 1604, y: 853 }, { x: 1605, y: 859 }, { x: 1957, y: 858 }, { x: 1925, y: 936 }, { x: 1606, y: 935 }, { x: 1604, y: 943 }, { x: 1541, y: 943 }, { x: 1532, y: 903 }] },
    { x: 826, y: -1, width: 44, height: 52 },
    { x: 751, y: -23, width: 126, height: 30 },
    { points: [{ x: 1046, y: 72 }, { x: 1065, y: 62 }, { x: 1093, y: 62 }, { x: 1110, y: 74 }, { x: 1110, y: 137 }, { x: 1092, y: 148 }, { x: 1065, y: 148 }, { x: 1046, y: 139 }] },
    { points: [{ x: 1477, y: 326 }, { x: 1929, y: 326 }, { x: 1949, y: 723 }, { x: 1919, y: 722 }, { x: 1829, y: 722 }, { x: 1819, y: 693 }, { x: 1828, y: 659 }, { x: 1926, y: 659 }, { x: 1928, y: 508 }, { x: 1920, y: 503 }, { x: 1887, y: 400 }, { x: 1542, y: 400 }, { x: 1553, y: 462 }, { x: 1546, y: 502 }, { x: 1493, y: 502 }, { x: 1469, y: 371 }] },
    { points: [{ x: 1755, y: 687 }, { x: 1747, y: 734 }, { x: 1680, y: 734 }, { x: 1677, y: 723 }, { x: 1531, y: 723 }, { x: 1513, y: 612 }, { x: 1519, y: 583 }, { x: 1571, y: 583 }, { x: 1585, y: 659 }, { x: 1677, y: 659 }, { x: 1676, y: 649 }, { x: 1718, y: 640 }, { x: 1746, y: 648 }] },
    { points: [{ x: -1, y: 561 }, { x: 43, y: 570 }, { x: 49, y: 578 }, { x: 284, y: 580 }, { x: 289, y: 569 }, { x: 359, y: 570 }, { x: 369, y: 620 }, { x: 358, y: 656 }, { x: 345, y: 656 }, { x: 318, y: 758 }, { x: 324, y: 779 }, { x: 312, y: 822 }, { x: 241, y: 822 }, { x: 231, y: 777 }, { x: 241, y: 731 }, { x: 256, y: 730 }, { x: 280, y: 643 }, { x: 47, y: 642 }, { x: 24, y: 645 }, { x: 16, y: 657 }, { x: -14, y: 656 }] },
    { points: [{ x: 545, y: 776 }, { x: 594, y: 776 }, { x: 600, y: 814 }, { x: 567, y: 988 }, { x: 571, y: 1013 }, { x: 563, y: 1051 }, { x: 553, y: 1051 }, { x: 547, y: 1088 }, { x: 479, y: 1089 }, { x: 481, y: 1079 }, { x: 490, y: 1035 }, { x: 484, y: 1004 }, { x: 492, y: 963 }, { x: 505, y: 960 }] },
    { points: [{ x: 1392, y: 689 }, { x: 1390, y: 649 }, { x: 1359, y: 640 }, { x: 1322, y: 648 }, { x: 1322, y: 656 }, { x: 1114, y: 658 }, { x: 1114, y: 649 }, { x: 1105, y: 646 }, { x: 1105, y: 584 }, { x: 1113, y: 584 }, { x: 1113, y: 497 }, { x: 1079, y: 486 }, { x: 1044, y: 495 }, { x: 1043, y: 534 }, { x: 1043, y: 582 }, { x: 1051, y: 582 }, { x: 1051, y: 646 }, { x: 1042, y: 650 }, { x: 1043, y: 734 }, { x: 1112, y: 734 }, { x: 1113, y: 723 }, { x: 1319, y: 723 }, { x: 1319, y: 735 }, { x: 1389, y: 735 }] },
    { points: [{ x: 1365, y: 581 }, { x: 1418, y: 582 }, { x: 1420, y: 559 }, { x: 1418, y: 513 }, { x: 1422, y: 513 }, { x: 1424, y: 460 }, { x: 1420, y: 424 }, { x: 1411, y: 420 }, { x: 1404, y: 317 }, { x: 1406, y: 314 }, { x: 1410, y: 254 }, { x: 1407, y: 215 }, { x: 1375, y: 203 }, { x: 1336, y: 215 }, { x: 1335, y: 230 }, { x: 1113, y: 231 }, { x: 1112, y: 216 }, { x: 1079, y: 202 }, { x: 1042, y: 216 }, { x: 1042, y: 320 }, { x: 1051, y: 320 }, { x: 1051, y: 387 }, { x: 1042, y: 391 }, { x: 1042, y: 416 }, { x: 1111, y: 416 }, { x: 1112, y: 393 }, { x: 1105, y: 389 }, { x: 1106, y: 321 }, { x: 1112, y: 321 }, { x: 1114, y: 306 }, { x: 1334, y: 306 }, { x: 1335, y: 320 }, { x: 1347, y: 320 }, { x: 1354, y: 420 }, { x: 1349, y: 424 }, { x: 1347, y: 490 }, { x: 1350, y: 515 }, { x: 1360, y: 516 }] },
    { points: [{ x: -1, y: 292 }, { x: 17, y: 292 }, { x: 26, y: 326 }, { x: -2, y: 397 }, { x: -69, y: 341 }] },
    { points: [{ x: 936, y: 148 }, { x: 971, y: 162 }, { x: 971, y: 257 }, { x: 963, y: 256 }, { x: 962, y: 281 }, { x: 971, y: 285 }, { x: 971, y: 306 }, { x: 900, y: 306 }, { x: 901, y: 286 }, { x: 911, y: 281 }, { x: 911, y: 258 }, { x: 901, y: 257 }, { x: 901, y: 161 }] },
    { points: [{ x: 936, y: 590 }, { x: 902, y: 600 }, { x: 903, y: 685 }, { x: 910, y: 685 }, { x: 910, y: 773 }, { x: 902, y: 776 }, { x: 902, y: 863 }, { x: 971, y: 862 }, { x: 971, y: 776 }, { x: 963, y: 772 }, { x: 963, y: 684 }, { x: 971, y: 684 }, { x: 970, y: 599 }] },
    { points: [{ x: 919, y: 391 }, { x: 953, y: 391 }, { x: 971, y: 404 }, { x: 972, y: 467 }, { x: 954, y: 478 }, { x: 921, y: 478 }, { x: 901, y: 466 }, { x: 902, y: 406 }] },
    { points: [{ x: 1062, y: 775 }, { x: 1090, y: 775 }, { x: 1105, y: 784 }, { x: 1259, y: 784 }, { x: 1261, y: 818 }, { x: 1257, y: 863 }, { x: 1104, y: 863 }, { x: 1104, y: 853 }, { x: 1091, y: 863 }, { x: 1062, y: 863 }, { x: 1044, y: 851 }, { x: 1044, y: 788 }] },
    { points: [{ x: 1064, y: 991 }, { x: 1091, y: 991 }, { x: 1108, y: 1004 }, { x: 1108, y: 1069 }, { x: 1086, y: 1088 }, { x: 1060, y: 1080 }, { x: 1045, y: 1070 }, { x: 1046, y: 1005 }] },
    { points: [{ x: 749, y: 775 }, { x: 774, y: 775 }, { x: 793, y: 786 }, { x: 796, y: 850 }, { x: 777, y: 863 }, { x: 749, y: 863 }, { x: 733, y: 851 }, { x: 730, y: 788 }] },
    { points: [{ x: 731, y: 992 }, { x: 758, y: 992 }, { x: 775, y: 1003 }, { x: 780, y: 1068 }, { x: 757, y: 1092 }, { x: 729, y: 1080 }, { x: 715, y: 1069 }, { x: 712, y: 1005 }] },
    { points: [{ x: 548, y: 61 }, { x: 574, y: 61 }, { x: 591, y: 72 }, { x: 597, y: 128 }, { x: 593, y: 142 }, { x: 575, y: 149 }, { x: 549, y: 149 }, { x: 533, y: 141 }, { x: 526, y: 83 }, { x: 529, y: 72 }] },
    { points: [{ x: 685, y: 63 }, { x: 712, y: 63 }, { x: 731, y: 72 }, { x: 735, y: 136 }, { x: 716, y: 150 }, { x: 684, y: 149 }, { x: 672, y: 140 }, { x: 666, y: 84 }, { x: 667, y: 73 }] },
    { points: [{ x: 498, y: 544 }, { x: 550, y: 544 }, { x: 557, y: 581 }, { x: 550, y: 646 }, { x: 556, y: 649 }, { x: 555, y: 657 }, { x: 760, y: 657 }, { x: 760, y: 650 }, { x: 768, y: 646 }, { x: 770, y: 601 }, { x: 822, y: 600 }, { x: 823, y: 644 }, { x: 832, y: 646 }, { x: 831, y: 735 }, { x: 762, y: 736 }, { x: 762, y: 723 }, { x: 556, y: 723 }, { x: 556, y: 734 }, { x: 486, y: 736 }, { x: 479, y: 690 }, { x: 483, y: 649 }, { x: 489, y: 645 }] },
    { x: 751, y: -13, width: 90, height: 52 }
];

// 地圖 3 障礙物
const MAZE3_WALLS = [
    { x: 128, y: 646, width: 96, height: 146 },
    { x: 161, y: 82, width: 66, height: 285 },
    { x: 479, y: 93, width: 78, height: 162 },
    { x: 729, y: 14, width: 369, height: 117 },
    { x: 849, y: 53, width: 226, height: 50 },
    { x: 1359, y: 72, width: 69, height: 181 },
    { x: 1627, y: 96, width: 127, height: 99 },
    { x: 1707, y: 210, width: 56, height: 183 },
    { x: 1733, y: 638, width: 68, height: 57 },
    {
        points: [
            { x: 1753, y: 651 },
            { x: 1734, y: 704 },
            { x: 1789, y: 771 }
        ]
    },
    {
        points: [
            { x: 1386, y: 871 }, { x: 1365, y: 883 }, { x: 1362, y: 921 },
            { x: 1367, y: 977 }, { x: 1362, y: 991 }, { x: 1375, y: 1020 },
            { x: 1420, y: 1021 }, { x: 1440, y: 1004 }, { x: 1741, y: 1003 },
            { x: 1758, y: 1018 }, { x: 1802, y: 1019 }, { x: 1813, y: 1007 },
            { x: 1820, y: 981 }, { x: 1811, y: 934 }, { x: 1817, y: 902 },
            { x: 1818, y: 883 }, { x: 1784, y: 861 }, { x: 1785, y: 778 },
            { x: 1807, y: 754 }, { x: 1805, y: 643 }, { x: 1777, y: 626 },
            { x: 1748, y: 630 }, { x: 1733, y: 637 }, { x: 1731, y: 584 },
            { x: 1710, y: 583 }, { x: 1707, y: 680 }, { x: 1662, y: 681 },
            { x: 1661, y: 698 }, { x: 1654, y: 707 }, { x: 1652, y: 780 },
            { x: 1673, y: 799 }, { x: 1686, y: 798 }, { x: 1690, y: 920 },
            { x: 1677, y: 921 }, { x: 1677, y: 900 }, { x: 1602, y: 900 },
            { x: 1601, y: 921 }, { x: 1570, y: 921 }, { x: 1569, y: 901 },
            { x: 1494, y: 900 }, { x: 1492, y: 922 }, { x: 1481, y: 921 },
            { x: 1481, y: 901 }, { x: 1439, y: 900 }, { x: 1440, y: 886 },
            { x: 1422, y: 869 }
        ]
    }
];

function distSqToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return (px - x1) ** 2 + (py - y1) ** 2;
    let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
}

function pointInPolygon(px, py, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function checkWallCollision(x, y, radius, walls) {
    for (let w of walls) {
        if (w.points && w.points.length >= 3) {
            if (pointInPolygon(x, y, w.points)) return true;
            const rSq = radius * radius;
            for (let i = 0, j = w.points.length - 1; i < w.points.length; j = i++) {
                if (distSqToSegment(x, y, w.points[i].x, w.points[i].y, w.points[j].x, w.points[j].y) < rSq) return true;
            }
        } else if (w.width) {
            const cr = Math.min(CORNER_RADIUS, w.width / 2, w.height / 2);
            const innerMinX = w.x + cr, innerMaxX = w.x + w.width - cr;
            const innerMinY = w.y + cr, innerMaxY = w.y + w.height - cr;
            const closestX = Math.max(innerMinX, Math.min(x, innerMaxX));
            const closestY = Math.max(innerMinY, Math.min(y, innerMaxY));
            const dx = x - closestX, dy = y - closestY;
            const totalRadius = radius + cr;
            if ((dx * dx + dy * dy) < (totalRadius * totalRadius)) return true;
        }
    }
    return false;
}

function isPointInWall(x, y, walls) {
    for (let w of walls) {
        if (w.points && w.points.length >= 3) {
            if (pointInPolygon(x, y, w.points)) return true;
        } else if (w.width) {
            const cr = Math.min(CORNER_RADIUS, w.width / 2, w.height / 2);
            const innerMinX = w.x + cr, innerMaxX = w.x + w.width - cr;
            const innerMinY = w.y + cr, innerMaxY = w.y + w.height - cr;
            const closestX = Math.max(innerMinX, Math.min(x, innerMaxX));
            const closestY = Math.max(innerMinY, Math.min(y, innerMaxY));
            const dx = x - closestX, dy = y - closestY;
            if ((dx * dx + dy * dy) <= (cr * cr)) return true;
        }
    }
    return false;
}

function setupPresetBarrels(room, count = 12) {
    room.barrels = [];
    const BARREL_RADIUS = 25;

    let seeds = [];
    if (room.id === 'map3') {
        seeds = [
            { x: 340, y: 380 }, { x: 620, y: 340 }, { x: 960, y: 280 },
            { x: 1240, y: 360 }, { x: 380, y: 560 }, { x: 680, y: 580 },
            { x: 960, y: 640 }, { x: 1260, y: 600 }, { x: 340, y: 820 },
            { x: 660, y: 840 }, { x: 960, y: 880 }, { x: 1220, y: 840 }
        ];
    } else if (room.id === 'map2') {
        seeds = [
            { x: 320, y: 160 }, { x: 650, y: 160 }, { x: 1250, y: 250 },
            { x: 260, y: 460 }, { x: 680, y: 440 }, { x: 1260, y: 480 },
            { x: 1680, y: 460 }, { x: 260, y: 720 }, { x: 650, y: 820 },
            { x: 1160, y: 920 }, { x: 1450, y: 760 }, { x: 1660, y: 780 }
        ];
    } else {
        seeds = [
            { x: 300, y: 220 }, { x: 740, y: 220 }, { x: 1200, y: 200 },
            { x: 1500, y: 220 }, { x: 260, y: 550 }, { x: 780, y: 550 },
            { x: 1240, y: 550 }, { x: 1700, y: 550 }, { x: 300, y: 880 },
            { x: 720, y: 880 }, { x: 1220, y: 880 }, { x: 1600, y: 880 }
        ];
    }

    for (let i = 0; i < count; i++) {
        let placed = false;
        if (i < seeds.length) {
            let s = seeds[i];
            if (!checkWallCollision(s.x, s.y, BARREL_RADIUS, room.walls)) {
                room.barrels.push({
                    id: 'barrel_' + (zombieIdCounter++),
                    x: s.x, y: s.y,
                    hp: 2, maxHp: 2,
                    radius: BARREL_RADIUS
                });
                placed = true;
            }
        }

        if (!placed) {
            let rndPos = getRandomWalkablePos(room, BARREL_RADIUS + 4);
            if (rndPos) {
                room.barrels.push({
                    id: 'barrel_' + (zombieIdCounter++),
                    x: rndPos.x, y: rndPos.y,
                    hp: 2, maxHp: 2,
                    radius: BARREL_RADIUS
                });
            }
        }
    }
}

function createMapRoom(mapId, mapName, bgFile, wallsData, defaultSpawn) {
    const room = {
        id: mapId,
        name: mapName,
        bg: bgFile,
        walls: wallsData,
        defaultSpawn: defaultSpawn,
        players: {},
        zombies: [],
        bullets: [],
        bossBullets: [],
        items: [],
        barrels: [],
        grenades: [],
        score: 0,
        navGrid: [],
        flowFieldDist: [],
        lastZombieSpawn: 0,
        lastBossSpawn: 0,
        lastItemSpawn: 0,
        debugMode: false,
        gameOverTriggered: false,
        level: 1,
        level1Spawned: 0,
        level1Killed: 0,
        level2ZombiesSpawned: 0,
        level2ZombiesKilled: 0,
        level2BossesSpawned: 0,
        level2BossesKilled: 0,
        level3ZombiesSpawned: 0,
        level3ZombiesKilled: 0,
        level3BossesSpawned: 0,
        level3BossesKilled: 0,
        levelTransition: false
    };

    for (let r = 0; r < NAV_ROWS; r++) {
        room.navGrid[r] = [];
        for (let c = 0; c < NAV_COLS; c++) {
            const cx = c * NAV_CELL + NAV_CELL / 2;
            const cy = r * NAV_CELL + NAV_CELL / 2;
            room.navGrid[r][c] = checkWallCollision(cx, cy, 12, room.walls) ? 1 : 0;
        }
    }

    setupPresetBarrels(room, 12);
    return room;
}

const ROOMS = {
    'map1': createMapRoom('map1', '地下管道迷宮', 'maze.png', MAZE1_WALLS, { x: 1040, y: 515 }),
    'map2': createMapRoom('map2', '廢棄要塞碉堡', 'maze2.png', MAZE2_WALLS, { x: 1740, y: 530 }),
    'map3': createMapRoom('map3', '感染核心隔離區', 'maze3.png', MAZE3_WALLS, { x: 960, y: 540 })
};

function hasLineOfSight(x1, y1, x2, y2, walls) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 20);
    if (steps <= 1) return true;
    const stepX = (x2 - x1) / steps, stepY = (y2 - y1) / steps;
    let cx = x1, cy = y1;
    for (let i = 1; i < steps; i++) {
        cx += stepX; cy += stepY;
        if (checkWallCollision(cx, cy, 18, walls)) return false;
    }
    return true;
}

function updateRoomFlowField(room) {
    room.flowFieldDist = Array.from({ length: NAV_ROWS }, () => Array(NAV_COLS).fill(Infinity));
    const queue = [];

    for (let id in room.players) {
        let p = room.players[id];
        if (p.isDead) continue;
        let c = Math.max(0, Math.min(NAV_COLS - 1, Math.floor(p.x / NAV_CELL)));
        let r = Math.max(0, Math.min(NAV_ROWS - 1, Math.floor(p.y / NAV_CELL)));
        room.flowFieldDist[r][c] = 0;
        queue.push({ r, c });
    }

    if (queue.length === 0) return;

    const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    let head = 0;
    while (head < queue.length) {
        const { r, c } = queue[head++];
        const curDist = room.flowFieldDist[r][c];

        for (let d of dirs) {
            const nr = r + d.dr, nc = c + d.dc;
            if (nr >= 0 && nr < NAV_ROWS && nc >= 0 && nc < NAV_COLS) {
                if (room.navGrid[nr][nc] === 1) continue;
                if (curDist + 1 < room.flowFieldDist[nr][nc]) {
                    room.flowFieldDist[nr][nc] = curDist + 1;
                    queue.push({ r: nr, c: nc });
                }
            }
        }
    }
}

function getRandomWalkablePos(room, radius = 25) {
    for (let attempt = 0; attempt < 50; attempt++) {
        let rx = 80 + Math.random() * (GAME_WIDTH - 160);
        let ry = 80 + Math.random() * (GAME_HEIGHT - 160);
        if (!checkWallCollision(rx, ry, radius, room.walls)) return { x: rx, y: ry };
    }
    return null;
}

function getBoundarySpawnPos(room, radius = 18) {
    for (let attempt = 0; attempt < 80; attempt++) {
        const side = Math.floor(Math.random() * 4);
        let x, y, testInsideX, testInsideY;

        if (side === 0) {
            x = 60 + Math.random() * (GAME_WIDTH - 120);
            y = -35;
            testInsideX = x; testInsideY = 35;
        } else if (side === 1) {
            x = 60 + Math.random() * (GAME_WIDTH - 120);
            y = GAME_HEIGHT + 35;
            testInsideX = x; testInsideY = GAME_HEIGHT - 35;
        } else if (side === 2) {
            x = -35;
            y = 60 + Math.random() * (GAME_HEIGHT - 120);
            testInsideX = 35; testInsideY = y;
        } else {
            x = GAME_WIDTH + 35;
            y = 60 + Math.random() * (GAME_HEIGHT - 120);
            testInsideX = GAME_WIDTH - 35; testInsideY = y;
        }

        if (!checkWallCollision(x, y, radius, room.walls) &&
            !checkWallCollision(testInsideX, testInsideY, radius, room.walls)) {
            return { x, y };
        }
    }

    const candidates = [];
    for (let x = 60; x <= GAME_WIDTH - 60; x += 40) {
        if (!checkWallCollision(x, -35, radius, room.walls) && !checkWallCollision(x, 35, radius, room.walls)) candidates.push({ x, y: -35 });
        if (!checkWallCollision(x, GAME_HEIGHT + 35, radius, room.walls) && !checkWallCollision(x, GAME_HEIGHT - 35, radius, room.walls)) candidates.push({ x, y: GAME_HEIGHT + 35 });
    }
    for (let y = 60; y <= GAME_HEIGHT - 60; y += 40) {
        if (!checkWallCollision(-35, y, radius, room.walls) && !checkWallCollision(35, y, radius, room.walls)) candidates.push({ x, y: -35 });
        if (!checkWallCollision(GAME_WIDTH + 35, y, radius, room.walls) && !checkWallCollision(GAME_WIDTH - 35, y, radius, room.walls)) candidates.push({ x, y: GAME_WIDTH + 35 });
    }

    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    return { x: 960, y: -35 };
}

function spawnBossEntity(room, x, y) {
    return {
        id: 'boss_' + (zombieIdCounter++),
        isBoss: true,
        x: x || 960,
        y: y || -35,
        vx: 0,
        vy: 0,
        speed: BOSS_SPEED,
        hp: 9,
        maxHp: 9,
        radius: 18,
        lastAttackTime: 0,
        lastShootTime: 0,
        burstTotal: 1,
        burstFired: 0,
        lastBurstTime: 0,
        lastHitTime: 0,
        lastShotgunHitTime: 0,
        isAttacking: false,
        attackFrame: 0,
        attackDir: 'down',
        walkDir: 'down',
        facingLeft: false
    };
}

function explodeBarrel(room, barrel, now) {
    if (barrel._dead) return;
    barrel._dead = true;
    const EXP_RADIUS = 145;
    const EXP_DAMAGE_ZOMBIE = 4;
    const EXP_DAMAGE_PLAYER = 20;

    io.to(room.id).emit('barrelExploded', { x: barrel.x, y: barrel.y, radius: EXP_RADIUS });

    for (let i = room.zombies.length - 1; i >= 0; i--) {
        let z = room.zombies[i];
        let d = Math.hypot(z.x - barrel.x, z.y - barrel.y);
        if (d <= EXP_RADIUS) {
            z.hp -= EXP_DAMAGE_ZOMBIE;
            z.lastHitTime = now;

            let angle = Math.atan2(z.y - barrel.y, z.x - barrel.x);
            let pushDist = 38;
            let nx = z.x + Math.cos(angle) * pushDist;
            let ny = z.y + Math.sin(angle) * pushDist;
            if (!checkWallCollision(nx, ny, z.radius || 18, room.walls)) {
                z.x = nx; z.y = ny;
            }

            if (z.hp <= 0) {
                room.zombies.splice(i, 1);
                room.score += z.isBoss ? 100 : 30;
                if (room.level === 1) {
                    room.level1Killed = (room.level1Killed || 0) + 1;
                } else if (room.level === 2) {
                    if (z.isBoss) room.level2BossesKilled = (room.level2BossesKilled || 0) + 1;
                    else room.level2ZombiesKilled = (room.level2ZombiesKilled || 0) + 1;
                } else if (room.level === 3) {
                    if (z.isBoss) room.level3BossesKilled = (room.level3BossesKilled || 0) + 1;
                    else room.level3ZombiesKilled = (room.level3ZombiesKilled || 0) + 1;
                }
            }
        }
    }

    for (let id in room.players) {
        let p = room.players[id];
        if (p.isDead) continue;
        let d = Math.hypot(p.x - barrel.x, p.y - barrel.y);
        if (d <= EXP_RADIUS) {
            p.hp = Math.max(0, p.hp - EXP_DAMAGE_PLAYER);
            p.lastKnockbackTime = now;

            let angle = Math.atan2(p.y - barrel.y, p.x - barrel.x);
            let pushDist = 32;
            let nx = p.x + Math.cos(angle) * pushDist;
            let ny = p.y + Math.sin(angle) * pushDist;
            if (!checkWallCollision(nx, ny, 17, room.walls)) {
                p.x = nx; p.y = ny;
            }

            if (p.hp <= 0) {
                p.hp = 0;
                if (!p.isDead) { p.isDead = true; p.deathTime = now; }
            }
        }
    }

    for (let other of room.barrels) {
        if (other !== barrel && !other._dead) {
            if (Math.hypot(other.x - barrel.x, other.y - barrel.y) <= EXP_RADIUS) {
                other.hp = 0;
                explodeBarrel(room, other, now);
            }
        }
    }
}

function explodeGrenade(room, grenade, now) {
    if (grenade._dead) return;
    grenade._dead = true;
    const EXP_RADIUS = 180;
    const EXP_DAMAGE_ZOMBIE = 6;
    const EXP_DAMAGE_PLAYER = 25;

    io.to(room.id).emit('grenadeExploded', { x: grenade.x, y: grenade.y, radius: EXP_RADIUS });

    for (let i = room.zombies.length - 1; i >= 0; i--) {
        let z = room.zombies[i];
        let d = Math.hypot(z.x - grenade.x, z.y - grenade.y);
        if (d <= EXP_RADIUS) {
            z.hp -= EXP_DAMAGE_ZOMBIE;
            z.lastHitTime = now;

            let angle = Math.atan2(z.y - grenade.y, z.x - grenade.x);
            let pushDist = 45;
            let nx = z.x + Math.cos(angle) * pushDist;
            let ny = z.y + Math.sin(angle) * pushDist;
            if (!checkWallCollision(nx, ny, z.radius || 18, room.walls)) {
                z.x = nx; z.y = ny;
            }

            if (z.hp <= 0) {
                room.zombies.splice(i, 1);
                room.score += z.isBoss ? 100 : 30;
                if (room.level === 1) {
                    room.level1Killed = (room.level1Killed || 0) + 1;
                } else if (room.level === 2) {
                    if (z.isBoss) room.level2BossesKilled = (room.level2BossesKilled || 0) + 1;
                    else room.level2ZombiesKilled = (room.level2ZombiesKilled || 0) + 1;
                } else if (room.level === 3) {
                    if (z.isBoss) room.level3BossesKilled = (room.level3BossesKilled || 0) + 1;
                    else room.level3ZombiesKilled = (room.level3ZombiesKilled || 0) + 1;
                }
            }
        }
    }

    for (let id in room.players) {
        let p = room.players[id];
        if (p.isDead) continue;
        let d = Math.hypot(p.x - grenade.x, p.y - grenade.y);
        if (d <= EXP_RADIUS) {
            p.hp = Math.max(0, p.hp - EXP_DAMAGE_PLAYER);
            p.lastKnockbackTime = now;

            let angle = Math.atan2(p.y - grenade.y, p.x - grenade.x);
            let pushDist = 40;
            let nx = p.x + Math.cos(angle) * pushDist;
            let ny = p.y + Math.sin(angle) * pushDist;
            if (!checkWallCollision(nx, ny, 17, room.walls)) {
                p.x = nx; p.y = ny;
            }

            if (p.hp <= 0) {
                p.hp = 0;
                if (!p.isDead) { p.isDead = true; p.deathTime = now; }
            }
        }
    }

    for (let br of room.barrels) {
        if (!br._dead && Math.hypot(br.x - grenade.x, br.y - grenade.y) <= EXP_RADIUS) {
            br.hp = 0;
            explodeBarrel(room, br, now);
        }
    }
}

io.on('connection', (socket) => {
    let currentMapId = null;

    socket.on('joinGame', (data) => {
        let mapId = 'map1';
        let wantDebug = false;

        if (typeof data === 'string') mapId = data;
        else if (data && data.mapId) {
            mapId = data.mapId;
            wantDebug = !!data.isDebug;
        }

        if (!ROOMS[mapId]) mapId = 'map1';
        currentMapId = mapId;
        socket.join(mapId);

        const room = ROOMS[mapId];
        if (wantDebug) {
            room.debugMode = true;
            room.zombies = [];
            room.bossBullets = [];
            room.barrels = [];
            room.grenades = [];
        }

        const hasAlive = Object.values(room.players).some(p => !p.isDead);
        if (!hasAlive) {
            room.zombies = [];
            room.bullets = [];
            room.bossBullets = [];
            room.items = [];
            room.grenades = [];
            setupPresetBarrels(room, 12);
            room.score = 0;
            room.gameOverTriggered = false;
            room.level = 1;
            room.level1Spawned = 0;
            room.level1Killed = 0;
            room.level2ZombiesSpawned = 0;
            room.level2ZombiesKilled = 0;
            room.level2BossesSpawned = 0;
            room.level2BossesKilled = 0;
            room.level3ZombiesSpawned = 0;
            room.level3ZombiesKilled = 0;
            room.level3BossesSpawned = 0;
            room.level3BossesKilled = 0;
            room.levelTransition = false;
        }

        room.players[socket.id] = {
            id: socket.id,
            x: room.defaultSpawn.x,
            y: room.defaultSpawn.y,
            hp: 100,
            isDead: false,
            deathTime: 0,
            dirX: 0,
            dirY: -1,
            keys: { up: false, down: false, left: false, right: false },
            lastKnockbackTime: 0,
            reviveProgress: 0
        };

        socket.emit('gameInit', {
            mapId: room.id,
            mapName: room.name,
            bg: room.bg,
            walls: room.walls,
            debugMode: room.debugMode,
            level: room.level
        });
    });

    socket.on('toggleDebugMode', () => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        const room = ROOMS[currentMapId];
        room.debugMode = !room.debugMode;

        if (room.debugMode) {
            room.zombies = [];
            room.bossBullets = [];
            room.barrels = [];
            room.grenades = [];
            for (let id in room.players) {
                room.players[id].hp = 100;
                room.players[id].isDead = false;
                room.players[id].reviveProgress = 0;
            }
        }
        io.to(currentMapId).emit('debugModeChanged', room.debugMode);
    });

    socket.on('adminSetLevel', (targetLvl) => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        const room = ROOMS[currentMapId];
        const lvl = parseInt(targetLvl);
        if (lvl < 1 || lvl > 4) return;

        room.level = lvl;
        room.levelTransition = false;
        room.zombies = [];
        room.bullets = [];
        room.bossBullets = [];
        room.grenades = [];

        if (lvl === 1) {
            room.level1Spawned = 0;
            room.level1Killed = 0;
        } else if (lvl === 2) {
            room.level2ZombiesSpawned = 0;
            room.level2ZombiesKilled = 0;
            room.level2BossesSpawned = 1;
            room.level2BossesKilled = 0;
        } else if (lvl === 3) {
            room.level3ZombiesSpawned = 0;
            room.level3ZombiesKilled = 0;
            room.level3BossesSpawned = 1;
            room.level3BossesKilled = 0;
        }

        for (let pid in room.players) {
            let p = room.players[pid];
            p.isDead = false;
            p.hp = 100;
            p.deathTime = 0;
            p.reviveProgress = 0;
        }

        setupPresetBarrels(room, 12);

        if (lvl >= 2) {
            const bossSpawnPos = getBoundarySpawnPos(room, 20);
            room.zombies.push(spawnBossEntity(room, bossSpawnPos.x, bossSpawnPos.y));
            room.lastBossSpawn = Date.now();
        }

        io.to(currentMapId).emit('levelStart', {
            level: lvl,
            message: `🛠️ [測試] 已手動切換至 LEVEL ${lvl}！`
        });
    });

    socket.on('playerInput', (keys) => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        let p = ROOMS[currentMapId].players[socket.id];
        if (p && !p.isDead && typeof keys === 'object') {
            p.keys = {
                up: !!keys.up,
                down: !!keys.down,
                left: !!keys.left,
                right: !!keys.right
            };
        }
    });

    socket.on('updateDir', (dir) => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        let p = ROOMS[currentMapId].players[socket.id];
        if (p && !p.isDead) { p.dirX = dir.x; p.dirY = dir.y; }
    });

    socket.on('throwGrenade', (data) => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        const room = ROOMS[currentMapId];
        let p = room.players[socket.id];
        if (!p || p.isDead || !data) return;

        const now = Date.now();
        if (now - (p.lastGrenadeThrowTime || 0) < 1000) return;
        p.lastGrenadeThrowTime = now;

        let dirX = data.dirX || 0, dirY = data.dirY || 0;
        let length = Math.hypot(dirX, dirY);
        if (length === 0) { dirX = 0; dirY = -1; length = 1; }

        let nx = dirX / length, ny = dirY / length;
        let startX = p.x + nx * 24;
        let startY = p.y + ny * 24;

        room.grenades.push({
            id: 'gr_' + (zombieIdCounter++),
            x: startX,
            y: startY,
            vx: nx * 13.5,
            vy: ny * 13.5,
            throwTime: now,
            explodeTime: now + 5000
        });
    });

    socket.on('shoot', (data) => {
        if (!currentMapId || !ROOMS[currentMapId]) return;
        const room = ROOMS[currentMapId];
        let p = room.players[socket.id];
        if (!p || p.isDead || !data) return;

        let dirX = data.dirX || 0, dirY = data.dirY || 0;
        let length = Math.hypot(dirX, dirY);
        if (length === 0) { dirX = 0; dirY = -1; length = 1; }

        let baseAngle = Math.atan2(dirY, dirX);
        let startX = p.x + (dirX / length) * 34;
        let startY = p.y + (dirY / length) * 34;

        if (isPointInWall(startX, startY, room.walls)) return;

        const weaponType = data.weapon || 'pistol';

        if (weaponType === 'shotgun') {
            const spreadAngles = [-0.22, -0.11, 0, 0.11, 0.22];
            const shotId = 'shot_' + Date.now() + '_' + Math.random();

            spreadAngles.forEach(offsetAngle => {
                let finalAngle = baseAngle + offsetAngle;
                let nx = Math.cos(finalAngle);
                let ny = Math.sin(finalAngle);
                let bSpeed = data.speed || 17;

                room.bullets.push({
                    x: startX,
                    y: startY,
                    vx: nx * bSpeed,
                    vy: ny * bSpeed,
                    color: '#ff3d00',
                    weapon: 'shotgun',
                    shotId: shotId,
                    traveled: 0,
                    maxDist: 350
                });
            });
        } else {
            let nx = dirX / length, ny = dirY / length;
            let bSpeed = data.speed || 16;
            let bColor = data.color || '#ffd700';

            room.bullets.push({
                x: startX,
                y: startY,
                vx: nx * bSpeed,
                vy: ny * bSpeed,
                color: bColor,
                weapon: weaponType,
                traveled: 0,
                maxDist: 0
            });
        }
    });

    socket.on('leaveGame', () => {
        if (currentMapId && ROOMS[currentMapId]) {
            delete ROOMS[currentMapId].players[socket.id];
            socket.leave(currentMapId);
            currentMapId = null;
        }
    });

    socket.on('disconnect', () => {
        if (currentMapId && ROOMS[currentMapId]) {
            delete ROOMS[currentMapId].players[socket.id];
        }
    });
});

setInterval(() => {
    for (let m in ROOMS) updateRoomFlowField(ROOMS[m]);
}, 200);

let lastServerPhysicsTime = Date.now();

setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.05, Math.max(0.01, (now - lastServerPhysicsTime) / 1000));
    lastServerPhysicsTime = now;

    for (let mapId in ROOMS) {
        const room = ROOMS[mapId];
        const playerList = Object.values(room.players);
        const totalPlayers = playerList.length;
        const hasAlive = playerList.some(p => !p.isDead);

        // Game Over 檢測
        if (!room.debugMode && totalPlayers > 0 && !hasAlive) {
            if (!room.gameOverTriggered) {
                room.gameOverTriggered = true;
                io.to(mapId).emit('gameOver', { score: room.score });
            }
        } else if (hasAlive) {
            room.gameOverTriggered = false;
        }

        // LEVEL 1 通關判定
        if (room.level === 1 && !room.levelTransition && (room.level1Killed >= LEVEL1_TARGET_KILLS || (room.level1Spawned >= LEVEL1_TARGET_KILLS && room.zombies.length === 0))) {
            room.levelTransition = true;
            io.to(mapId).emit('levelClear', {
                clearedLevel: 1,
                nextLevel: 2,
                delay: 3500
            });

            setTimeout(() => {
                room.level = 2;
                room.levelTransition = false;
                room.zombies = [];
                room.bullets = [];
                room.bossBullets = [];

                for (let pid in room.players) {
                    let p = room.players[pid];
                    p.isDead = false;
                    p.hp = 100;
                    p.deathTime = 0;
                    p.reviveProgress = 0;
                }

                setupPresetBarrels(room, 12);

                const bossSpawnPos = getBoundarySpawnPos(room, 20);
                room.zombies.push(spawnBossEntity(room, bossSpawnPos.x, bossSpawnPos.y));
                room.level2BossesSpawned = 1;
                room.lastBossSpawn = Date.now();

                io.to(mapId).emit('levelStart', {
                    level: 2,
                    message: '🔥 LEVEL 2 展開！擊殺 40 隻小怪與 5 隻 BOSS！'
                });
            }, 3500);
        }

        // LEVEL 2 通關判定
        if (room.level === 2 && !room.levelTransition && 
            (room.level2ZombiesKilled >= LEVEL2_TARGET_ZOMBIES) && 
            (room.level2BossesKilled >= LEVEL2_TARGET_BOSSES)) {
            
            room.levelTransition = true;
            io.to(mapId).emit('levelClear', {
                clearedLevel: 2,
                nextLevel: 3,
                delay: 3500
            });

            setTimeout(() => {
                room.level = 3;
                room.levelTransition = false;
                room.zombies = [];
                room.bullets = [];
                room.bossBullets = [];

                for (let pid in room.players) {
                    let p = room.players[pid];
                    p.isDead = false;
                    p.hp = 100;
                    p.deathTime = 0;
                    p.reviveProgress = 0;
                }

                setupPresetBarrels(room, 12);

                const bossSpawnPos = getBoundarySpawnPos(room, 20);
                room.zombies.push(spawnBossEntity(room, bossSpawnPos.x, bossSpawnPos.y));
                room.level3BossesSpawned = 1;
                room.lastBossSpawn = Date.now();

                io.to(mapId).emit('levelStart', {
                    level: 3,
                    message: '💥 LEVEL 3 戰役展開！消滅 40 隻小怪與 5 隻 BOSS 以前進 LEVEL 4！'
                });
            }, 3500);
        }

        // LEVEL 3 通關判定
        if (room.level === 3 && !room.levelTransition && 
            (room.level3ZombiesKilled >= LEVEL3_TARGET_ZOMBIES) && 
            (room.level3BossesKilled >= LEVEL3_TARGET_BOSSES)) {
            
            room.levelTransition = true;
            io.to(mapId).emit('levelClear', {
                clearedLevel: 3,
                nextLevel: 4,
                delay: 3500
            });

            setTimeout(() => {
                room.level = 4;
                room.levelTransition = false;
                room.zombies = [];
                room.bullets = [];
                room.bossBullets = [];

                for (let pid in room.players) {
                    let p = room.players[pid];
                    p.isDead = false;
                    p.hp = 100;
                    p.deathTime = 0;
                    p.reviveProgress = 0;
                }

                setupPresetBarrels(room, 12);

                const bossSpawnPos = getBoundarySpawnPos(room, 20);
                room.zombies.push(spawnBossEntity(room, bossSpawnPos.x, bossSpawnPos.y));
                room.lastBossSpawn = Date.now();

                io.to(mapId).emit('levelStart', {
                    level: 4,
                    message: '💣 LEVEL 4 終極死鬥展開！已配發 10 顆 5秒定時手榴彈！'
                });
            }, 3500);
        }

        const SPEED_PER_SEC = 330;

        // 1. 玩家移動
        for (let id in room.players) {
            let p = room.players[id];
            if (!p || p.isDead || !p.keys) continue;

            let vx = 0, vy = 0;
            if (p.keys.up) vy -= 1;
            if (p.keys.down) vy += 1;
            if (p.keys.left) vx -= 1;
            if (p.keys.right) vx += 1; // 🌟 已經在此修復！

            if (vx === 0 && vy === 0) continue;

            let moveDistance = SPEED_PER_SEC * dt;
            if (vx !== 0 && vy !== 0) moveDistance *= 0.7071;

            let stepX = vx * moveDistance;
            let stepY = vy * moveDistance;

            const RADIUS = 17;
            let targetX = Math.max(30, Math.min(GAME_WIDTH - 30, p.x + stepX));
            let targetY = Math.max(30, Math.min(GAME_HEIGHT - 30, p.y + stepY));

            if (!checkWallCollision(targetX, targetY, RADIUS, room.walls)) {
                p.x = targetX;
                p.y = targetY;
            } else {
                let canMoveX = !checkWallCollision(targetX, p.y, RADIUS, room.walls);
                let canMoveY = !checkWallCollision(p.x, targetY, RADIUS, room.walls);

                if (canMoveX) p.x = targetX;
                if (canMoveY) p.y = targetY;

                if (!canMoveX && !canMoveY) {
                    let halfX = stepX * 0.6;
                    let halfY = stepY * 0.6;
                    if (halfX !== 0 && !checkWallCollision(p.x + halfX, p.y, RADIUS, room.walls)) p.x += halfX;
                    if (halfY !== 0 && !checkWallCollision(p.x, p.y + halfY, RADIUS, room.walls)) p.y += halfY;
                }
            }
        }

        // 1.5 隊友倒地救援
        for (let deadId in room.players) {
            let deadP = room.players[deadId];
            if (!deadP.isDead) {
                deadP.reviveProgress = 0;
                continue;
            }

            let rescuerNear = false;
            for (let livingId in room.players) {
                if (livingId === deadId) continue;
                let livingP = room.players[livingId];
                if (livingP.isDead) continue;

                if (Math.hypot(livingP.x - deadP.x, livingP.y - deadP.y) <= REVIVE_DIST) {
                    rescuerNear = true;
                    break;
                }
            }

            if (rescuerNear) {
                deadP.reviveProgress = (deadP.reviveProgress || 0) + (dt * 1000);
                if (deadP.reviveProgress >= REVIVE_TIME_REQ) {
                    deadP.isDead = false;
                    deadP.hp = 50;
                    deadP.deathTime = 0;
                    deadP.reviveProgress = 0;
                }
            } else {
                deadP.reviveProgress = 0;
            }
        }

        // 1.8 手榴彈物理滑動、碰撞彈跳與 5 秒定時爆炸
        for (let i = room.grenades.length - 1; i >= 0; i--) {
            let gr = room.grenades[i];
            
            let nextGX = gr.x + gr.vx;
            let nextGY = gr.y + gr.vy;

            if (!checkWallCollision(nextGX, nextGY, 12, room.walls)) {
                gr.x = nextGX;
                gr.y = nextGY;
            } else {
                let canMoveGX = !checkWallCollision(nextGX, gr.y, 12, room.walls);
                let canMoveGY = !checkWallCollision(gr.x, nextGY, 12, room.walls);
                if (canMoveGX) { gr.x = nextGX; gr.vy = -gr.vy * 0.4; }
                else if (canMoveGY) { gr.y = nextGY; gr.vx = -gr.vx * 0.4; }
                else { gr.vx = 0; gr.vy = 0; }
            }

            gr.vx *= 0.88;
            gr.vy *= 0.88;

            if (now >= gr.explodeTime) {
                explodeGrenade(room, gr, now);
                room.grenades.splice(i, 1);
            }
        }

        // 2. 怪物刷新管理
        if (!room.debugMode && hasAlive && !room.levelTransition) {
            if (room.level === 1) {
                if (room.level1Spawned < LEVEL1_TARGET_KILLS &&
                    room.zombies.filter(z => !z.isBoss).length < 7 &&
                    now - room.lastZombieSpawn > 1800) {
                    let pt = getBoundarySpawnPos(room, 18);
                    room.zombies.push({
                        id: 'z_' + (zombieIdCounter++),
                        x: pt.x, y: pt.y, vx: 0, vy: 0,
                        speed: ZOMBIE_SPEED, hp: 3, lastAttackTime: 0,
                        lastHitTime: 0, lastShotgunHitTime: 0,
                        isAttacking: false, attackFrame: 0, attackDir: 'normal',
                        walkDir: 'down', facingLeft: false
                    });
                    room.level1Spawned++;
                    room.lastZombieSpawn = now;
                }
            } else if (room.level === 2) {
                const currentBossCount = room.zombies.filter(z => z.isBoss).length;
                if ((room.level2BossesSpawned || 0) < LEVEL2_TARGET_BOSSES &&
                    currentBossCount < 2 &&
                    (now - room.lastBossSpawn > BOSS_SPAWN_INTERVAL)) {
                    let pt = getBoundarySpawnPos(room, 20);
                    room.zombies.push(spawnBossEntity(room, pt.x, pt.y));
                    room.level2BossesSpawned = (room.level2BossesSpawned || 0) + 1;
                    room.lastBossSpawn = now;
                }

                if ((room.level2ZombiesSpawned || 0) < LEVEL2_TARGET_ZOMBIES &&
                    room.zombies.filter(z => !z.isBoss).length < 8 &&
                    now - room.lastZombieSpawn > 1600) {
                    let pt = getBoundarySpawnPos(room, 18);
                    room.zombies.push({
                        id: 'z_' + (zombieIdCounter++),
                        x: pt.x, y: pt.y, vx: 0, vy: 0,
                        speed: ZOMBIE_SPEED, hp: 3, lastAttackTime: 0,
                        lastHitTime: 0, lastShotgunHitTime: 0,
                        isAttacking: false, attackFrame: 0, attackDir: 'normal',
                        walkDir: 'down', facingLeft: false
                    });
                    room.level2ZombiesSpawned = (room.level2ZombiesSpawned || 0) + 1;
                    room.lastZombieSpawn = now;
                }
            } else if (room.level === 3) {
                const currentBossCount = room.zombies.filter(z => z.isBoss).length;
                if ((room.level3BossesSpawned || 0) < LEVEL3_TARGET_BOSSES &&
                    currentBossCount < 2 &&
                    (now - room.lastBossSpawn > 11000)) {
                    let pt = getBoundarySpawnPos(room, 20);
                    room.zombies.push(spawnBossEntity(room, pt.x, pt.y));
                    room.level3BossesSpawned = (room.level3BossesSpawned || 0) + 1;
                    room.lastBossSpawn = now;
                }

                if ((room.level3ZombiesSpawned || 0) < LEVEL3_TARGET_ZOMBIES &&
                    room.zombies.filter(z => !z.isBoss).length < 8 &&
                    now - room.lastZombieSpawn > 1500) {
                    let pt = getBoundarySpawnPos(room, 18);
                    room.zombies.push({
                        id: 'z_' + (zombieIdCounter++),
                        x: pt.x, y: pt.y, vx: 0, vy: 0,
                        speed: ZOMBIE_SPEED, hp: 3, lastAttackTime: 0,
                        lastHitTime: 0, lastShotgunHitTime: 0,
                        isAttacking: false, attackFrame: 0, attackDir: 'normal',
                        walkDir: 'down', facingLeft: false
                    });
                    room.level3ZombiesSpawned = (room.level3ZombiesSpawned || 0) + 1;
                    room.lastZombieSpawn = now;
                }
            } else if (room.level === 4) {
                const currentBossCount = room.zombies.filter(z => z.isBoss).length;
                if (currentBossCount < 2 && (now - room.lastBossSpawn > 13000)) {
                    let pt = getBoundarySpawnPos(room, 20);
                    room.zombies.push(spawnBossEntity(room, pt.x, pt.y));
                    room.lastBossSpawn = now;
                }

                if (room.zombies.filter(z => !z.isBoss).length < 10 && now - room.lastZombieSpawn > 1200) {
                    let pt = getBoundarySpawnPos(room, 18);
                    room.zombies.push({
                        id: 'z_' + (zombieIdCounter++),
                        x: pt.x, y: pt.y, vx: 0, vy: 0,
                        speed: ZOMBIE_SPEED, hp: 3, lastAttackTime: 0,
                        lastHitTime: 0, lastShotgunHitTime: 0,
                        isAttacking: false, attackFrame: 0, attackDir: 'normal',
                        walkDir: 'down', facingLeft: false
                    });
                    room.lastZombieSpawn = now;
                }
            }
        }

        // 3. 補血包刷新
        if (hasAlive && room.items.length < 3 && now - room.lastItemSpawn > 10000) {
            const pos = getRandomWalkablePos(room, 25);
            if (pos) room.items.push({ x: pos.x, y: pos.y, size: 40 });
            room.lastItemSpawn = now;
        }

        // 4. 殭屍與 BOSS AI
        if (room.debugMode) {
            room.zombies = [];
            room.bossBullets = [];
            room.barrels = [];
            room.grenades = [];
        } else {
            room.zombies.forEach(z => {
                let target = null;
                let minDist = Infinity;
                for (let id in room.players) {
                    let p = room.players[id];
                    if (p.isDead) continue;
                    let d = Math.hypot(p.x - z.x, p.y - z.y);
                    if (d < minDist) { minDist = d; target = p; }
                }

                const elapsed = now - (z.lastAttackTime || 0);

                if (z.isBoss && z.isAttacking && (z.attackDir === 'shoot_down' || z.attackDir === 'shoot_up' || z.attackDir === 'shoot_side')) {
                    const totalFrames = (z.attackDir === 'shoot_side') ? 7 : 5;
                    const shootAnimDuration = 950;
                    z.attackFrame = Math.min(totalFrames - 1, Math.floor((elapsed / shootAnimDuration) * totalFrames));

                    const triggerFrame = (z.attackDir === 'shoot_side') ? 3 : 2;
                    const maxShots = z.burstTotal || 1;

                    if (z.attackFrame >= triggerFrame && (z.burstFired || 0) < maxShots && target) {
                        if (now - (z.lastBurstTime || 0) >= 150) {
                            let shootDx = target.x - z.x;
                            let shootDy = target.y - z.y;

                            if (z.attackDir === 'shoot_down') shootDy = Math.max(30, shootDy);
                            else if (z.attackDir === 'shoot_up') shootDy = Math.min(-30, shootDy);
                            else if (z.attackDir === 'shoot_side') shootDx = (z.facingLeft ? Math.min(-30, shootDx) : Math.max(30, shootDx));

                            let sLen = Math.hypot(shootDx, shootDy) || 1;
                            let bulletSpeed = 9;

                            let spawnOffsetX = (z.attackDir === 'shoot_side') ? (z.facingLeft ? -22 : 22) : 0;
                            let spawnOffsetY = (z.attackDir === 'shoot_down') ? 20 : ((z.attackDir === 'shoot_up') ? -20 : 0);

                            room.bossBullets.push({
                                x: z.x + spawnOffsetX,
                                y: z.y + spawnOffsetY,
                                vx: (shootDx / sLen) * bulletSpeed,
                                vy: (shootDy / sLen) * bulletSpeed,
                                radius: 14
                            });

                            z.burstFired = (z.burstFired || 0) + 1;
                            z.lastBurstTime = now;
                        }
                    }

                    if (elapsed < shootAnimDuration) {
                        z.vx = 0; z.vy = 0;
                        return;
                    } else {
                        z.isAttacking = false;
                        z.attackFrame = 0;
                    }
                } else if (z.lastAttackTime && elapsed < ATTACK_DURATION) {
                    z.isAttacking = true;
                    const totalFrames = (z.attackDir === 'up') ? 6 : 8;
                    z.attackFrame = Math.min(totalFrames - 1, Math.floor((elapsed / ATTACK_DURATION) * totalFrames));
                } else {
                    z.isAttacking = false;
                    z.attackFrame = 0;
                }

                if (target) {
                    let dxToPlayer = target.x - z.x;
                    let dyToPlayer = target.y - z.y;
                    let realDist = Math.hypot(dxToPlayer, dyToPlayer);

                    if (z.isBoss && !z.isAttacking && (now - (z.lastShootTime || 0) > BOSS_SHOOT_COOLDOWN)) {
                        const randomBurst = (Math.random() < 0.5) ? 1 : 3;

                        if (dyToPlayer > 40 && Math.abs(dxToPlayer) < dyToPlayer * 1.5 && realDist < 480) {
                            if (hasLineOfSight(z.x, z.y, target.x, target.y, room.walls)) {
                                z.isAttacking = true; z.attackDir = 'shoot_down'; z.walkDir = 'down';
                                z.lastAttackTime = now; z.lastShootTime = now;
                                z.attackFrame = 0; z.burstTotal = randomBurst;
                                z.burstFired = 0; z.lastBurstTime = 0;
                                z.vx = 0; z.vy = 0; return;
                            }
                        } else if (dyToPlayer < -40 && Math.abs(dxToPlayer) < Math.abs(dyToPlayer) * 1.5 && realDist < 480) {
                            if (hasLineOfSight(z.x, z.y, target.x, target.y, room.walls)) {
                                z.isAttacking = true; z.attackDir = 'shoot_up'; z.walkDir = 'up';
                                z.lastAttackTime = now; z.lastShootTime = now;
                                z.attackFrame = 0; z.burstTotal = randomBurst;
                                z.burstFired = 0; z.lastBurstTime = 0;
                                z.vx = 0; z.vy = 0; return;
                            }
                        } else if (Math.abs(dxToPlayer) > 40 && Math.abs(dyToPlayer) < Math.abs(dxToPlayer) * 1.5 && realDist < 480) {
                            if (hasLineOfSight(z.x, z.y, target.x, target.y, room.walls)) {
                                z.isAttacking = true; z.attackDir = 'shoot_side'; z.walkDir = 'side';
                                z.facingLeft = (dxToPlayer < 0);
                                z.lastAttackTime = now; z.lastShootTime = now;
                                z.attackFrame = 0; z.burstTotal = randomBurst;
                                z.burstFired = 0; z.lastBurstTime = 0;
                                z.vx = 0; z.vy = 0; return;
                            }
                        }
                    }

                    const currentDamage = z.isBoss ? 25 : 15;
                    const currentKnockback = z.isBoss ? 32 : 24;

                    if (realDist <= ATTACK_RANGE) {
                        if (!z.lastAttackTime || now - z.lastAttackTime > ATTACK_COOLDOWN) {
                            if (z.isBoss) {
                                z.isAttacking = true; z.lastAttackTime = now; z.lastShootTime = now;
                                z.attackFrame = 0; z.burstTotal = (Math.random() < 0.5) ? 1 : 3;
                                z.burstFired = 0; z.lastBurstTime = 0;
                                z.vx = 0; z.vy = 0;

                                if (Math.abs(dyToPlayer) >= Math.abs(dxToPlayer)) {
                                    z.attackDir = (dyToPlayer > 0) ? 'shoot_down' : 'shoot_up';
                                    z.walkDir = (dyToPlayer > 0) ? 'down' : 'up';
                                } else {
                                    z.attackDir = 'shoot_side'; z.walkDir = 'side'; z.facingLeft = (dxToPlayer < 0);
                                }
                                return;
                            }

                            target.hp -= currentDamage;
                            target.lastKnockbackTime = now;
                            z.lastAttackTime = now; z.isAttacking = true; z.attackFrame = 0;

                            if (Math.abs(dyToPlayer) >= Math.abs(dxToPlayer)) {
                                z.attackDir = (dyToPlayer > 0) ? 'down' : 'up';
                                z.walkDir = (dyToPlayer > 0) ? 'down' : 'up';
                            } else {
                                z.attackDir = 'normal'; z.walkDir = 'side';
                            }
                            z.facingLeft = (dxToPlayer < 0);

                            let hitDist = Math.hypot(dxToPlayer, dyToPlayer) || 1;
                            let pPushX = (dxToPlayer / hitDist) * currentKnockback;
                            let pPushY = (dyToPlayer / hitDist) * currentKnockback;

                            let nextPX = Math.max(30, Math.min(GAME_WIDTH - 30, target.x + pPushX));
                            let nextPY = Math.max(30, Math.min(GAME_HEIGHT - 30, target.y + pPushY));

                            if (!checkWallCollision(nextPX, nextPY, 22, room.walls)) {
                                target.x = nextPX; target.y = nextPY;
                            } else {
                                if (!checkWallCollision(nextPX, target.y, 22, room.walls)) target.x = nextPX;
                                else if (!checkWallCollision(target.x, nextPY, 22, room.walls)) target.y = nextPY;
                            }

                            if (target.hp <= 0) {
                                target.hp = 0;
                                if (!target.isDead) { target.isDead = true; target.deathTime = now; }
                            }
                        }
                    }

                    if (z.isAttacking) {
                        z.vx = 0;
                        z.vy = 0;
                    } else if (realDist < MIN_BODY_DIST) {
                        z.vx = 0;
                        z.vy = 0;
                        let pushLen = realDist || 1;
                        let overlap = MIN_BODY_DIST - realDist;
                        let pushX = -(dxToPlayer / pushLen) * overlap * 0.5;
                        let pushY = -(dyToPlayer / pushLen) * overlap * 0.5;
                        if (!checkWallCollision(z.x + pushX, z.y + pushY, z.radius || 18, room.walls)) {
                            z.x += pushX; z.y += pushY;
                        }
                    } else {
                        let dx = 0, dy = 0;

                        if (hasLineOfSight(z.x, z.y, target.x, target.y, room.walls)) {
                            dx = target.x - z.x;
                            dy = target.y - z.y;
                        } else {
                            let c = Math.max(0, Math.min(NAV_COLS - 1, Math.floor(z.x / NAV_CELL)));
                            let r = Math.max(0, Math.min(NAV_ROWS - 1, Math.floor(z.y / NAV_CELL)));

                            let bestDist = Infinity;
                            let targetCellX = target.x, targetCellY = target.y;
                            let foundFlowStep = false;

                            const dirs = [
                                { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                                { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
                            ];
                            for (let d of dirs) {
                                let nr = r + d.dr, nc = c + d.dc;
                                if (nr >= 0 && nr < NAV_ROWS && nc >= 0 && nc < NAV_COLS) {
                                    if (room.navGrid[nr][nc] === 0 && room.flowFieldDist[nr][nc] < bestDist) {
                                        bestDist = room.flowFieldDist[nr][nc];
                                        targetCellX = nc * NAV_CELL + NAV_CELL / 2;
                                        targetCellY = nr * NAV_CELL + NAV_CELL / 2;
                                        foundFlowStep = true;
                                    }
                                }
                            }

                            if (foundFlowStep) {
                                dx = targetCellX - z.x;
                                dy = targetCellY - z.y;
                            } else {
                                dx = target.x - z.x;
                                dy = target.y - z.y;
                            }
                        }

                        let dist = Math.hypot(dx, dy);
                        if (dist > 0.001) {
                            let currentSpeed = z.isBoss ? BOSS_SPEED : z.speed;
                            let moveX = (dx / dist) * currentSpeed;
                            let moveY = (dy / dist) * currentSpeed;
                            const Z_RADIUS = z.radius || 18;

                            let targetX = z.x + moveX;
                            let targetY = z.y + moveY;

                            if (!checkWallCollision(targetX, targetY, Z_RADIUS, room.walls)) {
                                z.x = targetX;
                                z.y = targetY;
                                z.vx = moveX;
                                z.vy = moveY;
                            } else {
                                let canMoveX = !checkWallCollision(targetX, z.y, Z_RADIUS, room.walls);
                                let canMoveY = !checkWallCollision(z.x, targetY, Z_RADIUS, room.walls);

                                if (canMoveX && !canMoveY) {
                                    z.x = targetX; z.vx = moveX; z.vy = 0;
                                } else if (canMoveY && !canMoveX) {
                                    z.y = targetY; z.vx = 0; z.vy = moveY;
                                } else if (canMoveX && canMoveY) {
                                    if (Math.abs(moveX) >= Math.abs(moveY)) {
                                        z.x = targetX; z.vx = moveX; z.vy = 0;
                                    } else {
                                        z.y = targetY; z.vx = 0; z.vy = moveY;
                                    }
                                } else {
                                    let halfX = moveX * 0.5;
                                    let halfY = moveY * 0.5;
                                    let halfCanX = halfX !== 0 && !checkWallCollision(z.x + halfX, z.y, Z_RADIUS, room.walls);
                                    let halfCanY = halfY !== 0 && !checkWallCollision(z.x, z.y + halfY, Z_RADIUS, room.walls);

                                    if (halfCanX) { z.x += halfX; z.vx = halfX; }
                                    if (halfCanY) { z.y += halfY; z.vy = halfY; }
                                    if (!halfCanX && !halfCanY) { z.vx = 0; z.vy = 0; }
                                }
                            }

                            if (Math.abs(dx) > 10) z.facingLeft = (dx < 0);
                            if (Math.abs(dx) > Math.abs(dy)) {
                                z.walkDir = 'side';
                            } else {
                                z.walkDir = (dy < 0) ? 'up' : 'down';
                            }
                        }
                    }
                }
            });

            for (let iter = 0; iter < 2; iter++) {
                for (let i = 0; i < room.zombies.length; i++) {
                    for (let j = i + 1; j < room.zombies.length; j++) {
                        let z1 = room.zombies[i];
                        let z2 = room.zombies[j];
                        let r1 = z1.radius || 18;
                        let r2 = z2.radius || 18;
                        let minDist = r1 + r2;

                        let dx = z2.x - z1.x;
                        let dy = z2.y - z1.y;
                        let dist = Math.hypot(dx, dy);

                        if (dist < 0.001) {
                            dx = (Math.random() - 0.5) || 1;
                            dy = (Math.random() - 0.5) || 0;
                            dist = Math.hypot(dx, dy);
                        }

                        if (dist < minDist) {
                            let overlap = (minDist - dist) * 0.5;
                            let nx = dx / dist;
                            let ny = dy / dist;

                            let w1 = 0.5, w2 = 0.5;
                            if (z1.isBoss && !z2.isBoss) { w1 = 0.1; w2 = 0.9; }
                            else if (!z1.isBoss && z2.isBoss) { w1 = 0.9; w2 = 0.1; }

                            let p1x = nx * overlap * w1;
                            let p1y = ny * overlap * w1;
                            let p2x = nx * overlap * w2;
                            let p2y = ny * overlap * w2;

                            if (!checkWallCollision(z1.x - p1x, z1.y - p1y, r1, room.walls)) {
                                z1.x -= p1x; z1.y -= p1y;
                            } else {
                                if (!checkWallCollision(z1.x - p1x, z1.y, r1, room.walls)) z1.x -= p1x;
                                if (!checkWallCollision(z1.x, z1.y - p1y, r1, room.walls)) z1.y -= p1y;
                            }

                            if (!checkWallCollision(z2.x + p2x, z2.y + p2y, r2, room.walls)) {
                                z2.x += p2x; z2.y += p2y;
                            } else {
                                if (!checkWallCollision(z2.x + p2x, z2.y, r2, room.walls)) z2.x += p2x;
                                if (!checkWallCollision(z2.x, z2.y + p2y, r2, room.walls)) z2.y += p2y;
                            }
                        }
                    }
                }
            }
        }

        // 5. 拾取補血包
        for (let i = room.items.length - 1; i >= 0; i--) {
            let item = room.items[i];
            let consumed = false;
            for (let id in room.players) {
                let p = room.players[id];
                if (!p.isDead && Math.hypot(p.x - item.x, p.y - item.y) < 40) {
                    p.hp = Math.min(100, p.hp + 30);
                    consumed = true;
                    break;
                }
            }
            if (consumed) room.items.splice(i, 1);
        }

        // 6. 玩家子彈移動與傷害判定
        for (let i = room.bullets.length - 1; i >= 0; i--) {
            let b = room.bullets[i];
            b.x += b.vx; 
            b.y += b.vy;

            let stepLen = Math.hypot(b.vx, b.vy);
            b.traveled = (b.traveled || 0) + stepLen;

            if (b.maxDist && b.traveled >= b.maxDist) {
                room.bullets.splice(i, 1);
                continue;
            }

            if (isPointInWall(b.x, b.y, room.walls) || b.x < 0 || b.x > GAME_WIDTH || b.y < 0 || b.y > GAME_HEIGHT) {
                room.bullets.splice(i, 1);
                continue;
            }

            let hit = false;

            for (let k = room.barrels.length - 1; k >= 0; k--) {
                let br = room.barrels[k];
                if (Math.hypot(b.x - br.x, b.y - br.y) < (br.radius || 25) + 8) {
                    br.hp -= (b.weapon === 'shotgun' ? 2 : 1);
                    hit = true;
                    if (br.hp <= 0) {
                        explodeBarrel(room, br, now);
                    }
                    break;
                }
            }

            if (!hit) {
                for (let j = room.zombies.length - 1; j >= 0; j--) {
                    let z = room.zombies[j];
                    const hitRadius = 28;

                    if (Math.hypot(b.x - z.x, b.y - z.y) < hitRadius) {
                        if (b.weapon === 'shotgun') {
                            if (now - (z.lastShotgunHitTime || 0) > 200) {
                                z.hp -= 3;
                                z.lastShotgunHitTime = now;
                            }
                        } else {
                            z.hp -= 1;
                        }

                        hit = true;

                        if (z.isAttacking && z.attackDir !== 'shoot_down' && z.attackDir !== 'shoot_up' && z.attackDir !== 'shoot_side') {
                            z.isAttacking = false;
                            z.attackFrame = 0;
                            z.lastAttackTime = now - ATTACK_DURATION - 50;
                        }

                        z.lastHitTime = now;
                        let bLength = Math.hypot(b.vx, b.vy);
                        if (bLength > 0) {
                            let pushForce = z.isBoss ? 10 : (b.weapon === 'shotgun' ? 26 : 20);
                            let pushX = (b.vx / bLength) * pushForce;
                            let pushY = (b.vy / bLength) * pushForce;
                            if (!checkWallCollision(z.x + pushX, z.y + pushY, z.radius || 18, room.walls)) {
                                z.x += pushX; z.y += pushY;
                            }
                        }

                        if (z.hp <= 0) {
                            room.zombies.splice(j, 1);
                            room.score += z.isBoss ? 100 : 30;

                            if (room.level === 1) {
                                room.level1Killed = (room.level1Killed || 0) + 1;
                            } else if (room.level === 2) {
                                if (z.isBoss) {
                                    room.level2BossesKilled = (room.level2BossesKilled || 0) + 1;
                                } else {
                                    room.level2ZombiesKilled = (room.level2ZombiesKilled || 0) + 1;
                                }
                            } else if (room.level === 3) {
                                if (z.isBoss) {
                                    room.level3BossesKilled = (room.level3BossesKilled || 0) + 1;
                                } else {
                                    room.level3ZombiesKilled = (room.level3ZombiesKilled || 0) + 1;
                                }
                            }
                        }
                        break;
                    }
                }
            }
            if (hit) room.bullets.splice(i, 1);
        }

        // 7. BOSS 砲彈飛行與傷害碰撞
        for (let i = room.bossBullets.length - 1; i >= 0; i--) {
            let bb = room.bossBullets[i];
            bb.x += bb.vx;
            bb.y += bb.vy;

            if (isPointInWall(bb.x, bb.y, room.walls) || bb.x < 0 || bb.x > GAME_WIDTH || bb.y < 0 || bb.y > GAME_HEIGHT) {
                room.bossBullets.splice(i, 1);
                continue;
            }

            let hitSomething = false;

            for (let k = room.barrels.length - 1; k >= 0; k--) {
                let br = room.barrels[k];
                if (Math.hypot(bb.x - br.x, bb.y - br.y) < (br.radius || 25) + 12) {
                    br.hp = 0;
                    explodeBarrel(room, br, now);
                    hitSomething = true;
                    break;
                }
            }

            if (!hitSomething) {
                for (let id in room.players) {
                    let p = room.players[id];
                    if (p.isDead) continue;

                    if (Math.hypot(bb.x - p.x, bb.y - p.y) < 28) {
                        p.hp -= 25;
                        p.lastKnockbackTime = now;
                        hitSomething = true;

                        let bLen = Math.hypot(bb.vx, bb.vy) || 1;
                        let pushX = (bb.vx / bLen) * 30;
                        let pushY = (bb.vy / bLen) * 30;
                        let nextPX = Math.max(30, Math.min(GAME_WIDTH - 30, p.x + pushX));
                        let nextPY = Math.max(30, Math.min(GAME_HEIGHT - 30, p.y + pushY));

                        if (!checkWallCollision(nextPX, nextPY, 22, room.walls)) {
                            p.x = nextPX; p.y = nextPY;
                        }

                        if (p.hp <= 0) {
                            p.hp = 0;
                            if (!p.isDead) { p.isDead = true; p.deathTime = now; }
                        }
                        break;
                    }
                }
            }
            if (hitSomething) room.bossBullets.splice(i, 1);
        }

        room.barrels = room.barrels.filter(br => !br._dead && br.hp > 0);

        io.to(mapId).emit('updateState', {
            players: room.players,
            zombies: room.zombies,
            bullets: room.bullets,
            bossBullets: room.bossBullets,
            items: room.items,
            barrels: room.barrels,
            grenades: room.grenades.map(g => ({
                id: g.id,
                x: g.x,
                y: g.y,
                timeLeft: Math.max(0, g.explodeTime - now)
            })),
            score: room.score,
            level: room.level,
            level1Remaining: Math.max(0, LEVEL1_TARGET_KILLS - (room.level1Killed || 0)),
            level2ZombiesRemaining: Math.max(0, LEVEL2_TARGET_ZOMBIES - (room.level2ZombiesKilled || 0)),
            level2BossesRemaining: Math.max(0, LEVEL2_TARGET_BOSSES - (room.level2BossesKilled || 0)),
            level3ZombiesRemaining: Math.max(0, LEVEL3_TARGET_ZOMBIES - (room.level3ZombiesKilled || 0)),
            level3BossesRemaining: Math.max(0, LEVEL3_TARGET_BOSSES - (room.level3BossesKilled || 0)),
            debugMode: room.debugMode
        });
    }
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 伺服器已在 Port ${PORT} 啟動！`);
});