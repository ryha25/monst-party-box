import { characterNumber } from './box-service.js?v=20261011-catalogue';
import { totalStat } from './character-details.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function renderBoxGrid(items) {
  if (!items.length) return '<p class="empty">まだ登録されていません</p>';
  return items.map(({ character, quantity }) => {
    const number = characterNumber(character);
    const label = `${character.name}、${number === null ? '番号未登録' : `No.${number}`}、所持${quantity}体のステータスを見る`;
    return `<button type="button" class="box-tile character-open" data-detail-character="${escape(character.id)}" aria-label="${escape(label)}" title="${escape(character.name)}">
      <span class="box-icon-wrap" data-attribute="${escape(character.attribute)}"><span class="avatar" data-reference-icon="${escape(character.id)}"><span class="icon-placeholder"><strong>${number === null ? 'No.未登録' : `No.${number}`}</strong><span>${escape(character.name)}</span>${[['HP','hp'],['攻撃','attack'],['速度','speed']].map(([label,key])=>`<small>${label} ${totalStat(character.stats?.base?.[key],character.stats?.plus?.[key]) ?? '未登録'}</small>`).join('')}</span></span>${quantity ? `<span class="box-quantity" aria-hidden="true">×${escape(quantity)}</span>` : ''}</span>
      <span class="box-number">${number === null ? 'No.未登録' : `No.${number}`}</span>
      <span class="box-name">${escape(character.name)}</span>
    </button>`;
  }).join('');
}
