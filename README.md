# STREET GRUDGE v3 — Director's Cut

Satirical 2D arcade fighting & city-search game blending **Classic 2-Screen Side-View Street Fighter** action with a **Top-Down Open-World** city brawl. No instant arena spawns — fighters start their day across town and must hunt each other down before their **Grudge Meter** hits `0%` and they literally forget why they were mad!

## Çalıştırma & Başlatıcılar / How to Play & Launchers

Hiçbir sunucu, derleme veya kurulum gerekmez (**%100 çevrimdışı**):

- **Modüler Sürüm:** `index.html` dosyasına çift tıklayıp herhangi bir modern tarayıcıda (Chrome, Edge, Firefox) açın.
- **Tek Dosya (Portable) Sürüm:** `street-grudge-tek-dosya.html` — tüm CSS ve `src/*.js` modülleri tek bir çevrimdışı HTML dosyasına gömülüdür; tek başına taşınıp açılabilir.
- **Masaüstü Tek-Tık Başlatıcılar (Desktop Launchers):**
  - **Windows:** `OYUNU_BASLAT.bat`
  - **macOS:** `OYUNU_BASLAT.command`
  - **Web Kısayolu:** `Street_Grudge_Oyna.url`

## Oyun Modları / Game Modes (v3 Director's Cut)

1. **Street Fighter: 2 Ekran Yan Görünüm (1P → vs AI ←)** *(Varsayılan)* — Sol ekranda 1. Oyuncu batıdan sağa (`→`), sağ ekranda AI rakip doğudan sola (`←`) ilerler. İki dövüşçü aynı katta karşılaştığı an bölünmüş ekran parçalanır ve klasik tek ekran 2D Street Fighter arenasına birleşir!
2. **Street Fighter: 2 Ekran Yan Görünüm (2P Yerel)** — Aynı klavyede 2 oyunculu yerel yan görünüm kovalamaca ve birleşen arcade kapışması.
3. **Açık Dünya Top-Down (1P vs 6 AI FSM Rakip)** — Downtown & Uptown açık şehir haritasında 6 benzersiz yapay zeka rakibi, Metro Ekspres hattı ve Segway'li Güvenlik Şefi (Mall Cop).

## v3 Director's Cut Özellikleri / Features

- **3 Katlı Şehir (3 Interconnected Vertical Floors — `src/sidefighter.js`):**
  - **Kat 0:** Metro Tüneli (`Subway Tunnel`)
  - **Kat 1:** Ana Cadde (`Main Street`)
  - **Kat 2:** Ofis & Üst Geçit (`Office Skybridge`)
  - Parlayan merdiven ve asansörlerde `[W]` / `[↑]` ile kat değiştirip rakibin önünü kesin.
- **4 Oynanabilir Dövüşçü (4 Playable Fighters):**
  - **KEREM "HADOU-KAHVE"** — Dengeli Karateci • Ateş Topu (`Kin Hadou-Dalgası` / `Petty Hadou-Blast`)
  - **DEMİR "BÜRO TANKI"** — Ağır Dövüşçü (+HP) • Şok Dalgası (`Asfalt Depremi` / `Asphalt Slam`)
  - **ZEYNEP "METRO RÜZGARI"** — Ultra Hızlı • Kasırga Tekmesi (`Metro Kasırgası` / `Subway Cyclone`)
  - **KADİR "KALDIRIM KRALI"** — Agresif • 3'lü Alev Yayılımı (`Üçlü Kin Alevi` / `Triple Petty Flame`)
- **Kusursuz Parry (`[L]`) & Ultra Süper (`[U]`):**
  - Tam darbe anında blok (`[L]`) zamanlayarak **Perfect Parry** yapın ve karşı saldırı penceresi açın.
  - **SUPER %100** dolduğunda `[U]` ile sinematik **Ultra Super** bitirici hareketini patlatın.
- **Öfke / Sakinleşme Barı (Grudge Meter):** Yürüdükçe öfke azalır. `%70+` iken `+%35` hasar ve özel hareketler açıktır. `%0`'a inerse karakter neden sinirlendiğini unutur ve dövüş iptal olur!
- **6 Eşsiz Top-Down Rakip & AI FSM:** `DailyRoutine_Wander`, `Searching`, `Aggro_Combat`, `CalmedDown` durum makinesi, sokak silahları fırlatma (`[C]`), kırılabilir yangın muslukları/çöp kutuları, espresso/taco takviyeleri ve Segway'li Mall Cop.
- **Uyarlanabilir Chiptune BGM & Web Audio SFX:** Harici ses dosyası gerektirmeyen prosedürel müzik/efekt motoru, TR/EN dil değiştirici, mobil dokunmatik kontroller ve katı `file://`/özel pencere/iframe ortamlarında hatasız çalışan korumalı `localStorage` katmanı.

## Modüler Dosya Yapısı / Architecture

- `index.html` — Oyun arayüzü, HUD iskeleti ve sıkı CSP başlıkları
- `styles.css` — %100 çevrimdışı çizgi-roman / retro arcade stilleri
- `street-grudge-tek-dosya.html` — `styles.css` ve tüm `src/*.js` modülleriyle birebir senkronize tek dosya çevrimdışı paket
- `src/security.js` — Güvenli `localStorage` yardımcıları (`getSafeStorage`, `safeGetItem`/`safeSetItem`/`safeRemoveItem`, `readBoundedInt`/`writeBoundedInt`), XSS/CSP metin ve renk doğrulama
- `src/config.js` — Sabitler, TR/EN dil paketi, 4 oynanabilir dövüşçü ve 6 rakip profili
- `src/audio.js` — Prosedürel Web Audio API ses efektleri ve uyarlanabilir chiptune BGM
- `src/world.js` — Downtown/Uptown harita düzeni, binalar, metro, asansör, çarpışma fiziği
- `src/fighters.js` — Dövüşçü sınıfı, öfke çarpanı, parry/süper ve saldırı mekanikleri
- `src/renderer.js` — Cel-shaded çizgi roman 2D renderer, 3D paralaks çatılar, split-screen ve minimap
- `src/sidefighter.js` — v3 Yan görünüm 2 ekran Street Fighter arama motoru, 3 katlı sahne, merdiven/asansör ve arena birleşimi
- `src/game.js` — Birleşik oyun döngüsü (`sf1p`, `sf2p`, `topdown`), girdi yönetimi, AI FSM, korumalı skor kaydı ve HUD senkronizasyonu
- `OYUNU_BASLAT.bat` / `OYUNU_BASLAT.command` / `Street_Grudge_Oyna.url` — Masaüstü ve web başlatıcılar

## Doğrulama & Testler / Verification & Tests

```bash
for f in src/*.js; do node --check "$f"; done
node --test tests/security.test.js tests/smoke.test.mjs
```
