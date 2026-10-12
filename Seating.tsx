import * as THREE from 'three';
import { Pendant } from './Pendant';
import {
  Sofa, ArcBanquette, CoffeeTable, PedestalTable, Pouf, TableTop, Planter,
} from './furn/Furniture';
import { FAB } from './furn/fabrics';
import { useLightTheme, type LightTheme } from './lightTheme';

const BOOTH_FAB = [FAB.plum, FAB.emerald, FAB.rust];
const BOOTH_PILLOW = [FAB.champagne, FAB.rust, FAB.champagne];

// ------------------------------------------------------------------ east-wall booth
function Booth({ z, idx, accent }: { z: number; idx: number; accent: string }) {
  return (
    <group position={[0, 0, z]}>
      {/* channel-tufted banquette hugging the wall + two backless wing benches */}
      <Sofa
        L={2.9} D={0.82} arms="none" pillows={3}
        fabric={BOOTH_FAB[idx]} accent={BOOTH_PILLOW[idx]}
        position={[16.79, 0, 0]} rotationY={-Math.PI / 2}
      />
      <Sofa
        L={1.3} D={0.62} arms="none" back={false} pool={false}
        fabric={BOOTH_FAB[idx]} position={[15.78, 0, -1.12]}
      />
      <Sofa
        L={1.3} D={0.62} arms="none" back={false} pool={false}
        fabric={BOOTH_FAB[idx]} position={[15.78, 0, 1.12]} rotationY={Math.PI}
      />

      {/* walnut pedestal table, styled */}
      <PedestalTable R={0.46} h={0.6} top="wood" position={[15.7, 0, 0]} />
      <TableTop position={[15.7, 0.6, 0]} scale={0.9} rotationY={idx * 0.8} />

      <Pendant variant="smoked" color={accent} position={[15.7, 8.98, 0]} bottom={2.3} scale={0.9} />
    </group>
  );
}

// ------------------------------------------------------------------ curved sofa island
function SofaIsland({
  x, fab, pill, color,
}: { x: number; fab: THREE.Material; pill: THREE.Material; color: string }) {
  const yaw = Math.atan2(-x, -0.2); // open side faces the dance floor
  return (
    <group position={[x, 0, -0.8]} rotation={[0, yaw, 0]}>
      <ArcBanquette ri={1.05} ro={1.7} span={Math.PI * 1.15} pillows={5} fabric={fab} accent={pill} />
      <CoffeeTable R={0.5} h={0.42} position={[0, 0, 0.1]} />
      <TableTop position={[0, 0.42, 0.1]} scale={0.85} />
      <Pouf position={[0.54, 0, 0.9]} fabric={pill} />
      <Pouf position={[-0.54, 0, 0.9]} fabric={pill} />
      <Pendant variant="ring" color={color} position={[0, 8.98, 0.1]} bottom={2.5} />
    </group>
  );
}

// ------------------------------------------------------------------ wraparound pod under the mezzanine
function LoungePod({
  x, fab, pill, color,
}: { x: number; fab: THREE.Material; pill: THREE.Material; color: string }) {
  return (
    <group position={[x, 0, 10.7]} rotation={[0, Math.PI, 0]}>
      <ArcBanquette ri={0.92} ro={1.5} span={Math.PI * 1.55} pillows={6} fabric={fab} accent={pill} />
      <CoffeeTable R={0.4} h={0.46} />
      <TableTop position={[0, 0.46, 0]} scale={0.75} />
      <Pendant variant="smoked" color={color} position={[0, 2.95, 0]} bottom={1.95} />
    </group>
  );
}

const boothAccents = (t: LightTheme) => [t.haloA, t.pulseA, t.floorC];

export function Seating() {
  const theme = useLightTheme();
  const accents = boothAccents(theme);
  return (
    <group>
      {/* pulled clear of the east stair run (stairs occupy z 2.8 → 8.0) */}
      <Booth z={-8.5} idx={0} accent={accents[0]} />
      <Booth z={-5.0} idx={1} accent={accents[1]} />
      <Booth z={-1.5} idx={2} accent={accents[2]} />

      <SofaIsland x={8.5} fab={FAB.rust} pill={FAB.champagne} color={theme.haloA} />
      <SofaIsland x={-8.5} fab={FAB.plum} pill={FAB.champagne} color={theme.haloA} />

      <LoungePod x={11.5} fab={FAB.emerald} pill={FAB.champagne} color={theme.pulseA} />

      {/* small planters softening the corners near the booths */}
      <Planter position={[16.9, 0, -7.0]} seed={3} scale={0.85} />
      <Planter position={[16.9, 0, -9.0]} seed={9} scale={0.85} />
    </group>
  );
}
