import assert from 'node:assert/strict';
import { renderBoxGrid } from '../src/box-grid.js';
import { sortBoxItems } from '../src/box-service.js';
const rows = [
 { character: { id: 'monst-20', name: '火のキャラ', attribute: '火' }, quantity: 3 },
 { character: { id: 'monst-9', name: '<名前> "テスト"', attribute: '水' }, quantity: 1 }
];
const before = structuredClone(rows);
const html = renderBoxGrid(sortBoxItems(rows));
assert.equal((html.match(/class="box-tile character-open"/g) || []).length, 2);
assert.equal((html.match(/type="button"/g) || []).length, 2);
assert(html.indexOf('data-detail-character="monst-9"') < html.indexOf('data-detail-character="monst-20"'));
assert(html.includes('data-reference-icon="monst-20"'));
assert(html.includes('data-attribute="火"'));
assert(html.includes('×3'));
assert(html.includes('No.20'));
assert(html.includes('&lt;名前&gt; &quot;テスト&quot;'));
assert(!html.includes('<名前>'));
assert(!html.includes('box-row'));
assert.deepEqual(rows, before);
assert(renderBoxGrid([]).includes('class="empty"'));
assert(renderBoxGrid([{character:{id:'manual-a',name:'手動'},quantity:1}]).includes('No.未登録'));
console.log('BOX grid: clickable tiles, icon mapping, numeric order, quantities, escaping and empty/manual states passed');
