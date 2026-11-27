# STREET GRUDGE — Ultra-Realistic Top-Down Arcade Fighter (v2)

Satirical 2D top-down open-world arcade fighting & exploration game. No instant arena spawns — fighters start their day scattered across **Downtown & Uptown** and must hunt each other down before their **Grudge Meter** runs out and they literally forget why they were mad!

## Çalıştırma / How to Play
Hiçbir sunucu veya kurulum gerekmez!
1. `index.html` dosyasına çift tıklayıp herhangi bir modern tarayıcıda (Chrome, Edge, Firefox) açın.
2. **1P Açık Dünya (6 AI Rakip)** veya **2P Yerel Bölünmüş Ekran (Split-Screen)** modunu seçin.

## Özellikler / Features
- **Bölünmüş Ekran → Birleşen Kavga (2P Modu):** 2 oyunculu modda iki oyuncu şehrin karşı uçlarında başlar; ekran otomatik ikiye bölünür ve sokakta karşılaştıkları an tek ekranda arcade kavgasına birleşir!
- **Öfke / Sakinleşme Barı (Grudge Meter):** Yürüdükçe öfke azalır. `%70+` iken `+%35` hasar ve özel hareketler açıktır. `%0`'a inerse karakter neden sinirlendiğini unutur ve dövüş iptal olur!
- **6 Eşsiz Rakip & Yapay Zeka Durum Makinesi (`AI FSM`):** `DailyRoutine_Wander`, `Searching`, `Aggro_Combat`, `CalmedDown` — her rakibin kendine özgü özel saldırısı vardır (Asphalt Slam, Lightning Spin, Coffee Hadouken, Quarterly Lariat, Flame Crosswalk, Psycho Commute).
- **Canlı Şehir & Metro Ekspresi:** Trafik ışıkları, korna çalan arabalar, kaçışan yayalar, kırılabilir yangın muslukları (su fışkırtır), espresso/taco düşüren çöp kutuları ve Downtown ↔ Uptown Metro Ekspres hattı.

## Modüler Dosya Yapısı
- `index.html` — Oyun arayüzü ve HUD iskeleti
- `styles.css` — %100 çevrimdışı çizgi-roman / retro arcade stilleri
- `src/config.js` — Sabitler, TR/EN dil paketi, 6 rakip dövüşçü profili
- `src/audio.js` — Prosedürel Web Audio API ses motoru
- `src/world.js` — Downtown/Uptown harita düzeni, binalar, metro, asansör, çarpışma fiziği
- `src/fighters.js` — Dövüşçü sınıfı, öfke çarpanı ve saldırı mekanikleri
- `src/renderer.js` — Cel-shaded çizgi roman 2D renderer, 3D paralaks çatılar, 2P split-screen, minimap
- `src/game.js` — Ana oyun döngüsü, 1P/2P girdi yönetimi, AI FSM ve HUD senkronizasyonu
