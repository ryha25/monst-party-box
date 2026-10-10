import { supabaseConfig } from './supabase-config.js';

export function totalStat(base, plus) {
  if (base === null || base === undefined || base === '' || !Number.isFinite(Number(base))) return null;
  return Math.round((Number(base) + (Number(plus) || 0)) * 100) / 100;
}

export function detailFields(character, details = {}) {
  const value = item => item === null || item === undefined || item === '' ? '未登録' : String(item);
  const list = items => Array.isArray(items) && items.length ? items.join(' / ') : 'なし・未登録';
  return [
    ['図鑑No.', character.id?.match(/^monst-(\d+)$/)?.[1] || '未登録'],
    ['形態', value(character.form)], ['属性', value(character.attribute)], ['撃種', value(character.type)],
    ['レアリティ', details.rarity ? `★${details.rarity}` : '未登録'], ['種族', value(details.race)], ['戦型', value(details.battleType)],
    ['HP（タス最大）', value(totalStat(details.base?.hp, details.plus?.hp))],
    ['攻撃力（タス最大）', value(totalStat(details.base?.attack, details.plus?.attack))],
    ['スピード（タス最大）', value(totalStat(details.base?.speed, details.plus?.speed))],
    ['HP（Lv120・タス最大）', value(totalStat(details.level120?.hp, details.plus?.hp))],
    ['攻撃力（Lv120・タス最大）', value(totalStat(details.level120?.attack, details.plus?.attack))],
    ['スピード（Lv120・タス最大）', value(totalStat(details.level120?.speed, details.plus?.speed))],
    ['アビリティ', list(details.abilities)], ['ゲージ', list(details.gauge)], ['コネクトスキル', list(details.connect)],
    ['コネクト条件', value(details.connectCondition)], ['SSターン', value(details.ssTurns)], ['SS効果', value(details.ssEffect)],
    ['友情コンボ', list(details.friendships)], ['ショットスキル', value(details.shotSkill)], ['アシストスキル', value(details.assistSkill)],
    ['ラックスキル', value(details.luckSkill)]
  ];
}

export function createCharacterDetailsLoader() {
  const cache = new Map();
  return async id => {
    if (id.startsWith('manual-')) return {};
    if (cache.has(id)) return cache.get(id);
    const response = await fetch(`${supabaseConfig.url}/rest/v1/characters?id=eq.${encodeURIComponent(id)}&select=metadata&limit=1`, {
      headers: { apikey: supabaseConfig.publishableKey, Authorization: `Bearer ${supabaseConfig.publishableKey}` }
    });
    if (!response.ok) throw new Error(`ステータスを取得できませんでした (${response.status})`);
    const metadata = (await response.json())[0]?.metadata || {};
    const details = metadata.details || (metadata.name_source ? {source:metadata.name_source,sourceUrl:metadata.name_source_url} : {});
    cache.set(id, details);
    return details;
  };
}
