/**
 * Street Grudge — Configuration, Localization (EN/TR), and Character Roster
 * Clean modular namespace (works directly via file:// without a local server).
 */
window.StreetGrudge = window.StreetGrudge || {};

(function (SG) {
  'use strict';

  SG.WORLD_W = 3000;
  SG.WORLD_H = 2200;
  SG.DOWNTOWN_SPLIT_X = 1520; // West = Downtown, East = Uptown

  // Explicit Enemy AI Finite State Machine states
  SG.AI_STATES = Object.freeze({
    WANDER: 'DailyRoutine_Wander',
    SEARCH: 'Searching',
    COMBAT: 'Aggro_Combat',
    CALMED: 'CalmedDown'
  });

  SG.I18N = {
    en: {
      subtitle: '"ULTRA-REALISTIC STREET FIGHTER" EDITION',
      pitch: 'No instant arena spawns! Fighters start their day scattered across <b>Downtown &amp; Uptown</b> — in subways, library alleys, street corners, and office elevators. Track down your rival fast: as time passes, your <b>GRUDGE METER</b> drains. Take too long and you\'ll literally <b>forget why you were mad</b> and cancel the fight!',
      card1Title: '1. ROAM & TRACK',
      card1Body: 'Explore Downtown & Uptown, ride the Subway shortcut, and yell to ping nearby rivals.',
      card2Title: '2. STAY ANGRY',
      card2Body: 'High Grudge = <b>+35% damage</b> & <b>Special Moves</b>. Smash trash cans for Espresso boosts!',
      card3Title: '3. DON\'T CALM DOWN',
      card3Body: 'If Grudge hits <b>0%</b>, your fighter shrugs and cancels the fight in an anticlimactic draw!',
      mode1p: '1P OPEN WORLD (vs 6 AI)',
      mode2p: '2P LOCAL SPLIT-SCREEN',
      startBtn: 'START THE DAY!',
      playAgainBtn: 'START A NEW PETTY GRUDGE [R]',
      p1Name: 'P1 (PETTY FIGHTER)',
      p2Name: 'P2 (RIVAL COMMUTER)',
      grudge: 'GRUDGE',
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
      ]
    },
    tr: {
      subtitle: '"ULTRA-GERÇEKÇİ STREET FIGHTER" SÜRÜMÜ',
      pitch: 'Anında arena yok! Dövüşçüler güne <b>Downtown &amp; Uptown</b>\'da rastgele yerlerde başlıyor — metrolar, kütüphane arka sokakları, ofis asansörleri! Rakibi çabuk bul: zaman geçtikçe <b>ÖFKE / KİN BARIN</b> erir. Çok geç kalırsan <b>neden sinirlendiğini unutur</b> ve dövüşü iptal edersin!',
      card1Title: '1. ŞEHRİ GEZ & BUL',
      card1Body: 'Downtown ve Uptown\'ı dolaş, Metro kestirmesini kullan ve bağırarak rakiplerin yerini bul.',
      card2Title: '2. ÖFKELİ KAL',
      card2Body: 'Yüksek Öfke = <b>+%35 hasar</b> ve <b>Özel Hareket</b>. Çöp kutularından Espresso topla!',
      card3Title: '3. SAKİNLEŞME!',
      card3Body: 'Öfke <b>%0</b> olursa karakter omuz silker ve dövüş iptal olur (Berabere)!',
      mode1p: '1P AÇIK DÜNYA (6 AI RAKİP)',
      mode2p: '2P YEREL BÖLÜNMÜŞ EKRAN',
      startBtn: 'GÜNE BAŞLA!',
      playAgainBtn: 'YENİ KİN BAŞLAT [R]',
      p1Name: 'O1 (KİNCİ DÖVÜŞÇÜ)',
      p2Name: 'O2 (RAKİP YOLCU)',
      grudge: 'ÖFKE',
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
      ]
    }
  };

  SG.currentLang = 'tr';
  SG.t = (key) => SG.I18N[SG.currentLang][key];

  // 6 Distinct Rival Fighters with Unique Special Move Archetypes
  SG.RIVAL_ROSTER = [
    {
      id: 'ryo',
      name: 'RYO "COMMUTER"',
      giColor: '#facc15',
      trimColor: '#111111',
      skinColor: '#f5cfa0',
      hairColor: '#1e1b18',
      bandanaColor: '#ef4444',
      r: 20,
      maxHp: 115,
      speed: 195,
      specialKind: 'fireball',
      specialName: 'COFFEE HADOUKEN!',
      specialColor: '#38bdf8',
      taunts: ['MY TRAIN WAS DELAYED!', 'TORN GI, FULL FURY!', 'DON\'T TOUCH MY BRIEFCASE!']
    },
    {
      id: 'brutus',
      name: 'BRUTUS "POTHOLER"',
      giColor: '#4ade80',
      trimColor: '#1d4ed8',
      skinColor: '#86efac',
      hairColor: '#14532d',
      bandanaColor: '#f97316',
      r: 24,
      maxHp: 150,
      speed: 168,
      specialKind: 'shockwave',
      specialName: 'ASPHALT SLAM!',
      specialColor: '#84cc16',
      taunts: ['BRUTUS SMASH SIDEWALK!', 'GET OUTTA MY ALLEY!', 'GRAAAH!!']
    },
    {
      id: 'chun',
      name: 'CHUN-LIQUID',
      giColor: '#3b82f6',
      trimColor: '#fde047',
      skinColor: '#fde2c4',
      hairColor: '#1c1917',
      bandanaColor: '#ffffff',
      r: 18,
      maxHp: 105,
      speed: 228,
      specialKind: 'cyclone',
      specialName: 'LIGHTNING SPIN!',
      specialColor: '#60a5fa',
      taunts: ['TOO SLOW FOR UPTOWN!', 'WATCH THE KICKS!', 'JUST FINISHED PILATES!']
    },
    {
      id: 'dorado',
      name: 'EL DORADO',
      giColor: '#f59e0b',
      trimColor: '#b91c1c',
      skinColor: '#eab308',
      hairColor: '#dc2626',
      bandanaColor: '#ef4444',
      r: 21,
      maxHp: 125,
      speed: 198,
      specialKind: 'lariat',
      specialName: 'QUARTERLY LARIAT!',
      specialColor: '#fbbf24',
      taunts: ['GOING DOWN?!', 'MY CAPE CAUGHT IN THE DOOR!', 'SYNERGY SUPLEX!!']
    },
    {
      id: 'kenji',
      name: 'KENJI "JAYWALKER"',
      giColor: '#ef4444',
      trimColor: '#111111',
      skinColor: '#f3caa0',
      hairColor: '#fde047',
      bandanaColor: '#111111',
      r: 20,
      maxHp: 120,
      speed: 210,
      specialKind: 'triple_flame',
      specialName: 'FLAME CROSSWALK!',
      specialColor: '#fb923c',
      taunts: ['I NEVER WAIT FOR GREEN!', 'YOU LOOKIN\' AT ME?!', 'FEEL THE HEAT!']
    },
    {
      id: 'bison',
      name: 'MADAME BISON-NETTE',
      giColor: '#9333ea',
      trimColor: '#facc15',
      skinColor: '#f5d0b5',
      hairColor: '#3b0764',
      bandanaColor: '#dc2626',
      r: 21,
      maxHp: 135,
      speed: 205,
      specialKind: 'psycho_beam',
      specialName: 'PSYCHO COMMUTE!',
      specialColor: '#c084fc',
      taunts: ['FOR ME, IT WAS TUESDAY!', 'BOW TO THE BOSS!', 'BOWL \'EM OVER!']
    }
  ];
})(window.StreetGrudge);
