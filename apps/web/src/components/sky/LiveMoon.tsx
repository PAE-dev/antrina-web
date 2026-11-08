import { useEffect, useMemo, useRef, useState } from 'react';
import { moonView } from '@antrina/sky';

/**
 * La Luna de ahora, como se ve desde el lugar del usuario: esfera 3D con el mapa de color de la
 * NASA (LRO), iluminada con la fase real y girada según la latitud (desde el sur se ve "al revés").
 * Mientras carga Three.js se muestra la foto de la Luna.
 */
export function LiveMoon({
  size,
  lat,
  lon,
  date,
  className = '',
}: {
  size: number;
  lat: number;
  lon: number;
  date?: Date;
  className?: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const when = useMemo(() => date ?? new Date(), [date]);
  const view = useMemo(() => moonView(when, lat, lon), [when, lat, lon]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};
    void import('three').then((THREE) => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 10);
      camera.position.set(0, 0, 5);

      const texture = new THREE.TextureLoader().load('/world/sky/moon_map_2k.jpg', () => {
        if (!disposed) {
          renderer.render(scene, camera);
          setReady(true);
        }
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(1, 96, 64),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
      );
      // Cara visible al frente y norte lunar según el cielo del observador.
      moon.rotation.y = -Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(moon);
      holder.rotation.z = view.northAngle;
      scene.add(holder);

      // Luz del Sol: viene del lado iluminado; con fase llena, de frente.
      const dx = -Math.sin(view.limbAngle);
      const dy = Math.cos(view.limbAngle);
      const s = Math.sin(view.phaseAngle);
      const sunLight = new THREE.DirectionalLight('#fff7ea', 3.2);
      sunLight.position.set(dx * s, dy * s, Math.cos(view.phaseAngle)).multiplyScalar(10);
      scene.add(sunLight);
      // Luz cenicienta (la Tierra ilumina un poco la parte oscura).
      scene.add(new THREE.AmbientLight('#9fb2d8', 0.32));

      renderer.render(scene, camera);
      cleanup = () => {
        texture.dispose();
        moon.geometry.dispose();
        moon.material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [size, view]);

  return (
    <div
      className={`${className.includes('absolute') ? '' : 'relative'} shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-[6%] rounded-full"
        style={{
          boxShadow: `0 0 ${size * 0.25}px ${size * 0.04}px rgba(243,236,223,${(0.08 + view.illumination * 0.22).toFixed(2)})`,
        }}
      />
      {!ready && (
        <img
          src="/world/sky/planets/moon.webp"
          alt=""
          className="absolute inset-0 h-full w-full opacity-60"
        />
      )}
      <div ref={mount} className="absolute inset-0" />
    </div>
  );
}
