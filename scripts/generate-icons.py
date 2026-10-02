import os
import subprocess

icons = {
    "apple.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 170 170">
  <path fill="#FFFFFF" d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.07-7.63-7.85-11.78-14.35-5.91-9.26-10.36-19.53-13.34-30.82-2.98-11.29-4.47-21.94-4.47-31.95 0-14.15 3.52-25.75 10.57-34.81 7.05-9.06 16.03-13.68 26.94-13.88 4.8.08 10.15 1.34 16.05 3.79 5.9 2.45 9.77 3.73 11.61 3.84 2.22-.22 6.29-1.57 12.2-4.05 5.91-2.48 11.06-3.64 15.46-3.48 11.83.67 21.36 4.96 28.59 12.87-10.45 6.3-15.6 15.01-15.46 26.13.14 8.78 3.53 16.14 10.17 22.08 6.64 5.94 14.51 9.4 23.61 10.38-2.39 7.3-5.32 14.73-8.79 22.28zM119.22 33.15c0-6.72 2.44-12.89 7.33-18.52 4.89-5.63 10.87-9.35 17.94-11.16.22 1.45.33 2.76.33 3.93 0 6.6-2.6 13.01-7.8 19.22-5.2 6.21-11.45 9.87-18.75 10.99-.44-1.34-.66-2.58-.66-3.71z"/>
</svg>""",

    "apple-black.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 170 170">
  <path fill="#000000" d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.07-7.63-7.85-11.78-14.35-5.91-9.26-10.36-19.53-13.34-30.82-2.98-11.29-4.47-21.94-4.47-31.95 0-14.15 3.52-25.75 10.57-34.81 7.05-9.06 16.03-13.68 26.94-13.88 4.8.08 10.15 1.34 16.05 3.79 5.9 2.45 9.77 3.73 11.61 3.84 2.22-.22 6.29-1.57 12.2-4.05 5.91-2.48 11.06-3.64 15.46-3.48 11.83.67 21.36 4.96 28.59 12.87-10.45 6.3-15.6 15.01-15.46 26.13.14 8.78 3.53 16.14 10.17 22.08 6.64 5.94 14.51 9.4 23.61 10.38-2.39 7.3-5.32 14.73-8.79 22.28zM119.22 33.15c0-6.72 2.44-12.89 7.33-18.52 4.89-5.63 10.87-9.35 17.94-11.16.22 1.45.33 2.76.33 3.93 0 6.6-2.6 13.01-7.8 19.22-5.2 6.21-11.45 9.87-18.75 10.99-.44-1.34-.66-2.58-.66-3.71z"/>
</svg>""",

    "google.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  <path fill="none" d="M0 0h48v48H0z"/>
</svg>""",

    "lock.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2.5" ry="2.5"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  <circle cx="12" cy="16" r="1.5" fill="#64748B"/>
  <path d="M12 17.5v2"/>
</svg>""",

    "eye.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3.5" fill="#64748B"/>
</svg>""",

    "eye-off.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>""",

    "mail.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="4" width="20" height="16" rx="2.5" ry="2.5"/>
  <polyline points="22,6 12,13 2,6"/>
</svg>""",

    "user.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>""",

    "calendar.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>""",

    "camera.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#003c14" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
  <circle cx="12" cy="13" r="4"/>
</svg>""",

    "arrow-left.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="19" y1="12" x2="5" y2="12"/>
  <polyline points="12 19 5 12 12 5"/>
</svg>""",

    "arrow-left-white.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="19" y1="12" x2="5" y2="12"/>
  <polyline points="12 19 5 12 12 5"/>
</svg>"""
}

target_dir = "assets/images/icons"
os.makedirs(target_dir, exist_ok=True)

for name, svg in icons.items():
    svg_path = os.path.join(target_dir, name)
    png_name = name.replace(".svg", ".png")
    png_path = os.path.join(target_dir, png_name)
    with open(svg_path, "w") as f:
        f.write(svg)
    subprocess.run(["sips", "-s", "format", "png", svg_path, "--out", png_path], check=True)
    os.remove(svg_path)
    print(f"Generated {png_path}")
