import subprocess
import os

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <!-- Background Gradient: Deep Forest Green matching WiseColors.primary -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#246e44"/>
      <stop offset="45%" stop-color="#1d5c38"/>
      <stop offset="100%" stop-color="#0a2114"/>
    </linearGradient>

    <!-- Radial Central Glow -->
    <radialGradient id="centerGlow" cx="50%" cy="48%" r="48%">
      <stop offset="0%" stop-color="#3baa6b" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#1d5c38" stop-opacity="0"/>
    </radialGradient>

    <!-- Golden Highlight Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>

    <!-- Pure White Bolt Gradient -->
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E8F4EC"/>
    </linearGradient>

    <!-- Depth Shadow for Central Emblem -->
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#040e08" flood-opacity="0.6"/>
    </filter>

    <filter id="boltGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#0e3a20" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Base Icon Background -->
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  <rect width="1024" height="1024" fill="url(#centerGlow)"/>

  <!-- Concentric NFC Radar Arcs (Top Heritage Signals) -->
  <g fill="none" stroke="#FFFFFF" stroke-linecap="round" opacity="0.28">
    <path d="M 334 260 A 240 240 0 0 1 690 260" stroke-width="24"/>
    <path d="M 244 190 A 350 350 0 0 1 780 190" stroke-width="26"/>
    <path d="M 160 120 A 470 470 0 0 1 864 120" stroke-width="28"/>
  </g>

  <!-- Central Plaque Badge (Matches TapTale wiseFlagBadge) -->
  <g filter="url(#cardShadow)">
    <!-- Squircle Plaque Shape -->
    <rect x="232" y="212" width="560" height="600" rx="148" fill="#246e44" stroke="rgba(255, 255, 255, 0.22)" stroke-width="8"/>

    <!-- Inner Plaque Border Highlight -->
    <rect x="254" y="234" width="516" height="556" rx="126" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="4"/>

    <!-- The Official TapTale ⚡ Bolt Icon -->
    <path d="M 552 292 
             L 364 532 
             L 512 532 
             L 456 732 
             L 672 472 
             L 524 472 
             Z"
          fill="url(#boltGrad)"
          stroke="#FFFFFF"
          stroke-width="14"
          stroke-linejoin="round"
          stroke-linecap="round"
          filter="url(#boltGlow)"/>

    <!-- Golden Tag Verification Dot -->
    <circle cx="512" cy="758" r="9" fill="url(#goldGrad)"/>
  </g>

  <!-- Clean Bottom Accent Pill -->
  <rect x="442" y="868" width="140" height="10" rx="5" fill="#FFFFFF" opacity="0.4"/>
</svg>
"""

svg_path = "scripts/app-icon.svg"
with open(svg_path, "w") as f:
    f.write(svg_content)

print("Saved SVG.")

# 1. Generate main 1024x1024 icon.png
icon_png = "assets/images/icon.png"
subprocess.run(["sips", "-s", "format", "png", svg_path, "--out", icon_png], check=True)
print(f"Generated {icon_png}")

# 2. Generate iOS AppIcon.appiconset
ios_icon_dir = "ios/taptale/Images.xcassets/AppIcon.appiconset"
os.makedirs(ios_icon_dir, exist_ok=True)
ios_app_icon = os.path.join(ios_icon_dir, "App-Icon-1024x1024@1x.png")
subprocess.run(["sips", "-s", "format", "png", svg_path, "--out", ios_app_icon], check=True)
print(f"Generated {ios_app_icon}")

# Update Contents.json in AppIcon.appiconset
contents_json = """{
  "images" : [
    {
      "filename" : "App-Icon-1024x1024@1x.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""
with open(os.path.join(ios_icon_dir, "Contents.json"), "w") as f:
    f.write(contents_json)
print("Updated iOS AppIcon Contents.json")

# 3. Generate Android Adaptive Icons
android_foreground = "assets/images/android-icon-foreground.png"
android_bg = "assets/images/android-icon-background.png"
subprocess.run(["sips", "-s", "format", "png", svg_path, "--out", android_foreground], check=True)

# Generate simple background for Android
bg_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#1d5c38"/>
</svg>"""
bg_svg_path = "scripts/android-bg.svg"
with open(bg_svg_path, "w") as f:
    f.write(bg_svg)
subprocess.run(["sips", "-s", "format", "png", bg_svg_path, "--out", android_bg], check=True)
os.remove(bg_svg_path)
print("Generated Android icons")

# 4. Generate splash icon
splash_icon = "assets/images/splash-icon.png"
subprocess.run(["sips", "-z", "256", "256", icon_png, "--out", splash_icon], check=True)
print(f"Generated {splash_icon}")

# 5. Generate favicon
favicon = "assets/images/favicon.png"
subprocess.run(["sips", "-z", "64", "64", icon_png, "--out", favicon], check=True)
print(f"Generated {favicon}")
