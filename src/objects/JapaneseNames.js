const name = (kanji, kana) => Object.freeze({ kanji, kana });

export const JAPANESE_NAMES = Object.freeze({
  cucumber: name('胡瓜', 'きゅうり'),
  maki: name('巻き寿司', 'まきずし'),
  nigiri: name('握り寿司', 'にぎりずし'),
  nikiriBrush: name('煮切り刷毛', 'にきりばけ'),
  nikiriSauce: name('煮切り醤油', 'にきりじょうゆ'),
  noriSheet: name('海苔', 'のり'),
  peeledShrimp: name('むき海老', 'むきえび'),
  riceBall: name('酢飯', 'すめし'),
  riceOnNori: name('酢飯つき海苔', 'すめしつきのり'),
  shrimp: name('海老', 'えび'),
  tamago: name('玉子', 'たまご'),
  unpeeledShrimp: name('殻付き海老', 'からつきえび'),
  wasabi: name('山葵', 'わさび'),
});

export const JAPANESE_FISH_NAMES = Object.freeze({
  aji: name('鯵', 'あじ'),
  hamachi: name('魬', 'はまち'),
  hirame: name('平目', 'ひらめ'),
  iwashi: name('鰯', 'いわし'),
  ika: name('烏賊', 'いか'),
  maguro: name('鮪', 'まぐろ'),
  saba: name('鯖', 'さば'),
  salmon: name('鮭', 'サーモン'),
  suzuki: name('鱸', 'すずき'),
  tai: name('鯛', 'たい'),
  unagi: name('鰻', 'うなぎ'),
});

export const JAPANESE_FISH_SUBTYPE_NAMES = Object.freeze({
  akami: name('赤身', 'あかみ'),
  anago: name('穴子', 'あなご'),
  benizake: name('紅鮭', 'べにざけ'),
  buri: name('鰤', 'ぶり'),
  chutoro: name('中とろ', 'ちゅうとろ'),
  engawa: name('縁側', 'えんがわ'),
  gomasaba: name('胡麻鯖', 'ごまさば'),
  hamachi: name('魬', 'はまち'),
  hirame: name('平目', 'ひらめ'),
  kanpachi: name('間八', 'かんぱち'),
  katakuchiIwashi: name('片口鰯', 'かたくちいわし'),
  kihada: name('黄肌鮪', 'きはだまぐろ'),
  kingSalmon: name('鱒之介', 'ますのすけ'),
  kinmedai: name('金目鯛', 'きんめだい'),
  kurodai: name('黒鯛', 'くろだい'),
  maAji: name('真鯵', 'まあじ'),
  madai: name('真鯛', 'まだい'),
  maiwashi: name('真鰯', 'まいわし'),
  masaba: name('真鯖', 'まさば'),
  mebachi: name('目鉢鮪', 'めばちまぐろ'),
  ohyo: name('大鮃', 'おひょう'),
  otoro: name('大とろ', 'おおとろ'),
  shimaAji: name('縞鯵', 'しまあじ'),
  suzuki: name('鱸', 'すずき'),
  taiseiyouSalmon: name('大西洋鮭', 'たいせいようさけ'),
  unagi: name('鰻', 'うなぎ'),
});

export const JAPANESE_KNIFE_NAMES = Object.freeze({
  knife: name('包丁', 'ほうちょう'),
  yanagiba: name('柳刃', 'やなぎば'),
  deba: name('出刃', 'でば'),
  usuba: name('薄刃', 'うすば'),
  nakiri: name('菜切', 'なきり'),
  takohiki: name('蛸引', 'たこひき'),
  fuguhiki: name('河豚引', 'ふぐひき'),
  kiritsuke: name('切付', 'きりつけ'),
});

export function composeJapaneseName(base, suffix) {
  if (!base || !suffix) {
    return null;
  }

  return name(`${base.kanji}${suffix.kanji}`, `${base.kana}${suffix.kana}`);
}
