/**
 * Street Grudge v3 — Configuration, Playable Roster, Rival Roster & Localization (TR/EN)
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  SG.WORLD_W = 3000;
  SG.WORLD_H = 2200;
  SG.DOWNTOWN_SPLIT_X = 1520;

  // Explicit Enemy AI Finite State Machine states
  SG.AI_STATES = Object.freeze({
    WANDER: 'DailyRoutine_Wander',
    SEARCH: 'Searching',
    COMBAT: 'Aggro_Combat',
    CALMED: 'CalmedDown'
  });

  // 4 Playable Fighters with Distinct Stats & Special Moves
  SG.PLAYABLE_ROSTER = [
    {
      id: 'kerem',
      name: 'KEREM "HADOU-KAHVE"',
      short: 'KEREM',
      roleTr: 'Dengeli Karateci • Ateş Topu',
      roleEn: 'Balanced Karateka • Fireball',
      giColor: '#f8fafc',
      trimColor: '#111111',
      skinColor: '#f5cfa0',
      hairColor: '#271c15',
      bandanaColor: '#ef4444',
      r: 20,
      maxHp: 125,
      speed: 260,
      powerMult: 1.0,
      specialKind: 'fireball',
      specialNameTr: 'KİN HADOU-DALGASI!!',
      specialNameEn: 'PETTY HADOU-BLAST!!',
      specialColor: '#f97316'
    },
    {
      id: 'demir',
      name: 'DEMİR "BÜRO TANKI"',
      short: 'DEMİR',
      roleTr: 'Ağır Dövüşçü (+HP) • Asfalt Şoku',
      roleEn: 'Heavy Tank (+HP) • Asphalt Slam',
      giColor: '#4d7c0f',
      trimColor: '#facc15',
      skinColor: '#e9b98a',
      hairColor: '#1c1917',
      bandanaColor: '#f97316',
      r: 23,
      maxHp: 155,
      speed: 228,
      powerMult: 1.18,
      specialKind: 'shockwave',
      specialNameTr: 'ASFALT DEPREMİ!!',
      specialNameEn: 'ASPHALT SLAM!!',
      specialColor: '#84cc16'
    },
    {
      id: 'zeynep',
      name: 'ZEYNEP "METRO RÜZGARI"',
      short: 'ZEYNEP',
      roleTr: 'Çok Hızlı • Kasırga Tekmesi',
      roleEn: 'Ultra Fast • Cyclone Spin',
      giColor: '#facc15',
      trimColor: '#111111',
      skinColor: '#fde2c4',
      hairColor: '#18181b',
      bandanaColor: '#3b82f6',
      r: 18,
      maxHp: 112,
      speed: 292,
      powerMult: 0.96,
      specialKind: 'cyclone',
      specialNameTr: 'METRO KASIRGASI!!',
      specialNameEn: 'SUBWAY CYCLONE!!',
      specialColor: '#38bdf8'
    },
    {
      id: 'kadir',
      name: 'KADİR "KALDIRIM KRALI"',
      short: 'KADİR',
      roleTr: 'Agresif • 3\'lü Alev Yayılımı',
      roleEn: 'Aggressive • Triple Flame Wave',
      giColor: '#dc2626',
      trimColor: '#fde047',
      skinColor: '#f0c294',
      hairColor: '#fbbf24',
      bandanaColor: '#111111',
      r: 20,
      maxHp: 122,
      speed: 266,
      powerMult: 1.08,
      specialKind: 'triple_flame',
      specialNameTr: 'ÜÇLÜ KİN ALEVİ!!',
      specialNameEn: 'TRIPLE PETTY FLAME!!',
      specialColor: '#fb923c'
    }
  ];

  // 6 Distinct AI Rival Fighters
  SG.RIVAL_ROSTER = [
    {
      id: 'ryo',
      name: 'RYO "COMMUTER"',
      short: 'RYO',
      giColor: '#facc15',
      trimColor: '#111111',
      skinColor: '#f5cfa0',
      hairColor: '#1e1b18',
      bandanaColor: '#ef4444',
      r: 20,
      maxHp: 115,
      speed: 196,
      specialKind: 'fireball',
      specialName: 'COFFEE HADOUKEN!',
      specialColor: '#38bdf8',
      taunts: ['MY TRAIN WAS DELAYED!', 'TORN GI, FULL FURY!', 'DON\'T TOUCH MY BRIEFCASE!']
    },
    {
      id: 'brutus',
      name: 'BRUTUS "POTHOLER"',
      short: 'BRU',
      giColor: '#4ade80',
      trimColor: '#1d4ed8',
      skinColor: '#86efac',
      hairColor: '#14532d',
      bandanaColor: '#f97316',
      r: 24,
      maxHp: 150,
      speed: 170,
      specialKind: 'shockwave',
      specialName: 'ASPHALT SLAM!',
      specialColor: '#84cc16',
      taunts: ['BRUTUS SMASH SIDEWALK!', 'GET OUTTA MY ALLEY!', 'GRAAAH!!']
    },
    {
      id: 'chun',
      name: 'CHUN-LIQUID',
      short: 'CHU',
      giColor: '#3b82f6',
      trimColor: '#fde047',
      skinColor: '#fde2c4',
      hairColor: '#1c1917',
      bandanaColor: '#ffffff',
      r: 18,
      maxHp: 108,
      speed: 230,
      specialKind: 'cyclone',
      specialName: 'LIGHTNING SPIN!',
      specialColor: '#60a5fa',
      taunts: ['TOO SLOW FOR UPTOWN!', 'WATCH THE KICKS!', 'JUST FINISHED PILATES!']
    },
    {
      id: 'dorado',
      name: 'EL DORADO',
      short: 'ELD',
      giColor: '#f59e0b',
      trimColor: '#b91c1c',
      skinColor: '#eab308',
      hairColor: '#dc2626',
      bandanaColor: '#ef4444',
      r: 21,
      maxHp: 125,
      speed: 200,
      specialKind: 'lariat',
      specialName: 'QUARTERLY LARIAT!',
      specialColor: '#fbbf24',
      taunts: ['GOING DOWN?!', 'MY CAPE CAUGHT IN THE DOOR!', 'SYNERGY SUPLEX!!']
    },
    {
      id: 'kenji',
      name: 'KENJI "JAYWALKER"',
      short: 'KEN',
      giColor: '#ef4444',
      trimColor: '#111111',
      skinColor: '#f3caa0',
      hairColor: '#fde047',
      bandanaColor: '#111111',
      r: 20,
      maxHp: 120,
      speed: 212,
      specialKind: 'triple_flame',
      specialName: 'FLAME CROSSWALK!',
      specialColor: '#fb923c',
      taunts: ['I NEVER WAIT FOR GREEN!', 'YOU LOOKIN\' AT ME?!', 'FEEL THE HEAT!']
    },
    {
      id: 'bison',
      name: 'MADAME BISON-NETTE',
      short: 'BIS',
      giColor: '#9333ea',
      trimColor: '#facc15',
      skinColor: '#f5d0b5',
      hairColor: '#3b0764',
      bandanaColor: '#dc2626',
      r: 21,
      maxHp: 138,
      speed: 208,
      specialKind: 'psycho_beam',
      specialName: 'PSYCHO COMMUTE!',
      specialColor: '#c084fc',
      taunts: ['FOR ME, IT WAS TUESDAY!', 'BOW TO THE BOSS!', 'BOWL \'EM OVER!']
    }
  ];

  SG.I18N = {
    en: {
      subtitle: 'v3 DIRECTOR\'S CUT — ULTRA-REALISTIC OPEN-WORLD FIGHTER',
      pitch: 'Pick your fighter and start your day scattered across <b>Downtown &amp; Uptown</b>. Track down rivals, execute <b>Perfect Parries</b>, hurl <b>street weapons</b>, dodge the <b>Segway Mall Cop</b>, and unleash <b>ULTRA SUPER</b> moves before your <b>GRUDGE METER</b> hits 0% and you forget why you were mad!',
      card1Title: '1. ROAM & CAFFEINE',
      card1Body: 'Ride Subway Express, grab Espresso at kiosks (+Grudge & Speed), and press <b>[E]</b> to locate rivals.',
      card2Title: '2. PARRY & WEAPONS',
      card2Body: 'Time <b>Block [L]</b> right before a hit for a <b>PARRY!</b> Pick up trash lids, briefcases & cones to throw <b>[C]</b>.',
      card3Title: '3. SUPER & GRUDGE',
      card3Body: 'Build <b>SUPER 100%</b> for an Ultra Finisher <b>[U]</b>. If Grudge hits <b>0%</b>, the fight is canceled!',
      mode1p: '1P OPEN WORLD (6 AI)',
      mode2p: '2P LOCAL SPLIT-SCREEN',
      pickFighter: 'SELECT YOUR FIGHTER:',
      startBtn: 'START THE DAY!',
      playAgainBtn: 'START A NEW PETTY GRUDGE [R]',
      p1Name: 'P1',
      p2Name: 'P2 (RIVAL COMMUTER)',
      grudge: 'GRUDGE',
      superLabel: 'SUPER',
      noRival: 'NO RIVAL IN SIGHT',
      searchingCity: 'ROAMING CITY',
      roamHint: 'ROAM STREETS OR PRESS [E]',
      fuming: 'FUMING',
      annoyed: 'ANNOYED',
      cooling: 'COOLING OFF',
      calm: 'CALMED DOWN',
      grudgeHigh: 'PURE RAGE (+35% DMG, SPECIAL READY)',
      grudgeMid: 'STILL MAD (SPECIAL > 40%)',
      grudgeLow: 'FORGETTING WHY... (-25% DMG)',
      grudgeZero: 'TOTALLY OVER IT',
      forgotBadge: 'ANTICLIMACTIC DRAW — FIGHT CANCELED',
      forgotTitle: 'FORGOT WHY YOU WERE MAD!',
      forgotQuotes: [
        '"Wait... why did I even put on my fighting headband today? Honestly, I could go for a sandwich."',
        '"You know what? Walking 12 blocks really cleared my head. Great cardio."',
        '"Was I mad at them, or just hungry? Probably just hungry. Let\'s call it a draw."'
      ],
      defeatBadge: 'KNOCKED OUT IN PUBLIC',
      defeatTitle: 'DOWN FOR THE COUNT!',
      defeatQuote: '"You got folded right next to a broken fire hydrant while three commuters filmed it."',
      victoryBadge: 'UNDEFEATED MENACE',
      victoryTitle: 'PETTY CHAMPION OF THE CITY!',
      victoryQuote: '"Every rival in Downtown & Uptown has been settled. Your petty grudge is finally satisfied."',
      p1WinTitle: 'PLAYER 1 WINS THE BEEF!',
      p2WinTitle: 'PLAYER 2 WINS THE BEEF!',
      vsWinQuote: '"Finally found each other across town and settled it right in the middle of traffic!"',
      challengerBanner: 'RIVAL FOUND!',
      fightSub: 'LOCKED IN STREET COMBAT!',
      mergedBanner: 'BEEF LOCATED!',
      mergedSub: 'SPLIT-SCREEN MERGED — FIGHT!!',
      koBanner: 'K.O.!',
      koSub: 'PETTY BEEF SETTLED! +GRUDGE',
      subwayBanner: 'SUBWAY EXPRESS',
      subwaySub: 'COMMUTER RAGE! +5% GRUDGE',
      copBanner: 'MALL COP ALERT!',
      copSub: 'SEGWAY SECURITY IS CHASING YOU!',
      superBanner: 'ULTRA PETTY FINISH!!',
      reasons: [
        'Took the last iced oat-milk latte',
        'Stepped on fresh sneakers back in 2019',
        'Didn\'t hold the office elevator door',
        'Spoiled the season finale on the subway',
        'Left the group chat message on "Read"',
        'Parked across TWO spaces outside the library',
        'Chewed popcorn way too loudly at the movies'
      ],
      playerLowGrudgeLines: [
        'Wait... why was I mad again?',
        'Nice weather today, honestly...',
        'Maybe I overreacted?',
        'My legs hurt. Coffee sounds nice.',
        'Was it really THAT big a deal?'
      ],
      playerShoutLines: [
        'HEY!! GET OVER HERE!!',
        'DON\'T WALK AWAY FROM ME!!',
        'WE HAVE UNFINISHED BUSINESS!!',
        'SQUARE UP RIGHT NOW!!'
      ],
      calmedRivalLines: [
        'Bro, I\'m totally over it now.',
        'Deep breaths... inner peace...',
        'That was 10 minutes ago, let it go.',
        'Wanna grab ramen instead?'
      ],
      distractionLines: [
        'Ooh, 40% off sneakers...',
        'Wait, that latte smells good...',
        'Is that Street Fighter II inside?!'
      ]
    },
    tr: {
      subtitle: 'v3 YÖNETMEN SÜRÜMÜ — ULTRA-GERÇEKÇİ AÇIK DÜNYA DÖVÜŞÜ',
      pitch: 'Dövüşçünü seç ve <b>Downtown &amp; Uptown</b> sokaklarında güne başla! Rakipleri bul, <b>Kusursuz Parry</b> yap, <b>sokak silahları fırlat</b>, <b>Segway\'li Güvenlik Şefi\'nden</b> kaç ve <b>ÖFKE BARIN %0</b> olup neden kızdığını unutmadan <b>ULTRA SÜPER</b> hareketini patlat!',
      card1Title: '1. GEZ & KAFEİN AL',
      card1Body: 'Metro Ekspresine bin, kahve büfesinde Espresso kap (+Öfke & Hız) ve <b>[E]</b> ile rakipleri bul.',
      card2Title: '2. PARRY & SİLAHLAR',
      card2Body: 'Tam darbe anında <b>Blok [L]</b> ile <b>PARRY</b> yap! Çöp kapağı, evrak çantası ve duba fırlat <b>[C]</b>.',
      card3Title: '3. SÜPER & ÖFKE BARI',
      card3Body: '<b>SÜPER %100</b> dolunca <b>[U]</b> ile Ultra Finisher patlat. Öfke <b>%0</b> olursa dövüş iptal!',
      mode1p: '1P AÇIK DÜNYA (6 AI)',
      mode2p: '2P YEREL BÖLÜNMÜŞ EKRAN',
      pickFighter: 'DÖVÜŞÇÜNÜ SEÇ:',
      startBtn: 'GÜNE BAŞLA!',
      playAgainBtn: 'YENİ KİN BAŞLAT [R]',
      p1Name: 'O1',
      p2Name: 'O2 (RAKİP YOLCU)',
      grudge: 'ÖFKE',
      superLabel: 'SÜPER',
      noRival: 'YAKINDA RAKİP YOK',
      searchingCity: 'ŞEHİRDE ARANIYOR',
      roamHint: 'SOKAKLARI GEZ VEYA [E] BAS',
      fuming: 'KUDURMUŞ',
      annoyed: 'SİNİRLİ',
      cooling: 'SAKİNLEŞİYOR',
      calm: 'UNUTTU',
      grudgeHigh: 'SAF ÖFKE (+%35 HASAR, ÖZEL HAZIR)',
      grudgeMid: 'HALA KIZGIN (ÖZEL > %40)',
      grudgeLow: 'NEDEN KIZMIŞTIM?.. (-%25 HASAR)',
      grudgeZero: 'TAMAMEN UNUTTU',
      forgotBadge: 'DÖVÜŞ İPTAL EDİLDİ — BERABERE',
      forgotTitle: 'NEDEN SİNİRLENDİĞİNİ UNUTTUN!',
      forgotQuotes: [
        '"Bir dakika... ben bugün niye dövüş bandanasını taktım ki? Aslında canım tost çekti."',
        '"Biliyor musun? 12 sokak yürüyünce kafam dağıldı, güzel kardiyo oldu."',
        '"Ona mı kızmıştım yoksa sadece aç mıydım? Kesin açlıktan. İptal edelim."'
      ],
      defeatBadge: 'SOKAK ORTASINDA NAKAVT',
      defeatTitle: 'YERDE KALDIN!',
      defeatQuote: '"Patlak yangın musluğunun yanında üç yolcu video çekerken nakavt oldun."',
      victoryBadge: 'ŞEHRİN EN KİNCİ ŞAMPİYONU',
      victoryTitle: 'TÜM RAKİPLER NAKAVT!',
      victoryQuote: '"Downtown ve Uptown\'daki tüm hesaplar görüldü. Saçma kinin sonunda tatmin oldu."',
      p1WinTitle: '1. OYUNCU HESABI KESTİ!',
      p2WinTitle: '2. OYUNCU HESABI KESTİ!',
      vsWinQuote: '"Şehrin iki ucundan sonunda birbirinizi bulup trafiğin ortasında kapıştınız!"',
      challengerBanner: 'RAKİP BULUNDU!',
      fightSub: 'SOKAK DÖVÜŞÜ BAŞLADI!',
      mergedBanner: 'KARŞILAŞTILAR!',
      mergedSub: 'EKRAN BİRLEŞTİ — DÖVÜŞ!!',
      koBanner: 'K.O.!',
      koSub: 'HESAP GÖRÜLDÜ! +ÖFKE',
      subwayBanner: 'METRO EKSPRES',
      subwaySub: 'YOLCU ÖFKESİ! +%5 ÖFKE',
      copBanner: 'GÜVENLİK ŞEFİ GELDİ!',
      copSub: 'SEGWAY\'Lİ GÜVENLİK PEŞİNDE!',
      superBanner: 'ULTRA KİN BİTİRİŞİ!!',
      reasons: [
        'Son buzlu latte\'yi gözünün önünde aldı',
        '2019\'da yeni ayakkabına bastı',
        'Ofis asansörünün kapısını tutmadı',
        'Metroda dizinin finalini spoiler verdi',
        'Mesajına görüldü atıp cevap vermedi',
        'Kütüphane önünde İKİ park yerini kapladı',
        'Sinemada yüksek sesle mısır yedi'
      ],
      playerLowGrudgeLines: [
        'Dur ya... niye kızmıştım ben?',
        'Hava da bugün çok güzelmiş...',
        'Abarttım mı acaba?',
        'Ayaklarım ağrıdı, kahve mi içsem?',
        'O kadar da önemli değildi sanki...'
      ],
      playerShoutLines: [
        'HEY!! BURAYA GEL!!',
        'KAÇMA BENDEN!!',
        'YARIM KALAN HESABIMIZ VAR!!',
        'ÇIK KARŞIMA!!'
      ],
      calmedRivalLines: [
        'Kardeşim benim sinirim geçti ya.',
        'Derin nefes... iç huzur...',
        '10 dakika oldu, boş ver gitsin.',
        'Gel şurada ramen yiyelim?'
      ],
      distractionLines: [
        'Ooo ayakkabıda %40 indirim...',
        'Şu latte çok güzel koktu ya...',
        'İçerideki atari salonu açık mı?!'
      ]
    }
  };

  SG.currentLang = 'tr';
  SG.t = (key) => SG.I18N[SG.currentLang][key];
})(window.StreetGrudge);
