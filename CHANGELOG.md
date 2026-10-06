# Changelog & Release Notes

All notable changes to the TapTale platform are documented in this file.

---

## [v1.1.0] - Nationwide Heritage Expansion, Pull-to-Refresh & Resilient NFC Architecture

### 🚀 Overview
TapTale v1.1.0 marks a milestone release expanding our cryptographic heritage discovery network from regional highlights to a comprehensive nationwide registry spanning **Vilnius**, **Kaunas**, **Palanga**, **Trakai**, and **Šiauliai**. This update introduces resilient NFC error handling, manual monument passkey fallbacks, seamless pull-to-refresh data synchronisation, zero-latency vector brand iconography, and custom synthesized Baltic audio soundscapes.

---

### ✨ What's New (Features Implemented)

#### 1. 🏰 Nationwide Heritage Sites Expansion (21 Landmarks Total)
Added 14 meticulously curated national heritage landmarks with full historical lore, secret archival insights, travel tips, and multi-lingual (English & Lithuanian) guides:
* **Vilnius Expansion (+6 landmarks)**:
  * **St. Anne's Church (`vln-st-anne-church`)**: Europe's Flamboyant Gothic jewel crafted from 33 distinct clay brick patterns; legend of Napoleon's admiration.
  * **Hill of Three Crosses (`vln-three-crosses`)**: Soaring hilltop monument honoring 14th-century Franciscan martyrs with panoramic vistas.
  * **Palace of the Grand Dukes (`vln-grand-dukes-palace`)**: Restored royal residence and administrative epicenter of the Grand Duchy of Lithuania.
  * **Church of St. Peter and St. Paul (`vln-peter-paul-church`)**: Pearl of Lithuanian Baroque with over 2,000 stucco sculptures.
  * **Bastion of the Vilnius Defensive Wall (`vln-bastion`)**: Artillery fortification offering city panoramas and defensive heritage.
  * **Bernardine Garden (`vln-bernardine-garden`)**: Restored 19th-century botanical sanctuary between Castle Hill and the Vilnia River.
* **Kaunas Region (+5 landmarks)**:
  * **Kaunas Castle (`kns-kaunas-castle`)**: 14th-century brick fortress standing at the confluence of the Nemunas and Neris rivers.
  * **Pažaislis Monastery (`kns-pazaislis-monastery`)**: Crown jewel of Italian Baroque architecture in North-Eastern Europe.
  * **Kaunas Town Hall & Rotušės Square (`kns-town-hall`)**: The "White Swan" of Kaunas Old Town.
  * **Aleksotas Funicular & Observation Deck (`kns-aleksotas-funicular`)**: Operating since 1935, offering breathtaking vistas over Kaunas Old Town.
  * **Ninth Fort Memorial (`kns-ninth-fort`)**: Brutalist monument and poignant historical memorial.
* **Palanga Baltic Coast (+3 landmarks)**:
  * **Palanga Sea Pier (`plg-sea-pier`)**: 470-meter wooden bridge stretching into the sunset waves of the Baltic Sea.
  * **Palanga Amber Museum & Tiškevičiai Palace (`plg-amber-museum`)**: World-renowned Baltic gold collection set within an English landscape park.
  * **Birutė Hill & Botanical Sanctuary (`plg-birute-hill`)**: Ancient pagan sanctuary and dune shrine associated with Grand Duchess Birutė.

#### 2. 🔄 Native Pull-To-Refresh Experience
* Implemented dynamic pull-to-refresh with `RefreshControl` across the **Home** (`index.tsx`) and **Search** (`search.tsx`) screens.
* Pulling down triggers an immediate refresh of:
  * Real-time GPS location via `LocationService`
  * Dynamic distances and walking/driving arrival estimations
  * Monument unlock and 30-day access pass status
  * Spot ordering and nearest landmark calculation

