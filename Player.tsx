import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { groundHeight, resolveMove, SPAWN } from './collision';
import { input, consumeLook, pushLook, isTouchDevice } from './input';
import { setMuffle } from './clock';
import { FX, VEST } from './exterior/layout';

const WALK = 3.6;
const SPRINT = 6.4;
const EYE = 1.62;

export function Player({ active }: { active: boolean }) {
  const { camera, gl } = useThree();
  const pos = useRef({ x: SPAWN.x, z: SPAWN.z });
  const footY = useRef(0);
  const vy = useRef(0);
  const yaw = useRef(SPAWN.yaw);
  const pitch = useRef(0);
  const vel = useRef({ x: 0, z: 0 });
  const bobT = useRef(0);
  const lastMuffle = useRef(-1);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      input.keys.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = true;
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      input.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // pointer lock + mouse look (desktop)
  useEffect(() => {
    if (!active || isTouchDevice()) return;
    const el = gl.domElement;
    const click = () => { if (document.pointerLockElement !== el) el.requestPointerLock(); };
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement === el) pushLook(e.movementX, e.movementY);
    };
    el.addEventListener('click', click);
    window.addEventListener('mousemove', move);
    return () => {
      el.removeEventListener('click', click);
      window.removeEventListener('mousemove', move);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [active, gl]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    if (!active) {
      // cinematic arc across the plaza, framing the façade + halo
      const a = -0.2 + Math.sin(t * 0.07) * 0.55;
      const R = 27;
      camera.position.set(FX - Math.cos(a) * R, 3.4 + Math.sin(t * 0.2) * 0.5, 1.5 + Math.sin(a) * R);
      camera.lookAt(FX, 5.4, 0.5);
      return;
    }

    // ---- teleport (HUD shortcuts)
    if (input.teleport) {
      const tp = input.teleport;
      input.teleport = null;
      pos.current.x = tp.x;
      pos.current.z = tp.z;
      footY.current = tp.y;
      yaw.current = tp.yaw;
      pitch.current = 0;
      vel.current.x = vel.current.z = 0;
      vy.current = 0;
    }

    // ---- look
    const [ldx, ldy] = consumeLook();
    yaw.current -= ldx * 0.0023;
    pitch.current = Math.max(-1.25, Math.min(1.25, pitch.current - ldy * 0.0023));

    // ---- move intent
    let fx = 0, fz = 0;
    const k = input.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    fx += input.joy.x;
    fz -= input.joy.y;
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }

    const speed = input.sprint ? SPRINT : WALK;
    const sin = Math.sin(yaw.current), cos = Math.cos(yaw.current);
    const tx = (fx * cos - fz * sin) * speed;
    const tz = (-fx * sin - fz * cos) * speed;
    const s = 1 - Math.exp(-dt * 11);
    vel.current.x += (tx - vel.current.x) * s;
    vel.current.z += (tz - vel.current.z) * s;

    const [nx, nz] = resolveMove(pos.current.x, pos.current.z, vel.current.x * dt, vel.current.z * dt, footY.current);
    pos.current.x = nx;
    pos.current.z = nz;

    // ---- vertical
    const g = groundHeight(nx, nz, footY.current);
    if (g > footY.current + 0.001) {
      footY.current += (g - footY.current) * Math.min(1, dt * 14);
      vy.current = 0;
    } else if (g < footY.current - 0.001) {
      vy.current -= 20 * dt;
      footY.current = Math.max(g, footY.current + vy.current * dt);
      if (footY.current === g) vy.current = 0;
    } else {
      vy.current = 0;
    }

    // ---- music heard through the façade outside, opening up as you pass the threshold
    const m = nx >= FX ? 0 : Math.min(1, (FX - nx) / (FX - VEST.x1 + 1.5));
    if (Math.abs(m - lastMuffle.current) > 0.02) {
      lastMuffle.current = m;
      setMuffle(m);
    }

    // ---- head bob
    const moving = Math.hypot(vel.current.x, vel.current.z);
    bobT.current += dt * (4 + moving * 1.3);
    const bob = Math.sin(bobT.current * 2) * 0.028 * Math.min(1, moving / WALK);

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;
    camera.position.set(pos.current.x, footY.current + EYE + bob, pos.current.z);
  });

  return null;
}
