/**
 * Custom SVG Movie Art Generator
 * Generates beautiful, high-quality vector posters and backdrops
 * as base64 Data URLs to ensure a premium cinema aesthetic without TMDB.
 */

function getSvgDataUrl(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

// Custom vector graphics for posters (300 x 450)
const POSTERS: Record<string, string> = {
  'project hail mary': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <defs>
        <radialGradient id="bg-phm" cx="50%" cy="32%" r="75%">
          <stop offset="0%" stop-color="#2a125a" />
          <stop offset="55%" stop-color="#0c0421" />
          <stop offset="100%" stop-color="#03010b" />
        </radialGradient>
        <radialGradient id="star-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fff399" />
          <stop offset="55%" stop-color="#f97316" />
          <stop offset="80%" stop-color="#dc2626" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#03010b" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="nebula-cyan" cx="20%" cy="30%" r="40%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#03010b" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="nebula-magenta" cx="80%" cy="70%" r="45%">
          <stop offset="0%" stop-color="#d946ef" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#03010b" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="thruster-beam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#03010b" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-phm)" />
      
      <!-- Nebulae overlay -->
      <rect width="100%" height="100%" fill="url(#nebula-cyan)" />
      <rect width="100%" height="100%" fill="url(#nebula-magenta)" />

      <!-- Rich Cosmic Starfield -->
      <circle cx="35" cy="45" r="1.2" fill="#fff" opacity="0.9" />
      <circle cx="85" cy="25" r="0.8" fill="#fff" opacity="0.6" />
      <circle cx="140" cy="55" r="1" fill="#67e8f9" opacity="0.8" />
      <circle cx="220" cy="35" r="1.5" fill="#fff" opacity="0.9" />
      <circle cx="265" cy="75" r="1" fill="#fff" opacity="0.7" />
      <circle cx="45" cy="120" r="1.5" fill="#fef08a" opacity="0.85" />
      <circle cx="280" cy="160" r="0.8" fill="#fff" opacity="0.5" />
      <circle cx="25" cy="220" r="1.1" fill="#fff" opacity="0.7" />
      <circle cx="95" cy="270" r="0.9" fill="#67e8f9" opacity="0.6" />
      <circle cx="250" cy="280" r="1.4" fill="#fff" opacity="0.8" />

      <!-- Concentric Orbital Trajectory Rays (Matching Spider-Man's Web Lines) -->
      <g stroke="rgba(56, 189, 248, 0.22)" stroke-width="1" fill="none" transform="translate(150, 140) rotate(-18)">
        <ellipse cx="0" cy="0" rx="45" ry="18" />
        <ellipse cx="0" cy="0" rx="85" ry="34" />
        <ellipse cx="0" cy="0" rx="130" ry="52" />
        <ellipse cx="0" cy="0" rx="180" ry="72" />
        <line x1="0" y1="0" x2="-150" y2="-100" />
        <line x1="0" y1="0" x2="150" y2="-100" />
        <line x1="0" y1="0" x2="-150" y2="150" />
        <line x1="0" y1="0" x2="150" y2="150" />
      </g>

      <!-- Astrophage Devouring Sun Core -->
      <circle cx="150" cy="140" r="95" fill="url(#star-core)" />

      <!-- Astrophage Luminous Red-Gold Arc Stream -->
      <path d="M30,180 Q110,90 190,110 T270,170" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="4 4" opacity="0.9" />
      <path d="M40,175 Q120,95 185,115 T265,165" fill="none" stroke="#facc15" stroke-width="1.8" opacity="0.95" />

      <!-- Hail Mary Spacecraft Silhouette -->
      <g transform="translate(150, 140) rotate(-25)">
        <!-- Thruster Glow -->
        <polygon points="-30,-4 -12,0 -30,4" fill="url(#thruster-beam)" opacity="0.9" />
        <line x1="-12" y1="0" x2="-45" y2="0" stroke="#38bdf8" stroke-width="2.5" opacity="0.85" />
        <!-- Engine & Fuel Modules -->
        <rect x="-12" y="-6" width="12" height="12" rx="2" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <line x1="0" y1="-18" x2="0" y2="18" stroke="#f8fafc" stroke-width="1.8" />
        <circle cx="0" cy="-18" r="4" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <circle cx="0" cy="18" r="4" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <!-- Command Module -->
        <path d="M0,-5 L28,-2 L36,0 L28,2 L0,5 Z" fill="#f8fafc" />
        <line x1="14" y1="-24" x2="14" y2="24" stroke="#38bdf8" stroke-width="1.5" />
      </g>

      <!-- Bottom Branding / Title -->
      <rect x="0" y="350" width="300" height="100" fill="rgba(3,1,11,0.88)" />
      <line x1="30" y1="350" x2="270" y2="350" stroke="#d4af37" stroke-width="1" opacity="0.4" />
      <text x="150" y="392" font-family="'Inter', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">PROJECT HAIL MARY</text>
      <text x="150" y="415" font-family="'Inter', sans-serif" font-size="9" font-weight="600" fill="#d4af37" text-anchor="middle" letter-spacing="3">R RATING · SCI-FI EPIC</text>
    </svg>
  `),
  'michael': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <defs>
        <!-- Stage background gradient -->
        <radialGradient id="bg-mj" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#400b14" />
          <stop offset="45%" stop-color="#170307" />
          <stop offset="100%" stop-color="#050102" />
        </radialGradient>
        
        <!-- Stage Floor Pool of Light -->
        <radialGradient id="stage-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.45" />
          <stop offset="50%" stop-color="#ca8a04" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#170307" stop-opacity="0" />
        </radialGradient>
        
        <!-- Gold Rim Light Gradient -->
        <linearGradient id="gold-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>

        <!-- Main Gold Volumetric Spotlight -->
        <linearGradient id="spot-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.28" />
          <stop offset="50%" stop-color="#eab308" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#050102" stop-opacity="0" />
        </linearGradient>

        <!-- Crimson Backdrop Spotlight -->
        <linearGradient id="spot-crimson" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.22" />
          <stop offset="60%" stop-color="#881337" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#050102" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Stage Background -->
      <rect width="100%" height="100%" fill="url(#bg-mj)" />

      <!-- Concentric Sound/Light Waves (Spider-Man Composition Style) -->
      <g stroke="rgba(234, 179, 8, 0.15)" stroke-width="0.8" fill="none">
        <circle cx="150" cy="180" r="40" />
        <circle cx="150" cy="180" r="85" />
        <circle cx="150" cy="180" r="135" />
        <circle cx="150" cy="180" r="190" />
        
        <!-- Radiating lines for stage environment -->
        <line x1="150" y1="180" x2="-20" y2="40" />
        <line x1="150" y1="180" x2="320" y2="40" />
        <line x1="150" y1="180" x2="-20" y2="320" />
        <line x1="150" y1="180" x2="320" y2="320" />
      </g>

      <!-- Volumetric stage spotlights -->
      <polygon points="150,-20 -50,350 250,350" fill="url(#spot-gold)" />
      <polygon points="250,-20 50,350 350,350" fill="url(#spot-crimson)" />

      <!-- Stage Floor Pool of Light -->
      <ellipse cx="150" cy="305" rx="75" ry="18" fill="url(#stage-glow)" />

      <!-- Stadium Audience Lights (Subtle Sparks) -->
      <g fill="#ffffff" opacity="0.65">
        <circle cx="45" cy="120" r="1" fill="#fef08a" />
        <circle cx="265" cy="140" r="1" />
        <circle cx="95" cy="70" r="1.2" fill="#f43f5e" />
        <circle cx="215" cy="90" r="1" />
        <circle cx="35" cy="240" r="1.2" />
        <circle cx="270" cy="220" r="1" fill="#fef08a" />
      </g>

      <!-- Stylized Silhouette of the Performer -->
      <g transform="translate(150, 182)">
        <!-- Torso & Jacket -->
        <path d="M -12,-15 C -15,-5 -18,15 -18,30 L 12,30 C 12,15 10,-5 8,-15 Z" fill="#0d0406" />
        <path d="M -12,-15 L -2,30 L -18,30 Z" fill="#060102" />
        
        <!-- White shirt peek -->
        <polygon points="-4,-15 4,-15 0,-2" fill="#ffffff" />
        
        <!-- Head -->
        <circle cx="-1" cy="-24" r="7" fill="#0d0406" />
        
        <!-- Fedora Hat tilted forward -->
        <path d="M -16,-28 C -16,-34 -6,-37 6,-35 C 14,-34 18,-30 15,-26 C 9,-25 -3,-26 -16,-28 Z" fill="#080204" stroke="url(#gold-rim)" stroke-width="0.8" />
        <path d="M -10,-29 C -8,-40 6,-38 10,-31 Z" fill="#080204" stroke="url(#gold-rim)" stroke-width="0.8" />
        <path d="M -11,-30 Q 0,-33 9,-31 L 9,-29 Q 0,-31 -11,-29 Z" fill="#eab308" />

        <!-- Left Arm (Hand on Fedora Hat brim) -->
        <path d="M -12,-12 C -22,-16 -22,-26 -11,-29" fill="none" stroke="#0d0406" stroke-width="5" stroke-linecap="round" />
        <path d="M -13,-12 C -23,-16 -23,-26 -12,-29" fill="none" stroke="url(#gold-rim)" stroke-width="1.2" stroke-linecap="round" />

        <!-- Right Arm (Extended dynamically) -->
        <path d="M 8,-12 C 16,-12 25,-8 34,-3" fill="none" stroke="#0d0406" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 8,-12 C 16,-12 25,-8 34,-3" fill="none" stroke="url(#gold-rim)" stroke-width="1" stroke-linecap="round" opacity="0.8" />
        
        <!-- The Sparkling Glove -->
        <circle cx="36" cy="-2" r="3.5" fill="#ffffff" />
        <path d="M 36,-9 L 37,-4 L 42,-3 L 37,-2 L 36,3 L 35,-2 L 30,-3 L 35,-4 Z" fill="#ffffff" />
        
        <!-- Legs (Classic dance pose with heels lifted) -->
        <path d="M -12,30 L -18,70 L -18,108" fill="none" stroke="#0d0406" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M -12,30 L -18,70 L -18,108" fill="none" stroke="url(#gold-rim)" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />
        
        <path d="M 6,30 L 16,65 L -2,104" fill="none" stroke="#0d0406" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 6,30 L 16,65 L -2,104" fill="none" stroke="url(#gold-rim)" stroke-width="1" stroke-linecap="round" opacity="0.7" />

        <!-- White socks -->
        <rect x="-21" y="98" width="6" height="6" fill="#ffffff" />
        <rect x="-5" y="94" width="6" height="6" fill="#ffffff" transform="rotate(-15 -2 97)" />

        <!-- Shoes -->
        <path d="M -22,106 L -14,106 L -12,112 L -22,112 Z" fill="#080204" stroke="url(#gold-rim)" stroke-width="0.8" />
        <path d="M -4,102 L 2,106 L -2,112 L -6,108 Z" fill="#080204" stroke="url(#gold-rim)" stroke-width="0.8" />
      </g>

      <!-- Foreground Microphone Stand (Out of focus to create depth) -->
      <g opacity="0.35" transform="translate(45, 180) scale(0.8)">
        <line x1="0" y1="50" x2="0" y2="220" stroke="#070002" stroke-width="5" />
        <circle cx="0" cy="15" r="28" fill="none" stroke="#070002" stroke-width="3.5" />
        <rect x="-14" y="-5" width="28" height="40" rx="14" fill="#070002" stroke="#070002" stroke-width="2" />
      </g>

      <!-- Dark Vignette border -->
      <rect x="0" y="0" width="300" height="350" fill="none" stroke="#170307" stroke-width="6" opacity="0.6" />

      <!-- Bottom Branding / Title -->
      <rect x="0" y="350" width="300" height="100" fill="rgba(5,1,2,0.92)" />
      <line x1="30" y1="350" x2="270" y2="350" stroke="#d4af37" stroke-width="1" opacity="0.4" />
      <text x="150" y="392" font-family="'Inter', sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">MICHAEL</text>
      <text x="150" y="415" font-family="'Inter', sans-serif" font-size="9" font-weight="600" fill="#d4af37" text-anchor="middle" letter-spacing="3">PG-13 · BIOGRAPHY</text>
    </svg>
  `),
  'obsession': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <defs>
        <!-- Background Gradient -->
        <radialGradient id="bg-obs" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#4a050d" />
          <stop offset="45%" stop-color="#1c0104" />
          <stop offset="100%" stop-color="#070001" />
        </radialGradient>
        
        <!-- Red Light Beam Gradient -->
        <linearGradient id="beam-red" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#ff1f3b" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#cc0c24" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#070001" stop-opacity="0" />
        </linearGradient>

        <!-- Portal Light Gradient -->
        <radialGradient id="portal-light" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#ff3352" />
          <stop offset="100%" stop-color="#800010" />
        </radialGradient>
        
        <!-- Mist Gradients -->
        <radialGradient id="mist-left" cx="20%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#ff1f3b" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#070001" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="mist-right" cx="80%" cy="30%" r="60%">
          <stop offset="0%" stop-color="#4a050d" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#070001" stop-opacity="0" />
        </radialGradient>
      </defs>
      
      <!-- Base Background -->
      <rect width="100%" height="100%" fill="url(#bg-obs)" />
      
      <!-- Layered Mist / Atmosphere -->
      <rect width="100%" height="100%" fill="url(#mist-left)" />
      <rect width="100%" height="100%" fill="url(#mist-right)" />

      <!-- Depth: The Gothic Hallway / Corridor structure -->
      <!-- Outer Frame -->
      <path d="M 0,0 L 300,0 L 300,350 L 0,350 Z M 20,30 L 280,30 L 280,350 L 20,350 Z" fill="#070001" opacity="0.9" />
      
      <!-- Perspective Corridor Walls (layered polygons) -->
      <!-- Left Wall -->
      <polygon points="0,0 60,90 60,350 0,350" fill="#0c0103" stroke="#2a0307" stroke-width="1.5" />
      <polygon points="0,0 35,52 35,350 0,350" fill="#070001" />
      
      <!-- Right Wall -->
      <polygon points="300,0 240,90 240,350 300,350" fill="#0c0103" stroke="#2a0307" stroke-width="1.5" />
      <polygon points="300,0 265,52 265,350 300,350" fill="#070001" />
      
      <!-- Ceiling -->
      <polygon points="0,0 300,0 240,90 60,90" fill="#0d0104" stroke="#2a0307" stroke-width="1.2" />

      <!-- The Doorway at the End of the Hall (Simple rectangular open doorway silhouette) -->
      <g transform="translate(150, 210)">
        <!-- Light Beam coming out -->
        <polygon points="0,40 -120,140 120,140" fill="url(#beam-red)" />
        
        <!-- Rectangular Door Frame -->
        <rect x="-10" y="0" width="20" height="45" fill="url(#portal-light)" stroke="#ff3352" stroke-width="1" />
        
        <!-- Silhouette of the Watcher/Obsesser inside the doorway light -->
        <g transform="translate(0, 30) scale(0.65)">
          <circle cx="0" cy="0" r="4.5" fill="#070001" />
          <path d="M -5,5 L 5,5 L 8,23 L -8,23 Z" fill="#070001" />
        </g>
      </g>

      <!-- Foreground Floor Shadow details -->
      <!-- Long Shadow cast by the watcher in the corridor -->
      <polygon points="150,270 145,270 110,350 170,350" fill="#050001" opacity="0.95" />

      <!-- Vignette at the very front -->
      <path d="M 0,0 Q 80,40 150,15 Q 220,40 300,0 M 0,0 Q 40,80 15,150" fill="none" stroke="#1c0104" stroke-width="2" opacity="0.6" />
      <path d="M 300,0 Q 260,80 285,150" fill="none" stroke="#1c0104" stroke-width="2" opacity="0.6" />

      <!-- Bottom Branding / Title -->
      <rect x="0" y="350" width="300" height="100" fill="rgba(7,0,1,0.92)" />
      <line x1="30" y1="350" x2="270" y2="350" stroke="#450a0a" stroke-width="1" opacity="0.6" />
      <text x="150" y="392" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="300" fill="#fafafa" text-anchor="middle" letter-spacing="8">OBSESSION</text>
      <text x="150" y="415" font-family="'Courier New', Courier, monospace" font-size="8" font-weight="400" fill="#8e92a6" text-anchor="middle" letter-spacing="2">R RATING · PSYCHOLOGICAL THRILLER</text>
    </svg>
  `),
  'the odyssey': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <defs>
        <radialGradient id="bg-ody" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#0d2847" />
          <stop offset="55%" stop-color="#041224" />
          <stop offset="100%" stop-color="#01060d" />
        </radialGradient>
        <radialGradient id="moon-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#fff5cc" />
          <stop offset="70%" stop-color="#ffdf7a" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="moonlight-beam" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.22" />
          <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#01060d" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="sea-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0369a1" stop-opacity="0.7" />
          <stop offset="40%" stop-color="#075985" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#021329" stop-opacity="1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-ody)" />

      <!-- Celestial Stars -->
      <circle cx="30" cy="50" r="0.8" fill="#fff" opacity="0.7" />
      <circle cx="75" cy="35" r="1.2" fill="#fff" opacity="0.9" />
      <circle cx="120" cy="70" r="0.8" fill="#fff" opacity="0.6" />
      <circle cx="230" cy="40" r="1" fill="#fff" opacity="0.8" />
      <circle cx="270" cy="65" r="1.4" fill="#fff" opacity="0.85" />
      <circle cx="280" cy="120" r="0.7" fill="#fff" opacity="0.5" />
      <circle cx="25" cy="140" r="1.1" fill="#fff" opacity="0.6" />

      <!-- Massive Mythic Moon & Glow Halo -->
      <circle cx="150" cy="110" r="80" fill="#38bdf8" opacity="0.1" />
      <circle cx="150" cy="110" r="55" fill="#38bdf8" opacity="0.18" />
      <circle cx="150" cy="110" r="42" fill="url(#moon-core)" />
      <!-- Subtle Moon Craters / Texture -->
      <ellipse cx="140" cy="98" rx="8" ry="6" fill="#e0cb88" opacity="0.35" />
      <ellipse cx="162" cy="115" rx="10" ry="7" fill="#e0cb88" opacity="0.25" />
      <circle cx="145" cy="122" r="5" fill="#e0cb88" opacity="0.2" />

      <!-- Volumetric Moonlight Beam -->
      <polygon points="150,110 30,350 270,350" fill="url(#moonlight-beam)" />

      <!-- Atmospheric Mist & Cloud Layers -->
      <path d="M-20,130 Q50,105 130,125 T280,115 T320,135 L320,180 L-20,180 Z" fill="#071d36" opacity="0.5" />
      <path d="M-20,85 Q80,100 170,80 T320,95 L320,140 L-20,140 Z" fill="#041224" opacity="0.45" />

      <!-- Distant Ithaca / Mythic Cliff Silhouettes -->
      <polygon points="-10,245 25,205 60,230 95,210 130,245" fill="#041224" opacity="0.85" />
      <polygon points="175,245 210,212 245,225 285,200 310,245" fill="#041224" opacity="0.85" />

      <!-- Churning Ocean & Wave Layers -->
      <path d="M-10,225 Q45,215 100,225 T210,220 T310,225 L310,350 L-10,350 Z" fill="url(#sea-grad)" />
      <path d="M-10,240 Q60,230 130,242 T260,235 T310,240 L310,350 L-10,350 Z" fill="#031f3b" opacity="0.85" />
      
      <!-- Wave Crest Highlights -->
      <path d="M20,222 Q60,216 100,224" fill="none" stroke="#bae6fd" stroke-width="1.2" opacity="0.6" />
      <path d="M140,220 Q180,214 220,221" fill="none" stroke="#ffe899" stroke-width="1.5" opacity="0.7" />
      <path d="M70,238 Q120,232 170,240" fill="none" stroke="#bae6fd" stroke-width="1" opacity="0.5" />

      <!-- Heroic Greek Trireme Ship Silhouette -->
      <g transform="translate(150, 232)">
        <!-- Water splash behind hull -->
        <path d="M-40,8 Q0,0 40,8" stroke="#bae6fd" stroke-width="1.5" fill="none" opacity="0.5" />
        <!-- Ship Hull -->
        <path d="M-35,2 L35,2 L48,-12 Q25,12 0,12 Q-25,12 -42,-3 Z" fill="#090503" />
        <path d="M48,-12 L56,-16 L44,-4 Z" fill="#d4af37" />
        <path d="M-42,-3 Q-48,-14 -44,-22 L-38,-18 Q-42,-10 -35,2 Z" fill="#d4af37" />
        <!-- Oars extended in water -->
        <line x1="-25" y1="4" x2="-32" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <line x1="-15" y1="4" x2="-22" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <line x1="-5" y1="4" x2="-12" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <line x1="5" y1="4" x2="-2" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <line x1="15" y1="4" x2="8" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <line x1="25" y1="4" x2="18" y2="15" stroke="#b45309" stroke-width="1.2" opacity="0.9" />
        <!-- Mast -->
        <line x1="2" y1="2" x2="2" y2="-52" stroke="#090503" stroke-width="2.5" />
        <line x1="-22" y1="-44" x2="26" y2="-44" stroke="#090503" stroke-width="1.8" />
        <!-- Billowing Sail catching moonlight -->
        <path d="M-20,-42 Q2,-54 24,-42 Q30,-18 2,-18 Q-24,-18 -20,-42 Z" fill="#f8fafc" opacity="0.9" />
        <path d="M-20,-42 Q2,-54 24,-42" stroke="#ffe899" stroke-width="1.5" fill="none" />
        <!-- Hero Silhouette at Helm -->
        <circle cx="-30" cy="-7" r="2.5" fill="#090503" />
        <path d="M-32,-4 L-28,-4 L-26,2 L-34,2 Z" fill="#090503" />
        <line x1="-27" y1="-3" x2="-22" y2="-9" stroke="#d4af37" stroke-width="1" />
      </g>

      <!-- Bottom Branding / Title -->
      <rect x="0" y="350" width="300" height="100" fill="rgba(1,6,13,0.88)" />
      <line x1="30" y1="350" x2="270" y2="350" stroke="#475569" stroke-width="1" opacity="0.5" />
      <text x="150" y="392" font-family="'Times New Roman', Georgia, serif" font-size="22" font-weight="400" fill="#f1f5f9" text-anchor="middle" letter-spacing="6">THE ODYSSEY</text>
      <text x="150" y="415" font-family="'Times New Roman', Georgia, serif" font-size="9" font-weight="400" fill="#94a3b8" text-anchor="middle" letter-spacing="4">PG-13 · EPIC MYTHOLOGY</text>
    </svg>
  `),
  'spider-man: brand new day': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
      <defs>
        <radialGradient id="bg-sp" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#b21818" />
          <stop offset="60%" stop-color="#0f1938" />
          <stop offset="100%" stop-color="#050814" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-sp)" />

      <!-- Web overlay -->
      <g stroke="rgba(255,255,255,0.18)" stroke-width="1" fill="none">
        <circle cx="150" cy="130" r="30" />
        <circle cx="150" cy="130" r="60" />
        <circle cx="150" cy="130" r="90" />
        <circle cx="150" cy="130" r="125" />
        <circle cx="150" cy="130" r="170" />
        <line x1="150" y1="130" x2="0" y2="130" />
        <line x1="150" y1="130" x2="300" y2="130" />
        <line x1="150" y1="130" x2="150" y2="0" />
        <line x1="150" y1="130" x2="150" y2="450" />
        <line x1="150" y1="130" x2="0" y2="0" />
        <line x1="150" y1="130" x2="300" y2="0" />
        <line x1="150" y1="130" x2="0" y2="260" />
        <line x1="150" y1="130" x2="300" y2="260" />
      </g>

      <!-- Spider Logo Silhouette -->
      <g fill="#ffffff" opacity="0.9" transform="translate(150, 130) scale(0.85)">
        <!-- Body -->
        <ellipse cx="0" cy="0" rx="6" ry="12" />
        <circle cx="0" cy="-14" r="5" />
        <!-- Left Legs -->
        <path d="M-4,-4 Q-22,-20 -30,-4" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M-5,0 Q-28,-8 -34,14" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M-5,4 Q-28,10 -30,32" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M-4,8 Q-20,24 -16,42" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <!-- Right Legs -->
        <path d="M4,-4 Q22,-20 30,-4" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M5,0 Q28,-8 34,14" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M5,4 Q28,10 30,32" stroke="#ffffff" stroke-width="2.5" fill="none" />
        <path d="M4,8 Q20,24 16,42" stroke="#ffffff" stroke-width="2.5" fill="none" />
      </g>

      <!-- Bottom Branding / Title -->
      <rect x="0" y="350" width="300" height="100" fill="rgba(5,8,20,0.85)" />
      <line x1="30" y1="350" x2="270" y2="350" stroke="#d4af37" stroke-width="1" opacity="0.4" />
      <text x="150" y="382" font-family="'Inter', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">SPIDER-MAN</text>
      <text x="150" y="402" font-family="'Inter', sans-serif" font-size="11" font-weight="800" fill="#e50914" text-anchor="middle" letter-spacing="2">BRAND NEW DAY</text>
      <text x="150" y="420" font-family="'Inter', sans-serif" font-size="8" font-weight="600" fill="#d4af37" text-anchor="middle" letter-spacing="3">PG-13 · SUPERHERO ACTION</text>
    </svg>
  `),
};

// Custom vector graphics for backdrops (800 x 450)
const BACKDROPS: Record<string, string> = {
  'project hail mary': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <radialGradient id="bg-phmb" cx="50%" cy="35%" r="80%">
          <stop offset="0%" stop-color="#2a125a" />
          <stop offset="55%" stop-color="#0c0421" />
          <stop offset="100%" stop-color="#03010b" />
        </radialGradient>
        <radialGradient id="star-coreb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fff399" />
          <stop offset="55%" stop-color="#f97316" />
          <stop offset="80%" stop-color="#dc2626" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#03010b" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-phmb)" />

      <!-- Starfield -->
      <circle cx="100" cy="80" r="1.2" fill="#fff" opacity="0.8" />
      <circle cx="250" cy="150" r="1" fill="#fff" opacity="0.6" />
      <circle cx="700" cy="90" r="1.5" fill="#fff" opacity="0.9" />
      <circle cx="650" cy="300" r="1" fill="#fff" opacity="0.7" />
      <circle cx="150" cy="350" r="1.3" fill="#67e8f9" opacity="0.75" />

      <!-- Concentric Trajectory Rays -->
      <g stroke="rgba(56, 189, 248, 0.18)" stroke-width="1.2" fill="none" transform="translate(400, 180) rotate(-15)">
        <ellipse cx="0" cy="0" rx="100" ry="40" />
        <ellipse cx="0" cy="0" rx="200" ry="80" />
        <ellipse cx="0" cy="0" rx="320" ry="130" />
        <line x1="0" y1="0" x2="-400" y2="-200" />
        <line x1="0" y1="0" x2="400" y2="-200" />
        <line x1="0" y1="0" x2="-400" y2="250" />
        <line x1="0" y1="0" x2="400" y2="250" />
      </g>

      <!-- Astrophage Sun Core -->
      <circle cx="400" cy="180" r="140" fill="url(#star-coreb)" />

      <!-- Astrophage Swarm Stream -->
      <path d="M120,240 Q300,120 500,140 T700,220" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="5 5" opacity="0.85" />
      <path d="M140,235 Q310,130 490,150 T680,215" fill="none" stroke="#facc15" stroke-width="2.2" opacity="0.9" />

      <!-- Hail Mary Spacecraft Silhouette -->
      <g transform="translate(400, 180) scale(1.3) rotate(-22)">
        <polygon points="-30,-4 -12,0 -30,4" fill="#38bdf8" opacity="0.9" />
        <line x1="-12" y1="0" x2="-45" y2="0" stroke="#38bdf8" stroke-width="2.5" opacity="0.85" />
        <rect x="-12" y="-6" width="12" height="12" rx="2" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <line x1="0" y1="-18" x2="0" y2="18" stroke="#f8fafc" stroke-width="1.8" />
        <circle cx="0" cy="-18" r="4" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <circle cx="0" cy="18" r="4" fill="#090514" stroke="#f8fafc" stroke-width="1.2" />
        <path d="M0,-5 L28,-2 L36,0 L28,2 L0,5 Z" fill="#f8fafc" />
        <line x1="14" y1="-24" x2="14" y2="24" stroke="#38bdf8" stroke-width="1.5" />
      </g>
    </svg>
  `),
  'michael': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <radialGradient id="bg-mjb" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stop-color="#400b14" />
          <stop offset="45%" stop-color="#170307" />
          <stop offset="100%" stop-color="#050102" />
        </radialGradient>
        <radialGradient id="stage-glowb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.45" />
          <stop offset="50%" stop-color="#ca8a04" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#170307" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="gold-rimb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
        <linearGradient id="spot-goldb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.25" />
          <stop offset="50%" stop-color="#eab308" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#050102" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="spot-crimsonb" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.18" />
          <stop offset="60%" stop-color="#881337" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#050102" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-mjb)" />

      <!-- Concentric Sound/Light Waves -->
      <g stroke="rgba(234, 179, 8, 0.12)" stroke-width="1.2" fill="none">
        <circle cx="400" cy="180" r="70" />
        <circle cx="400" cy="180" r="150" />
        <circle cx="400" cy="180" r="240" />
        <circle cx="400" cy="180" r="340" />
      </g>

      <!-- Stage Spotlights -->
      <polygon points="400,-20 100,450 700,450" fill="url(#spot-goldb)" />
      <polygon points="600,-20 300,450 900,450" fill="url(#spot-crimsonb)" />
      <polygon points="200,-20 0,450 500,450" fill="url(#spot-goldb)" opacity="0.3" />

      <!-- Stage Floor Pool of Light -->
      <ellipse cx="400" cy="380" rx="180" ry="35" fill="url(#stage-glowb)" />

      <!-- Audience Flashlights -->
      <g fill="#ffffff" opacity="0.65">
        <circle cx="100" cy="150" r="1.2" fill="#fef08a" />
        <circle cx="700" cy="180" r="1.5" />
        <circle cx="200" cy="90" r="1" />
        <circle cx="600" cy="100" r="1.2" fill="#f43f5e" />
        <circle cx="80" cy="280" r="1.5" />
        <circle cx="720" cy="260" r="1" fill="#fef08a" />
      </g>

      <!-- Detailed Silhouette of the Performer -->
      <g transform="translate(400, 220) scale(1.65)">
        <!-- Torso & Jacket -->
        <path d="M -12,-15 C -15,-5 -18,15 -18,30 L 12,30 C 12,15 10,-5 8,-15 Z" fill="#0d0406" />
        <path d="M -12,-15 L -2,30 L -18,30 Z" fill="#060102" />
        
        <!-- White V-neck shirt peek -->
        <polygon points="-4,-15 4,-15 0,-2" fill="#ffffff" />
        
        <!-- Head -->
        <circle cx="-1" cy="-24" r="7" fill="#0d0406" />
        
        <!-- Fedora Hat -->
        <path d="M -16,-28 C -16,-34 -6,-37 6,-35 C 14,-34 18,-30 15,-26 C 9,-25 -3,-26 -16,-28 Z" fill="#080204" stroke="url(#gold-rimb)" stroke-width="0.8" />
        <path d="M -10,-29 C -8,-40 6,-38 10,-31 Z" fill="#080204" stroke="url(#gold-rimb)" stroke-width="0.8" />
        <path d="M -11,-30 Q 0,-33 9,-31 L 9,-29 Q 0,-31 -11,-29 Z" fill="#eab308" />

        <!-- Left Arm -->
        <path d="M -12,-12 C -22,-16 -22,-26 -11,-29" fill="none" stroke="#0d0406" stroke-width="5" stroke-linecap="round" />
        <path d="M -13,-12 C -23,-16 -23,-26 -12,-29" fill="none" stroke="url(#gold-rimb)" stroke-width="1.2" stroke-linecap="round" />

        <!-- Right Arm -->
        <path d="M 8,-12 C 16,-12 25,-8 34,-3" fill="none" stroke="#0d0406" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 8,-12 C 16,-12 25,-8 34,-3" fill="none" stroke="url(#gold-rimb)" stroke-width="1" stroke-linecap="round" opacity="0.8" />
        
        <!-- Glove -->
        <circle cx="36" cy="-2" r="3.5" fill="#ffffff" />
        <path d="M 36,-9 L 37,-4 L 42,-3 L 37,-2 L 36,3 L 35,-2 L 30,-3 L 35,-4 Z" fill="#ffffff" />
        
        <!-- Legs -->
        <path d="M -12,30 L -18,70 L -18,108" fill="none" stroke="#0d0406" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M -12,30 L -18,70 L -18,108" fill="none" stroke="url(#gold-rimb)" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />
        
        <path d="M 6,30 L 16,65 L -2,104" fill="none" stroke="#0d0406" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 6,30 L 16,65 L -2,104" fill="none" stroke="url(#gold-rimb)" stroke-width="1" stroke-linecap="round" opacity="0.7" />

        <!-- Socks -->
        <rect x="-21" y="98" width="6" height="6" fill="#ffffff" />
        <rect x="-5" y="94" width="6" height="6" fill="#ffffff" transform="rotate(-15 -2 97)" />

        <!-- Shoes -->
        <path d="M -22,106 L -14,106 L -12,112 L -22,112 Z" fill="#080204" stroke="url(#gold-rimb)" stroke-width="0.8" />
        <path d="M -4,102 L 2,106 L -2,112 L -6,108 Z" fill="#080204" stroke="url(#gold-rimb)" stroke-width="0.8" />
      </g>

      <!-- Foreground Microphone Stand -->
      <g opacity="0.3" transform="translate(150, 200) scale(1.1)">
        <line x1="0" y1="50" x2="0" y2="250" stroke="#070002" stroke-width="6" />
        <circle cx="0" cy="15" r="32" fill="none" stroke="#070002" stroke-width="4" />
        <rect x="-16" y="-8" width="32" height="46" rx="16" fill="#070002" stroke="#070002" stroke-width="2.5" />
      </g>
    </svg>
  `),
  'obsession': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <!-- Very dark background: deep red/burgundy transitioning to pure black -->
        <radialGradient id="bg-obs-min" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#1d0408" />
          <stop offset="60%" stop-color="#080002" />
          <stop offset="100%" stop-color="#020000" />
        </radialGradient>
        
        <!-- Soft crimson atmospheric glow -->
        <radialGradient id="crimson-glow" cx="60%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#b91c1c" stop-opacity="0.22" />
          <stop offset="60%" stop-color="#7f1d1d" stop-opacity="0.07" />
          <stop offset="100%" stop-color="#020000" stop-opacity="0" />
        </radialGradient>
        
        <!-- Doorway light gradient -->
        <linearGradient id="door-light-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="20%" stop-color="#ef4444" stop-opacity="0.65" />
          <stop offset="60%" stop-color="#991b1b" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#020000" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- Base Background -->
      <rect width="100%" height="100%" fill="url(#bg-obs-min)" />
      
      <!-- Subtle Atmospheric Crimson Fog -->
      <rect width="100%" height="100%" fill="url(#crimson-glow)" />
      
      <!-- The Dominant Cinematic Element: A solitary narrow doorway far in the distance -->
      <!-- Positioned on the right side (around x=520) to ensure high readability of text on the left -->
      <g transform="translate(520, 120)">
        <!-- Door Frame outline -->
        <rect x="-2" y="-2" width="44" height="154" fill="none" stroke="#3b070c" stroke-width="2.5" opacity="0.6" />
        
        <!-- Soft volumetric light beam spilling from the door -->
        <polygon points="12,150 18,150 160,300 -60,300" fill="url(#door-light-grad)" opacity="0.85" />
        
        <!-- The bright sliver of light from the slightly open door -->
        <polygon points="10,0 20,0 20,150 10,150" fill="#ff8080" opacity="0.25" />
        <polygon points="12,0 16,0 18,150 14,150" fill="#ffffff" opacity="0.95" />
        
        <!-- The dark door silhouette ajar -->
        <polygon points="-5,0 12,0 14,150 -5,150" fill="#050001" />
        
        <!-- Tiny silhouette figure standing in the doorway path -->
        <g transform="translate(15, 105) scale(0.65)" opacity="0.95">
          <circle cx="0" cy="0" r="4.5" fill="#000000" />
          <path d="M -5,5 Q 0,4 5,5 L 7,65 L -7,65 Z" fill="#000000" />
        </g>
        
        <!-- Long shadow cast by the figure -->
        <polygon points="12,150 18,150 70,300 20,300" fill="#000000" opacity="0.9" />
      </g>
      
      <!-- Moody foreground vignette -->
      <rect width="100%" height="100%" fill="none" stroke="#000000" stroke-width="8" opacity="0.7" />
    </svg>
  `),
  'the odyssey': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <radialGradient id="bg-odyb" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stop-color="#0d2847" />
          <stop offset="55%" stop-color="#041224" />
          <stop offset="100%" stop-color="#01060d" />
        </radialGradient>
        <radialGradient id="moon-coreb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#fff5cc" />
          <stop offset="70%" stop-color="#ffdf7a" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sea-gradb" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0369a1" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#01060d" stop-opacity="1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-odyb)" />

      <!-- Massive Moon -->
      <circle cx="400" cy="140" r="85" fill="url(#moon-coreb)" />

      <!-- Sea & Waves -->
      <path d="M0,260 Q200,240 400,260 T800,260 L800,450 L0,450 Z" fill="url(#sea-gradb)" />
      
      <!-- Ship Silhouette -->
      <g transform="translate(400, 240) scale(1.4)">
        <path d="M-35,2 L35,2 L48,-12 Q25,12 0,12 Q-25,12 -42,-3 Z" fill="#090503" />
        <line x1="2" y1="2" x2="2" y2="-52" stroke="#090503" stroke-width="2.5" />
        <path d="M-20,-42 Q2,-54 24,-42 Q30,-18 2,-18 Q-24,-18 -20,-42 Z" fill="#f8fafc" opacity="0.9" />
      </g>
    </svg>
  `),
  'spider-man: brand new day': getSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <radialGradient id="bg-spb" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#b21818" />
          <stop offset="60%" stop-color="#0f1938" />
          <stop offset="100%" stop-color="#050814" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-spb)" />

      <!-- Web overlay -->
      <g stroke="rgba(255,255,255,0.12)" stroke-width="1.2" fill="none">
        <circle cx="400" cy="180" r="50" />
        <circle cx="400" cy="180" r="100" />
        <circle cx="400" cy="180" r="160" />
        <circle cx="400" cy="180" r="230" />
        <line x1="400" y1="180" x2="0" y2="180" />
        <line x1="400" y1="180" x2="800" y2="180" />
        <line x1="400" y1="180" x2="400" y2="0" />
        <line x1="400" y1="180" x2="400" y2="450" />
        <line x1="400" y1="180" x2="0" y2="0" />
        <line x1="400" y1="180" x2="800" y2="0" />
        <line x1="400" y1="180" x2="0" y2="360" />
        <line x1="400" y1="180" x2="800" y2="360" />
      </g>

      <!-- Spider Logo Silhouette -->
      <g fill="#ffffff" opacity="0.85" transform="translate(400, 180) scale(1.3)">
        <ellipse cx="0" cy="0" rx="6" ry="12" />
        <circle cx="0" cy="-14" r="5" />
        <path d="M-4,-4 Q-22,-20 -30,-4" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M-5,0 Q-28,-8 -34,14" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M-5,4 Q-28,10 -30,32" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M-4,8 Q-20,24 -16,42" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M4,-4 Q22,-20 30,-4" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M5,0 Q28,-8 34,14" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M5,4 Q28,10 30,32" stroke="#ffffff" stroke-width="2" fill="none" />
        <path d="M4,8 Q20,24 16,42" stroke="#ffffff" stroke-width="2" fill="none" />
      </g>
    </svg>
  `),
};

export function getFallbackPoster(title: string): string | null {
  const key = title.toLowerCase().trim();
  return POSTERS[key] || null;
}

export function getFallbackBackdrop(title: string): string | null {
  const key = title.toLowerCase().trim();
  return BACKDROPS[key] || null;
}