#### 3. 🛡️ Robust NFC Error Handling & Safe Passkey Fallback
* **Hardware & Simulator Detection**: Enhanced `NfcService.isHardwareSupported()` and `NfcService.scanPhysicalTag()` to gracefully identify when running on an iOS Simulator or on devices without NFC hardware, preventing crashes and unhandled exceptions.
* **Physical Passkey Verification Modal**:
  * Designed an accessible modal fallback allowing travelers to unlock monument stories by entering the physical security passkey engraved on the monument plaque (e.g., `ONA-1495`, `TRK-1409`, `PILIS-1361`).
  * Enforces proximity-aware geo-radius verification to ensure authentic visitor presence.
* **iOS CoreNFC Entitlements**:
  * Configured `com.apple.developer.nfc.readersession.formats` (`NDEF`, `TAG`) in `app.json` for proper Apple App Store capability declaration.

#### 4. 🎨 Zero-Latency SVG Brand Icons & Visual Polish
* Implemented native vector SVG brand icons in `src/components/brand-icons.tsx`:
  * Official Google Android Robot (`AndroidLogo`)
  * Multi-colored Google Play Logo (`GooglePlayLogo`)
  * Official Apple Logo (`AppleLogo`)
  * Clean utilities: `ClockIcon`, `CloudIcon`, `SearchIcon`, `MailIcon`, `ArrowLeftIcon`
* Eliminated external asset download dependencies and image pop-in artifacts (0ms render time).
* **UI Banner Cleanup**: Removed the intrusive white banner from the main screen layout, delivering an edge-to-edge immersive experience with responsive safe-area insets.

#### 5. 🎵 Custom Synthesized Baltic Soundscapes
* Enhanced `src/services/audio-service.ts` with custom procedural Web Audio synthesis for newly introduced landmarks:
  * Cathedral bells and sacred choral hymns for St. Anne's and Kaunas Town Hall
  * Baltic kanklės drone and ancient horns for Birutė Hill and Gediminas Tower
  * Resonant Baroque organ preludes for Pažaislis Monastery and St. Peter & St. Paul Church
  * Renaissance harpsichord and strings for Grand Dukes Palace and Amber Museum
  * Medieval kettle drums and castle winds for Trakai, Kaunas Castle, and Vilnius Bastion
  * Rosary wind chimes and Baltic sea breeze for Palanga Sea Pier

#### 6. 🏆 Expanded Achievement Badges & Lithuanian Localization
* Added new discovery badges in `src/services/user-storage.ts`:
  * **Master of Vilnius (`badge-vilnius-master`)**: Unlocked by visiting 5+ landmarks across Vilnius.
  * **Kaunas Fortress Conqueror (`badge-kaunas-explorer`)**: Unlocked by exploring Kaunas historic sites.
  * **Amber Coast Pioneer (`badge-palanga-coast`)**: Unlocked by experiencing Palanga's coastal wonders.
* Dynamically localized achievement titles, descriptions, and criteria in both Lithuanian (`lt`) and English (`en`).

---

### 🐛 Bug & Error Fixes
1. **NFC Crash on Unsupported Platforms**: Resolved fatal errors when initializing CoreNFC on devices or simulators without NFC hardware. Added friendly descriptive guidance instead of unhandled promise rejections.
2. **Category Filter Gaps**: Updated category filters in `search.tsx` to properly recognize the full suite of castles, bastions, monasteries, and cultural sites.
3. **Safe Area Inset Glitches**: Refactored header padding to leverage `useSafeAreaInsets()` dynamically, eliminating overlap with the iOS dynamic island and status bar.
4. **Offline Image Assets**: Added high-resolution offline bundled assets for newly added spotlight landmarks (`st_anne_church.jpg`, `three_crosses.jpg`, `grand_dukes_palace.jpg`) to ensure 100% offline availability.

---

### 🔒 Safety & Cryptographic Integrity
* Cryptographic NFC payloads validate against SHA-256 HMAC tokens.
* Dual unlock paths (Cryptographic NDEF scan vs On-site Passkey) preserve tamper-resistance while ensuring accessibility for all visitors.
