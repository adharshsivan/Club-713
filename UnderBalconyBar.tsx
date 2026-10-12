import { useLightTheme } from './lightTheme';
import { BarUnit } from './Bar';
import { Planter, FloorLamp } from './furn/Furniture';

/**
 * The bar tucked under the mezzanine, with a clear entrance-side approach.
 * The back bar sits against the south wall; guests stand/sit on the
 * dance-floor side. Collision for it lives in collision.ts ("under-balcony bar").
 */
export function UnderBalconyBar() {
  const theme = useLightTheme();
  return (
    <group>
      <BarUnit
        length={11}
        accent={theme.pulseA}
        position={[0, 0, 12.68]}
        rotationY={Math.PI}
        variant="low"
        pendant="smoked"
        pendantColor={theme.haloA}
      />

      {/* end-caps: floor lamps and planters between the bar and the lounge pods */}
      <FloorLamp position={[-7.3, 0, 12.3]} color={theme.warm} />
      <FloorLamp position={[7.3, 0, 12.3]} color={theme.warm} />
      <Planter position={[-8.3, 0, 12.3]} seed={21} scale={1.1} />
      <Planter position={[8.3, 0, 12.3]} seed={47} scale={1.1} />
    </group>
  );
}
