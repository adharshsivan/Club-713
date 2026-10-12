import * as THREE from 'three';

// deterministic rng so textures are identical every load
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function makeTex(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

// ------------------------------------------------------------------ walnut grain
function walnutTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const r = rng(11);
  g.fillStyle = '#5a3823';
  g.fillRect(0, 0, 512, 512);
  // broad tonal drift
  for (let i = 0; i < 14; i++) {
    const y = r() * 512;
    const grad = g.createLinearGradient(0, y - 40, 0, y + 40);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, r() < 0.5 ? 'rgba(20,8,2,0.22)' : 'rgba(150,90,45,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, y - 40, 512, 80);
  }
  // fine flowing grain
  for (let i = 0; i < 320; i++) {
    const y = r() * 512;
    const a = 0.05 + r() * 0.17;
    g.strokeStyle = r() < 0.62 ? `rgba(26,12,5,${a})` : `rgba(180,120,70,${a * 0.75})`;
    g.lineWidth = 0.5 + r() * 2.2;
    const amp = 2 + r() * 8;
    const fr = 0.004 + r() * 0.012;
    const ph = r() * 6.28;
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const yy = y + Math.sin(x * fr + ph) * amp;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  return makeTex(c, true);
}

// ------------------------------------------------------------------ nero marquina marble
function marbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const r = rng(29);
  g.fillStyle = '#0b0b0e';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) {
    const x = r() * 512, y = r() * 512, rad = 40 + r() * 110;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(70,68,74,${0.05 + r() * 0.1})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let v = 0; v < 11; v++) {
    let x = r() * 512, y = r() * 512, ang = r() * 6.28;
    const main = v < 4;
    g.strokeStyle = `rgba(238,230,216,${main ? 0.5 + r() * 0.35 : 0.18 + r() * 0.3})`;
    g.lineWidth = main ? 1 + r() * 2.2 : 0.4 + r() * 1.0;
    g.shadowColor = 'rgba(255,240,220,0.45)';
    g.shadowBlur = main ? 3 : 1;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 70; s++) {
      ang += (r() - 0.5) * 0.85;
      x += Math.cos(ang) * 13;
      y += Math.sin(ang) * 13;
      g.lineTo(x, y);
      if (main && r() < 0.06) {
        // branch
        const bx = x, by = y;
        let ba = ang + (r() - 0.5) * 1.8;
        let tx = bx, ty = by;
        for (let k = 0; k < 8; k++) {
          ba += (r() - 0.5) * 0.9;
          tx += Math.cos(ba) * 10;
          ty += Math.sin(ba) * 10;
          g.moveTo(tx - Math.cos(ba) * 10, ty - Math.sin(ba) * 10);
          g.lineTo(tx, ty);
        }
        g.moveTo(x, y);
      }
    }
    g.stroke();
  }
  g.shadowBlur = 0;
  return makeTex(c);
}

export const woodTex = walnutTexture();
export const marbleTex = marbleTexture();

// ------------------------------------------------------------------ upholstery
function velvet(color: string, sheen: string, rough = 0.9) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: rough,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(sheen),
    side: THREE.DoubleSide,
  });
}

export const FAB = {
  plum: velvet('#4e2447', '#d98bc4'),
  rust: velvet('#8b4a26', '#ffb27a'),
  ink: velvet('#1f2a47', '#8aa4ff'),
  emerald: velvet('#14423a', '#5de0b4'),
  champagne: velvet('#bfa27c', '#fff1d6', 0.82),
};

export const LEATHER = {
  cognac: new THREE.MeshPhysicalMaterial({
    color: '#7a3f1e', roughness: 0.42, metalness: 0,
    clearcoat: 0.45, clearcoatRoughness: 0.38, side: THREE.DoubleSide,
  }),
  ink: new THREE.MeshPhysicalMaterial({
    color: '#16161d', roughness: 0.4, metalness: 0,
    clearcoat: 0.5, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
  }),
};

// ------------------------------------------------------------------ hard surfaces
export const MARBLE = new THREE.MeshPhysicalMaterial({
  map: marbleTex, color: '#ffffff', roughness: 0.14, metalness: 0.04,
  clearcoat: 1, clearcoatRoughness: 0.07,
});

export const WALNUT = new THREE.MeshStandardMaterial({
  map: woodTex, color: '#ffffff', roughness: 0.46, metalness: 0.05,
});

export const BRASS_SOFT = new THREE.MeshStandardMaterial({
  color: '#b88a4e', roughness: 0.28, metalness: 1,
});

export const RUG = new THREE.MeshStandardMaterial({ color: '#1d1b25', roughness: 1, metalness: 0 });

// ------------------------------------------------------------------ glass & drinks
export const GLASS = new THREE.MeshPhysicalMaterial({
  color: '#d7ecff', roughness: 0.03, metalness: 0,
  transparent: true, opacity: 0.3, clearcoat: 1,
  depthWrite: false,
});

export const SPIRIT = new THREE.MeshPhysicalMaterial({
  color: '#8a4a16', roughness: 0.08, metalness: 0,
  emissive: new THREE.Color('#ff9440'), emissiveIntensity: 0.55,
  clearcoat: 1, clearcoatRoughness: 0.05,
});

export const LAMP_GLOW = new THREE.MeshStandardMaterial({
  color: '#2a1a0a', emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 2.8,
  roughness: 0.6,
});

export const BOTTLE = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', roughness: 0.08, metalness: 0,
  clearcoat: 1, clearcoatRoughness: 0.05,
  emissive: new THREE.Color('#30200f'), emissiveIntensity: 1,
});

// ------------------------------------------------------------------ decor: planters, sconces
/** dark glossy ceramic pot for interior planters */
export const CERAMIC = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.28, metalness: 0.2 });

/** foliage lit subtly from within — gives potted plants a little life without extra lights */
export const FOLIAGE = (() => {
  const m = new THREE.MeshStandardMaterial({
    color: '#16301f', roughness: 0.85, metalness: 0, vertexColors: true,
  });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * 0.22;',
    );
  };
  m.customProgramCacheKey = () => 'acid-foliage';
  return m;
})();

export const SCONCE_GLASS = new THREE.MeshPhysicalMaterial({
  color: '#fff3e2', roughness: 0.1, metalness: 0,
  transparent: true, opacity: 0.4, clearcoat: 1,
});
